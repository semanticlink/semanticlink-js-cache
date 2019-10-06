import _ from 'underscore';
import * as link from 'semantic-link';
import {log} from '..';
import * as cache from '../cache';
import Differencer from './Differencer';
import {defaultResolver} from './syncResolver';
import {findResourceInCollection} from '../utils/collection';
import {mapWaitAll, sequentialWaitAll} from '../utils/asyncCollection';

/**
 * Default resource finder assumes that resources are in a collection via the 'items' attribute/array.
 * @return {function(CollectionRepresentation=, LinkedRepresentation=): LinkedRepresentation}
 * @private
 */
export const defaultFindResourceInCollectionStrategy = findResourceInCollection;

/**
 *
 * Iterate (sequentially move) through all the strategies. However, each strategy can make many calls itself based
 * on the change sets required (syncInfos). The calls can be processed either all at once (parallel using a map wait all
 * which is implemented as a Promise.all) or one at a time (sequentially, note there is no partial batching).
 *
 * The approach is set using {@link CacheOptions.strategyBatchSize} when non-zero (defined)
 *
 * When syncing a tree/graph, each path of resources is sync'd via a set of strategies. The syncInfo is the state action
 * (update, create, delete) on the resource and the strategy is how resources are traversed.
 *
 * @param {StrategyType[]} strategies
 * @param {SyncOptions} options
 * @param {SyncInfo[]} syncInfos
 * @return {Promise.<void>}
 * @private
 */
function tailRecursionThroughStrategies(strategies, options, syncInfos) {
    return sequentialWaitAll(strategies, (unusedMemo, strategy) => {

        if (options.strategyBatchSize === 0 || _(options.strategyBatchSize).isUndefined()) {
            // invoke a parallel strategy when want to go for it
            return mapWaitAll(syncInfos, syncInfo => strategy({
                resource: syncInfo.resource,
                document: syncInfo.document,
                options
            }));
        } else {
            // invoke a sequential strategy - and for now, single at a time
            return sequentialWaitAll(syncInfos, (unusedMemo2, syncInfo) => strategy({
                resource: syncInfo.resource,
                document: syncInfo.document,
                options
            }));
        }

    });
}

/**
 * Recurse through all the strategies working through change sets.
 * @param {StrategyType[]} strategies
 * @param {SyncOptions} options
 * @return {function(syncInfo:SyncInfo):Promise.<LinkedRepresentation>} containing the representation (@link LinkedRepresentation}
 * @private
 */
function syncInfos(strategies, options) {
    return syncInfo =>
        tailRecursionThroughStrategies(strategies, options, [syncInfo])
            .then(() => syncInfo.resource);
}

/**
 * Update or create a resource in a collection based on a document depending on whether it previously exists or not.
 *
 * note: updates do not check for differences
 * @param collectionResource
 * @param {*} resourceDocument
 * @param {CacheOptions} options
 * @return {Promise.<SyncInfo>} contains a syncInfo
 * @private
 */
function syncResourceInCollection(collectionResource, resourceDocument, options = {}) {

    const findResourceInCollectionStrategy = options.findResourceInCollectionStrategy || defaultFindResourceInCollectionStrategy;

    // locate the document in the collection items
    const collectionItemResource = findResourceInCollectionStrategy(collectionResource, resourceDocument);

    // check whether to update or create
    if (collectionItemResource && !options.forceCreate) {
        return cache
        // synchronise the item in the collection from the server
            .getCollectionItem(collectionResource, collectionItemResource, options)
            .then(item => {
                // and update the resource back to the server and return it
                return cache.updateResource(item, resourceDocument, options);
            })
            .then(resource => ({
                resource: resource,
                document: resourceDocument,
                action: 'update'
            }));

    } else {
        return cache
        // add the document to the collection a
            .createCollectionItem(collectionResource, resourceDocument, options)
            .then(item => {
                // ensure the resource is returned
                return cache.getResource(item, options);
            })
            .then(resource => ({
                resource: resource,
                document: resourceDocument,
                action: 'create'
            }));
    }
}

