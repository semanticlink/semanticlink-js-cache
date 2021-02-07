import { CollectionRepresentation, LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import anylogger from 'anylogger';
import Differencer from './differencer';
import RepresentationUtil from '../../utils/representationUtil';
import { StrategyType, SyncResultItem } from '../../interfaces/sync/types';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import { SyncInfo } from '../../interfaces/sync/syncInfo';
import ApiUtil from '../../apiUtil';
import { TrackedRepresentation } from '../../types/types';
import { DocumentRepresentation } from '../../interfaces/document';
import { noopResolver } from '../resourceMergeFactory';
import LinkRelation from '../../linkRelation';
import {
    CreateStrategy,
    DeleteStrategy,
    SyncResolverOptions,
    UpdateStrategy,
} from '../../interfaces/sync/syncResolverOptions';
import get from '../get';
import update from '../update';
import NamedRepresentationFactory from '../namedRepresentationFactory';
import { ResourceFetchOptions } from '../../interfaces/resourceFetchOptions';
import { HttpRequestOptions } from '../../interfaces/httpRequestOptions';

const log = anylogger('SyncLinkedRepresentation');

/**
 * Default resource finder assumes that resources are in a collection via the 'items' attribute/array.
 */
export const defaultFindResourceInCollectionStrategy = RepresentationUtil.findInCollection;

/**
 *
 * Iterate (sequentially move) through all the strategies. However, each strategy can make many calls itself based
 * on the change sets required (syncInfos). The calls can be processed either all at once (parallel using a map wait all
 * which is implemented as a Promise.all) or one at a time (sequentially, note there is no partial batching).
 *
 * The approach is set using {@link CacheOptions.strategyBatchSize} when non-zero (defined)
 *
 * When syncing a tree/graph, each path of resources is synchronised via a set of strategies. The syncInfo is the state action
 * (update, create, delete) on the resource and the strategy is how resources are traversed.
 *
 * @param strategies
 * @param  options
 * @param syncInfos
 * @private
 */
async function tailRecursionThroughStrategies(strategies: StrategyType[], syncInfos: SyncInfo[], options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<void> {
    const { strategyBatchSize = undefined } = { ...options };

    for (const strategy of strategies) {
        if (strategyBatchSize === 0 || !strategyBatchSize) {
            // invoke a parallel strategy when want to go for it
            await Promise.all(syncInfos.map(async syncInfo => {
                await strategy({
                    resource: syncInfo.resource,
                    document: syncInfo.document,
                    options,
                });
            }));

        } else {
            // invoke a sequential strategy - and for now, single at a time
            for (const syncInfo of syncInfos) {
                await strategy({
                    resource: syncInfo.resource,
                    document: syncInfo.document,
                    options,
                });
            }
        }
    }
}

/**
 * Recurse through all the strategies working through change sets.
 * @param strategies
 * @param  options
 * @return function returning the representation (@link LinkedRepresentation}
 * @private
 */
function syncInfos(strategies: StrategyType[], options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): (syncInfo: SyncInfo) => Promise<LinkedRepresentation> {
    return async syncInfo => {
        await tailRecursionThroughStrategies(strategies, [syncInfo], options);
        return syncInfo.resource;
    };
}

/**
 * Update or create a resource in a collection based on a document depending on whether it previously exists or not.
 *
 * note: updates do not check for differences
 * @param resource
 * @param document
 * @param options
 * @return contains a syncInfo
 * @private
 */
async function syncResourceInCollection<T extends LinkedRepresentation>(
    resource: CollectionRepresentation<T>,
    document: T,
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<SyncInfo | undefined> {

    const {
        findResourceInCollectionStrategy = defaultFindResourceInCollectionStrategy,
        forceCreate = false,
    } = { ...options };

    // locate the document in the collection items
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore not sure why this typing isn't working
    const item = findResourceInCollectionStrategy(resource, { where: document });

    // check whether to update or create
    if (item && !forceCreate) {
        // synchronise the item in the collection from the server
        const result = await ApiUtil.get(
            resource as TrackedRepresentation<CollectionRepresentation<T>>,
            { ...options, where: item }) as TrackedRepresentation<T>;
        if (result) {
            const resource = await ApiUtil.update(result, document as DocumentRepresentation<T>, options);
            if (resource) {
                return {
                    resource: resource,
                    document: document,
                    action: 'update',
                } as SyncInfo;
            }
        }
    } else {
        // add the document to the collection a
        const result = await ApiUtil.create(document, { ...options, on: resource });
        if (result) {
            const resource = await ApiUtil.get(result, options);
            if (resource) {
                return {
                    resource: resource,
                    document: document,
                    action: 'create',
                } as SyncInfo;
            }
        }
    }
}

/**
 *
 * @param collectionResource
 * @param collectionDocument
 * @param options
 * @returns {Promise}
 * @private
 */
async function synchroniseCollection<T extends LinkedRepresentation>(
    collectionResource: CollectionRepresentation<T>,
    collectionDocument: CollectionRepresentation<T>,
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<SyncResultItem> {

    const {
        resolver = noopResolver,
        readonly,
        contributeonly,
    } = { ...options };

    /**
     * Delete a resource from the local state cache
     */
    const deleteResourceAndUpdateResolver: DeleteStrategy = async <T extends LinkedRepresentation>(deleteResource: T) => {
        const result = await ApiUtil.delete(deleteResource as TrackedRepresentation<T>, {
            ...options,
            on: collectionResource
        });
        if (result) {
            const uri = LinkUtil.getUri(deleteResource, LinkRelation.Self);
            if (uri) {
                resolver.remove(uri);
            }
        }
    };

    /**
     * Update a resource and remember the URI mapping so that if a reference to the
     * network of data resource is required we can resolve a document reference to
     * real resource in our network.
     */
    const updateResourceAndUpdateResolver: UpdateStrategy = async <T extends LinkedRepresentation>(updateResource: T, updateDataDocument: T) => {
        const result = await ApiUtil.get(updateResource as TrackedRepresentation<T>, options);
        if (result) {
            const update = await ApiUtil.update(result, updateDataDocument as DocumentRepresentation<T>, options);
            if (update) {
                const uri = LinkUtil.getUri(updateDataDocument, LinkRelation.Self);
                const uri1 = LinkUtil.getUri(updateResource, LinkRelation.Self);
                if (uri && uri1) {
                    resolver.update(uri, uri1);
                }
            }
        }
    };

    /**
     *
     * @param {*} createDataDocument
     * @return {?LinkedRepresentation} the new resource
     */
    const createResourceAndUpdateResolver: CreateStrategy = async <T extends LinkedRepresentation>(createDataDocument: T) => {

        const result = await ApiUtil.create(createDataDocument, { ...options, on: collectionResource });
        if (result) {
            const uri = LinkUtil.getUri(createDataDocument, LinkRelation.Self);
            const uri1 = LinkUtil.getUri(result, LinkRelation.Self);
            if (uri && uri1) {
                resolver.add(uri, uri1);
            }
        }
        // TODO: returning undefined changes the interface T | undefined on the CreateStrategy
        return result as unknown as T;
    };

    /**
     * A read-only collection needs have an item deleted. We don't delete it
     * but can add it to our mapping resolver anyway.
     *
     * We don't expect to come in here but we will if the document supplied
     * has less items that the current network of data (likely from time to time).
     */
    const deleteReadonlyResourceAndUpdateResolver: DeleteStrategy = async <T extends LinkedRepresentation>(collectionResourceItem: T) => {
        const uri = LinkUtil.getUri(collectionResourceItem, LinkRelation.Self);
        if (uri) {
            resolver.remove(uri);
        }
    };

    /**
     * Don't make request back to update, just remember the URI mapping so that if a reference to the
     * network of data resource is required we can resolve a document reference to the real resource in
     * our network.
     */
    const updateReadonlyResourceAndUpdateResolver: UpdateStrategy = async <T extends LinkedRepresentation>(collectionResourceItem: T, updateDataDocument: T) => {
        const uri = LinkUtil.getUri(updateDataDocument, LinkRelation.Self);
        const uri1 = LinkUtil.getUri(collectionResourceItem, LinkRelation.Self);
        if (uri && uri1) {
            resolver.update(uri, uri1);
        }
    };

    /**
     * A read-only collection is missing a URI. This is likely to cause problems because
     * the URI will not be resolvable, because no matching resource can be found.
     */
    const createReadonlyResourceAndUpdateResolver: CreateStrategy = async <T>() => {
        // TODO: update interface
        return undefined as unknown as T;
    };

    /**
     * A contribute-only collection needs have an item removed. We send a DELETE request
     * back to the server on the collection URI with a payload containing the URI of the
     * removed item
     */
    const removeContributeOnlyResourceAndUpdateResolver: DeleteStrategy = async <T extends LinkedRepresentation>(deleteResource: T) => {
        const result = await ApiUtil.delete(
            collectionResource as unknown as TrackedRepresentation<T>,
            { ...options, where: deleteResource });
        if (result) {
            const uri = LinkUtil.getUri(deleteResource, LinkRelation.Self);
            if (uri) {
                resolver.remove(uri);
            }
        }
    };

    /**
     * Don't make request back to update, just remember the URI mapping so that if a reference to the
     * network of data resource is required we can resolve a document reference to the real resource in
     * our network.
     */
    const updateContributeOnlyResourceAndUpdateResolver: UpdateStrategy = async <T extends LinkedRepresentation>(collectionResourceItem: T, updateDataDocument: T) => {
        // at this point, it is the same implementation as the read-only form
        return await updateReadonlyResourceAndUpdateResolver(collectionResourceItem, updateDataDocument);
    };

    /**
     * A contribute-only collection is missing a URI. This is likely to cause problems because
     * the URI will not be resolvable, because no matching resource can be found. It will then attempt to
     * add the item to the collection
     */
    const addContributeOnlyResourceAndUpdateResolver: CreateStrategy = async <T extends LinkedRepresentation>(createDataDocument: T) => {
        return await createResourceAndUpdateResolver(createDataDocument);
    };

    const makeOptions = (): SyncResolverOptions => {
        if (contributeonly) {
            log.debug(`[Sync] contribute-only collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
            return {
                createStrategy: addContributeOnlyResourceAndUpdateResolver,
                updateStrategy: updateContributeOnlyResourceAndUpdateResolver,
                deleteStrategy: removeContributeOnlyResourceAndUpdateResolver,
            };

            // If the caller has signalled that the collection is read-only, or the collection
            // if missing a 'create-form' representation then we assume that the NOD can
            // not be changed.
        } else if (readonly || !LinkUtil.matches(collectionResource, /create-form/)) {
            log.debug(`[Sync] read-only collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
            return {
                createStrategy: createReadonlyResourceAndUpdateResolver,
                updateStrategy: updateReadonlyResourceAndUpdateResolver,
                deleteStrategy: deleteReadonlyResourceAndUpdateResolver,
            };

        } else {
            log.debug(`[Sync] updatable collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
            return {
                createStrategy: createResourceAndUpdateResolver,
                updateStrategy: updateResourceAndUpdateResolver,
                deleteStrategy: deleteResourceAndUpdateResolver,
            };
        }
    };

    return await Differencer.difference(collectionResource, collectionDocument, { ...options, ...makeOptions() });
}

/*
 * ************************************
 *
 * Linked Representations as resources
 *
 * ************************************
 */

/**
 * Recurse through all the strategies passing through the resources.
 *
 * @param resource
 * @param  document
 * @param strategies
 * @param  options
 * @return callback function to be attached onto a Promise.then
 * @private
 */
async function syncResources<T extends LinkedRepresentation>(
    resource: T,
    document: T,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<() => Promise<void[]>> {

    return async () => await Promise.all(strategies.map(async (strategy) => strategy({ resource, document, options })));
}

/**
 * Retrieves a resource and synchronises (its attributes) from the document
 *
 * Note: this is used for syncing two documents through their parents see {@link getSingleton}
 *
 *
 * @example
 *
 *     Resource               Document
 *
 *                  sync
 *     +-----+                +-----+
 *     |     |  <-----------+ |     |
 *     |     |                |     |
 *     +-----+                +-----+
 *
 * @param {LinkedRepresentation} resource
 * @param {*} resourceDocument
 * @param strategies
 * @param options
 * @return {Promise} containing the resource {@link LinkedRepresentation}
 */
export async function getResource<T extends LinkedRepresentation>(
    resource: T | TrackedRepresentation<T>,
    resourceDocument: T,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<T> {
    log.debug('sync resource %s', LinkUtil.getUri(resource, LinkRelation.Self));
    const result = await ApiUtil.get(resource as TrackedRepresentation<T>, options);
    if (result) {
        const update = await ApiUtil.update(resource as TrackedRepresentation<T>, resourceDocument as DocumentRepresentation<T>, options);
        if (update) {
            await (await syncResources(resource, resourceDocument, strategies, options))();
        }
    }
    return resource;
}


/**
 * Retrieves a singleton resource on a parent resource and updates (its
 * attributes) based on a singleton of the same name in the given parent document.
 *
 * The parent maybe either a collection resource or a singleton resource
 *
 * Note: this is used for syncing two documents through their parents
 * (see {@link getResource} for non-parented)
 *
 * @example
 *
 *
 *     parent     singleton           singleton   parent
 *     Resource    Resource            Document   Document
 *
 *     +----------+                            +---------+
 *     |          |            sync            |         |
 *     |          +-----+                +-----+         |
 *     |     Named|     |  <-----------+ |     |Named    |
 *     |          |     |                |     |         |
 *     |          +-----+                +-----+         |
 *     |          |                            |         |
 *     |          |                       ^    |         |
 *     +----------+                       |    +---------+
 *                                        |
 *                                        +
 *                                        looks for
 *
 * @param parentResource
 * @param singletonName
 * @param rel
 * @param parentDocument
 * @param strategies
 * @param options
 * @return {Promise} containing the parent {@link LinkedRepresentation}
 */
export async function getSingleton<T extends LinkedRepresentation>(
    parentResource: T | TrackedRepresentation<T>,
    singletonName: string,
    rel: RelationshipType,
    parentDocument: T | DocumentRepresentation<T>,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions
): Promise<T> {
    log.debug('[Sync] resource (named singleton) \'%s\' on %s', singletonName, LinkUtil.getUri(parentResource, LinkRelation.Self));

    if (!parentDocument) {
        throw new Error('Parent document must exist');
    }

    const name = NamedRepresentationFactory.defaultNameStrategy(rel);

    const namedResource = await get(parentResource as TrackedRepresentation<T>, { ...options, rel: rel });
    if (namedResource) {
        const document = RepresentationUtil.getProperty(parentDocument, name) as DocumentRepresentation<T>;
        const updated = await update(namedResource, document, options);
        if (updated) {
            await (await syncResources(updated, document as T, strategies, options))();
        }
    } else {
        log.debug('[Sync] No update: singleton \'%s\' not found on %s', singletonName, LinkUtil.getUri(parentResource, LinkRelation.Self));
    }
    return parentResource;
    /*
        return cache
            .getResource(parentResource, options)
            .then(resource => {
                return cache.tryGetSingleton(resource, singletonName, singletonRel, undefined, options);
            })
            .then(singletonResource => {
                if (singletonResource) {
                    return cache
                        .updateResource(singletonResource, parentDocument[singletonName], options)
                        .then(syncResources(singletonResource, parentDocument[singletonName], strategies, options));
                } else {
                    log.debug(`[Sync] No update: singleton '${singletonName}' not found on ${LinkUtil.getUri(parentResource, LinkRelation.Self)}`);
                }
            })
            .then(() => parentResource);
    */
}

/**
 * **************************************
 *
 * Linked Representations as collections
 *
 * **************************************
 */

/**
 * Retrieves a resource item from a resource collection and synchronises (its attributes) from the document.
 *
 * @example
 *
 *     resource
 *     Collection         Document
 *
 *     +-----+
 *     |     |
 *     |     |
 *     +-----+    sync
 *         X                +---+
 *         X  <-----------+ | x |
 *         X                +---+
 *           items
 *
 * @param {LinkedRepresentation} parentResource
 * @param {*} resourceDocument
 * @param strategies
 * @param options
 * @return {Promise} containing the resource {@link LinkedRepresentation}
 */
export async function getResourceInCollection<T extends LinkedRepresentation>(
    parentResource: T | TrackedRepresentation<T>,
    resourceDocument: T | DocumentRepresentation<T>,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<T> {
    log.debug('[Sync] collection %s with \'%s\'', LinkUtil.getUri(parentResource, LinkRelation.Self));

    const result = await get(parentResource as TrackedRepresentation<T>, options);
    if (result) {
        const syncInfo = await syncResourceInCollection(result as unknown as CollectionRepresentation<T>, resourceDocument as T, options);
        if (syncInfo) {
            return await syncInfos(strategies, options)(syncInfo) as T;
        }
    }
    return result as unknown as T;
    // return cache
    //     .getCollection(parentResource, options)
    //     .then(collectionResource => syncResourceInCollection(collectionResource, resourceDocument, options))
    //     .then(syncInfos(strategies, options));
}

/**
 * Retrieves a parent resource and its named collection with items (sparsely populated), finds the item in that
 * collection and then synchronises (its attributes) with the document.
 *
 *  @example
 *
 *      parent      resource
 *      Resource    Collection        Document
 *
 *      +----------+
 *      |          |
 *      |          +-----+
 *      |     Named|     |
 *      |          |     |
 *      |          +-----+    sync
 *      |          |   X                +---+
 *      |          |   X  <-----------+ | x |
 *      +----------+   X                +---+
 *                       items
 *
 * @param {LinkedRepresentation} parentResource
 * @param {string} collectionName
 * @param {string|RegExp|RelationshipType} collectionRel
 * @param {*} resourceDocument
 * @param strategies
 * @param options
 * @return {Promise} containing the resource {@link LinkedRepresentation}
 */
export async function getResourceInNamedCollection<T extends LinkedRepresentation>(
    parentResource: T | TrackedRepresentation<T>,
    collectionName: string,
    collectionRel: RelationshipType,
    resourceDocument: T | DocumentRepresentation<T>,
    strategies: StrategyType[] = [],
    options ?: SyncOptions & HttpRequestOptions
): Promise<T> {
    log.debug('[Sync] resource (named collection) \'%s\' on %s', collectionName, LinkUtil.getUri(parentResource, LinkRelation.Self));

    const result = await get(parentResource as TrackedRepresentation<T>, { ...options, rel: collectionRel });
    if (result) {
        const syncInfo = await syncResourceInCollection(result as unknown as CollectionRepresentation<T>, resourceDocument as T, options);
        if (syncInfo) {
            return await syncInfos(strategies, options)(syncInfo) as T;
        }
    }
    return result as unknown as T;
    /*
        return (
            cache
                // ensure that the collection is added to the parent resource
                .getNamedCollection(parentResource, collectionName, collectionRel, options)
                .then(collectionResource => {
                    return syncResourceInCollection(collectionResource, resourceDocument, options);
                })
                .then(syncInfos(strategies, options))
        );
    */
}

/**
 * Retrieves a collection resource with items (sparsely populated), then synchronises the
 * collection items where each item may be updated (its attributes), a new item created or an item removed.
 *
 *  @example
 *
 *     resource              document
 *     Collection            Collection
 *
 *
 *                  sync
 *     +-----+                +-----+
 *     |     |  <-----------+ |     |
 *     |     |                |     |
 *     +-----+                +-----+
 *         X                     X
 *         X items               X items
 *         X                     X
 *
 * @param {LinkedRepresentation} collectionResource
 * @param {*} collectionDocument
 * @param strategies
 * @param options
 * @return {Promise} containing the collection {@link CollectionRepresentation}
 */
export async function getCollectionInCollection<T extends LinkedRepresentation>(
    collectionResource: T | TrackedRepresentation<T>,
    collectionDocument: T | DocumentRepresentation<CollectionRepresentation<T>>,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<T> {

    const { info } = await synchroniseCollection(
        collectionResource as unknown as CollectionRepresentation<T>,
        collectionDocument as unknown as CollectionRepresentation<T>,
        options);
    if (info) {
        // populate the potentially sparse collection - we need to ensure that
        // any existing ones (old) are not stale and that any just created (sparse)
        // are hydrated
        await get(collectionResource as TrackedRepresentation<T>, { ...options, includeItems: true });
        await tailRecursionThroughStrategies(strategies, info, options);
    }
    return collectionResource;
}

/**
 * Retrieves a parent resource and its named collection with items (sparsely populated), then synchronises the
 * collection items where each item may be updated (its attributes), a new item created or an item removed.
 *
 * This method is used when you have context of one parent and the document collection  (see {@link getNamedCollectionInNamedCollection})
 *
 *  @example
 *
 *      parent     resource              document
 *      Resource   Collection            Collection
 *
 *     +----------+
 *     |          |            sync
 *     |          +-----+                +-----+
 *     |     Named|     |  <-----------+ |     |
 *     |          |     |                |     |
 *     |          +-----+                +-----+
 *     |          |   X                     X
 *     |          |   X items               X items
 *     +----------+   X                     X
 *
 * @param parentResource
 * @param collectionName
 * @param collectionRel
 * @param collectionDocument
 * @param strategies
 * @param options
 * @return {Promise} containing the {@link CollectionRepresentation}
 */
export async function getCollectionInNamedCollection<T extends LinkedRepresentation>(
    parentResource: T | TrackedRepresentation<T>,
    collectionName: string,
    collectionRel: RelationshipType,
    collectionDocument: DocumentRepresentation<T> | CollectionRepresentation,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions
): Promise<T> {
    log.debug('[Sync] collection (in named collection) \'%s\' on %s', collectionName, LinkUtil.getUri(parentResource, LinkRelation.Self));

    const result = await ApiUtil.get(parentResource as TrackedRepresentation<T>, { ...options, rel: collectionRel });
    if (result) {
        // in the context of the collection, synchronise the collection part of the document
        await getCollectionInCollection(result, collectionDocument, strategies, options);
    } else {
        log.info('[Sync] No \'%s\' on resource %s', collectionName, LinkUtil.getUri(parentResource, LinkRelation.Self));
    }
    return parentResource;
}

/**
 * Retrieves a parent resource and its named collection with items (sparsely populated), then given the
 * parent document which has document collection items it synchronises the items where each item may be
 * updated (its attributes), a new item created or an item removed.
 *
 * This method is used when you have parent contexts for both collections (see {@link getCollectionInNamedCollection})
 *
 * @example
 *
 *     parent      resource             document    parent
 *     Resource    Collection           Collection  Document
 *
 *     +----------+                            +----------+
 *     |          |            sync            |          |
 *     |          +-----+                +-----+          |
 *     |     Named|     |  <-----------+ |     |          |
 *     |          |     |                |     |          |
 *     |          +-----+                +-----+          |
 *     |          |   X                     X  |          |
 *     |          |   X items         items X  |          |
 *     +----------+   X                     X  +----------+
 *
 * @param {LinkedRepresentation} parentResource
 * @param {string} collectionName
 * @param {RelationshipType} collectionRel
 * @param {*} parentDocument
 * @param strategies
 * @param options
 * @return {Promise} containing the collection {@link CollectionRepresentation}
 */
export async function getNamedCollectionInNamedCollection<T extends LinkedRepresentation>(
    parentResource: T | TrackedRepresentation<T>,
    collectionName: string,
    collectionRel: RelationshipType,
    parentDocument: DocumentRepresentation<T>,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions
): Promise<CollectionRepresentation<T>> {

    const name = NamedRepresentationFactory.defaultNameStrategy(collectionRel);

    return await getCollectionInNamedCollection(
        parentResource,
        collectionName,
        collectionRel,
        RepresentationUtil.getProperty(parentDocument, name) as DocumentRepresentation,
        strategies,
        options
    ) as unknown as CollectionRepresentation<T>;
}