/**
 *
 * @param collectionResource
 * @param collectionDocument
 * @param {CacheOptions} options
 * @returns {Promise}
 * @private
 */
function synchroniseCollection(collectionResource, collectionDocument, options = {}) {

    /**
     * @type {UriResolver}
     */
    const resolver = options.resolver || defaultResolver;

    /**
     * Delete a resource from the local state cache
     */
    const deleteResourceAndUpdateResolver = (deleteResource) => {
        return cache
            .deleteCollectionItem(collectionResource, deleteResource, options)
            .then(result => {
                resolver.remove(link.getUri(deleteResource, /self|canonical/));
                return result;
            });
    };

    /**
     * Update a resource and remember the URI mapping so that if a reference to the
     * network of data resource is required we can resolve a document reference to
     * real resource in our network.
     */
    const updateResourceAndUpdateResolver = (updateResource, updateDataDocument) => {
        return cache.getResource(updateResource, options)
            .then(updateResource => cache.tryUpdateResource(updateResource, updateDataDocument, options))
            .then(updateResource => {
                resolver.update(
                    link.getUri(updateDataDocument, /self|canonical/),
                    link.getUri(updateResource, /self|canonical/)
                );
                return updateResource;
            });

    };

    /**
     *
     * @param {*} createDataDocument
     * @return {?LinkedRepresentation} the new resource
     */
    const createResourceAndUpdateResolver = (createDataDocument) => {
        return cache
            .createCollectionItem(collectionResource, createDataDocument, options)
            .then(result => {
                resolver.add(
                    link.getUri(createDataDocument, /self|canonical/),
                    link.getUri(result, /self|canonical/));
                return result;
            });
    };

    /**
     * A contribute-only collection needs have an item removed. We send a DELETE request
     * back to the server on the collection URI with a payload containing the URI of the
     * removed item
     */
    const removeContributeOnlyResourceAndUpdateResolver = (deleteResource) => {

        options = _({}).extend(options, {
            deleteFactory: item => {
                let itemUri = link.getUri(item, /canonical|self/);
                let collectionUri = link.getUri(collectionResource, /canonical|self/);
                log.debug(`[Sync] Removing item '${itemUri}' from collection ${collectionUri}`);
                return link.delete(
                    collectionResource,
                    /canonical|self/,
                    'application/json',
                    [itemUri]);
            }
        });
        return cache
            .deleteCollectionItem(collectionResource, deleteResource, options)
            .then(result => {
                resolver.remove(link.getUri(deleteResource, /self|canonical/));
                return result;
            });

    };

    /**
     * Don't make request back to update, just remember the URI mapping so that if a reference to the
     * network of data resource is required we can resolve a document reference to the real resource in
     * our network.
     */
    const updateContributeOnlyResourceAndUpdateResolver = (collectionResourceItem, updateDataDocument) => {
        // at this point, it is the same implementation as the read-only form
        return updateReadonlyResourceAndUpdateResolver(collectionResourceItem, updateDataDocument);
    };

    /**
     * A contribute-only collection is missing a URI. This is likely to cause problems because
     * the URI will not be resolvable, because no matching resource can be found. It will then attempt to
     * add the item to the collection
     */
    const addContributeOnlyResourceAndUpdateResolver = (createDataDocument) => {

        return cache
            .createCollectionItem(collectionResource, createDataDocument, options)
            .then(result => {
                resolver.add(
                    link.getUri(createDataDocument, /self|canonical/),
                    link.getUri(result, /self|canonical/));
                return result;
            });
    };

    /**
     * A read-only collection needs have an item deleted. We don't delete it
     * but can add it to our mapping resolver anyway.
     *
     * We don't expect to come in here but we will if the document supplied
     * has less items that the current network of data (likely from time to time).
     */
    const deleteReadonlyResourceAndUpdateResolver = (collectionResourceItem) => {
        resolver.remove(link.getUri(collectionResourceItem, /self|canonical/));
        return Promise.resolve(undefined);
    };

    /**
     * Don't make request back to update, just remember the URI mapping so that if a reference to the
     * network of data resource is required we can resolve a document reference to the real resource in
     * our network.
     */
    const updateReadonlyResourceAndUpdateResolver = (collectionResourceItem, updateDataDocument) => {
        resolver.update(
            link.getUri(updateDataDocument, /self|canonical/),
            link.getUri(collectionResourceItem, /self|canonical/)
        );
        return Promise.resolve(undefined);
    };

    /**
     * A read-only collection is missing a URI. This is likely to cause problems because
     * the URI will not be resolvable, because no matching resource can be found.
     */
    const createReadonlyResourceAndUpdateResolver = () => {
        return Promise.resolve(undefined);
    };

    if (options.contributeonly) {
        log.debug(`[Sync] Collection '${link.getUri(collectionResource, /self|canonical/)}' is contribute-only`);
        const contributeOnly = {
            ...options,
            ...{
                createStrategy: addContributeOnlyResourceAndUpdateResolver,
                updateStrategy: updateContributeOnlyResourceAndUpdateResolver,
                deleteStrategy: removeContributeOnlyResourceAndUpdateResolver
            }
        };

        return Differencer.diffCollection(collectionResource, collectionDocument, contributeOnly);
    }
    // If the caller has signalled that the collection is read-only, or the collection
    // if missing a 'create-form' representation then we assume that the NOD can
    // not be changed.
    else if (options.readonly || !link.matches(collectionResource, /create-form/)) {
        log.debug(`[Sync] Collection '${link.getUri(collectionResource, /self|canonical/)}' is read-only`);
        const readOnlyOptions = {
            ...options,
            ...{
                createStrategy: createReadonlyResourceAndUpdateResolver,
                updateStrategy: updateReadonlyResourceAndUpdateResolver,
                deleteStrategy: deleteReadonlyResourceAndUpdateResolver
            }
        };

        return Differencer.diffCollection(collectionResource, collectionDocument, readOnlyOptions);
    } else {
        log.debug(`[Sync] Collection  '${link.getUri(collectionResource, /self|canonical/)}' is updatable`);
        const opts = {
            ...options,
            ...{
                createStrategy: createResourceAndUpdateResolver,
                updateStrategy: updateResourceAndUpdateResolver,
                deleteStrategy: deleteResourceAndUpdateResolver
            }
        };
        return Differencer.diffCollection(collectionResource, collectionDocument, opts);
    }
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
 * @param {LinkedRepresentation} resource
 * @param {LinkedRepresentation} document
 * @param {*[]} strategies
 * @param {CacheOptions} options
 * @return {function(syncResult:SyncResult<Representation>):Promise.<void>} callback function to be attached onto a Promise.then
 * @private
 */
function syncResources(resource, document, strategies = [], options = {}) {
    return () => sequentialWaitAll(
        strategies,
        (memo, strategy) => {
            if (strategy && _(strategy).isFunction()) {
                /**
                 * @type {SyncResult<Representation>}
                 */
                const sync = {resource, document, options};
                return strategy(sync);
            }
            log.warn('[Sync] Calling function has not handed in correct strategy and will not provision');
        });
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
 * @param {StrategyType[]} strategies
 * @param {CacheOptions} options
 * @return {Promise} containing the resource {@link LinkedRepresentation}
 */
export function getResource(resource, resourceDocument, strategies = [], options = {}) {
    log.debug(`[Sync] resource ${link.getUri(resource, /self/)}`);

    return cache.getResource(resource, options)
        .then(resource => cache.updateResource(resource, resourceDocument, options))
        .then(syncResources(resource, resourceDocument, strategies, options))
        .then(() => resource);
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
 * @param {LinkedRepresentation} parentResource
 * @param {string} singletonName
 * @param {string|RegExp|string[]|RegExp[]} singletonRel
 * @param {*} parentDocument
 * @param {StrategyType[]} strategies
 * @param {CacheOptions} options
 * @return {Promise} containing the parent {@link LinkedRepresentation}
 */
export function getSingleton(parentResource, singletonName, singletonRel, parentDocument, strategies = [], options = {}) {

    log.debug(`[Sync] singleton '${singletonName}' on ${link.getUri(parentResource, /self/)}`);

    return cache
        .getResource(parentResource)
        .then(resource => cache.tryGetSingleton(resource, singletonName, singletonRel, undefined, options))
        .then(singletonResource => {
            if (singletonResource) {
                return cache.updateResource(singletonResource, parentDocument[singletonName], options)
                    .then(syncResources(singletonResource, parentDocument[singletonName], strategies, options));
            } else {
                log.debug(`[Sync] No update: singleton '${singletonName}' not found on ${link.getUri(parentResource, /self/)}`);
            }
        })
        .then(() => parentResource);
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
 * @param {StrategyType[]} strategies
 * @param {CacheOptions} options
 * @return {Promise} containing the resource {@link LinkedRepresentation}
 */
export function getResourceInCollection(parentResource, resourceDocument, strategies = [], options = {}) {

    log.debug(`[Sync] collection ${link.getUri(parentResource, /self/)} with '${resourceDocument.name}'`);

    return cache
        .getCollection(parentResource, options)
        .then(collectionResource => syncResourceInCollection(collectionResource, resourceDocument, options))
        .then(syncInfos(strategies, options));
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
 * @param {string|RegExp|string[]|RegExp[]} collectionRel
 * @param {*} resourceDocument
 * @param {StrategyType[]} strategies
 * @param {CacheOptions} options
 * @return {Promise} containing the resource {@link LinkedRepresentation}
 */
export function getResourceInNamedCollection(parentResource, collectionName, collectionRel, resourceDocument, strategies = [], options = {}) {

    log.debug(`[Sync] resource '${collectionName}' on ${link.getUri(parentResource, /self/)}`);

    return cache
    // ensure that the collection is added to the parent resource
        .getNamedCollection(parentResource, collectionName, collectionRel, options)
        .then(collectionResource => syncResourceInCollection(collectionResource, resourceDocument, options))
        .then(syncInfos(strategies, options));
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
 * @param {LinkedRepresentation} parentResource
 * @param {string} collectionName
 * @param {string|RegExp|string[]|RegExp[]} collectionRel
 * @param {*} collectionDocument
 * @param {StrategyType[]} strategies
 * @param {CacheOptions} options
 * @return {Promise} containing the collection {@link CollectionRepresentation}
 */
export function getCollectionInNamedCollection(parentResource, collectionName, collectionRel, collectionDocument, strategies = [], options = {}) {

    log.debug(`[Sync] collection '${collectionName}' on ${link.getUri(parentResource, /self/)}`);

    return cache
        .getNamedCollection(parentResource, collectionName, collectionRel, options)
        .then(collectionResource => {

            if (!collectionResource) {
                log.info(`[Sync] No '${collectionName}' on resource ${link.getUri(parentResource, /self/)}`);
                return Promise.resolve(parentResource);
            }
            // in the context of the collection, synchronise the collection part of the document
            return synchroniseCollection(collectionResource, collectionDocument, options)
            // returns [infos, createResults, updateItems, deleteItems], we'll just have 'infos'
                .then(([syncInfos]) => {
                    return cache
                    // populate the potentially sparse collection - we need to ensure that
                    // any existing ones (old) are not stale and that any just created (sparse)
                    // are hydrated
                        .tryGetCollectionItems(collectionResource, options)
                        .then(() => {
                            // each item in the collection perform the strategy
                            return tailRecursionThroughStrategies(strategies, options, syncInfos);
                        });
                })
                .then(() => collectionResource);
        });
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
 * @param {string|RegExp|string[]|RegExp[]} collectionRel
 * @param {*} parentDocument
 * @param {StrategyType[]} strategies
 * @param {CacheOptions} options
 * @return {Promise} containing the collection {@link CollectionRepresentation}
 */
export function getNamedCollectionInNamedCollection(parentResource, collectionName, collectionRel, parentDocument, strategies = [], options) {
    return getCollectionInNamedCollection(parentResource, collectionName, collectionRel, parentDocument[collectionName], strategies, options);
}
