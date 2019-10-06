import _ from 'underscore';
import * as SparseResource from './sparseResource';
import {resourceMerger} from '../sync/ResourceMerger';
import * as link from 'semantic-link';
import {CollectionRepresentation, LinkedRepresentation, LinkType, RelationshipType, Uri} from 'semantic-link';
import {log} from '..';
import State from './State';
import {filter} from 'semantic-link/lib/filter';
import {mapWaitAll} from '../utils/asyncCollection';
import {findResourceInCollection, findResourceInCollectionByRelOrAttribute} from '../utils/collection';
import {CacheOptions, UriList} from "../interfaces";

/**
 *
 * This is just a utility that has a series of helpers that allows the client to layout the network of data
 * in a way that it wants allowing the client-side application cache data to have self-consistency.
 *
 */

/**
 * @param {LinkedRepresentation} resource
 * @param {FormRepresentation} createForm
 * @param {CreateCollectionResourceItemOptions} options
 * @type {CreateFormMergeStrategy}
 */
const defaultCreateFormStrategy = (resource, createForm, options) =>
    resourceMerger.createMerge(resource, createForm, options);

/**
 * Internal helper returning the resource state. This shifts the context of the network of data the specified resource.
 * @param {LinkedRepresentation} resource
 * @return {State}
 * @private
 */
const getResourceState = (resource) => State.get(resource);

/*


/**
 * Get a resource ensuring that it has a {@link State} on it.
 *
 * The resource **must** be at least sparse resource (ie {@link LinkedRepresentation}) with
 * at least the link relation `self` or 'canonical' in place.
 *
 * @example logical resource (with {@link stateFlagEnum.hydrated} state)
 *
 *    +-----+
 *    | hydrated
 *    |     |
 *    +-----+
 *
 * @example:
 *
 *   {
 *       links: [
 *           {
 *               rel: 'self',
 *               href: 'https://example.com/resource'
 *           }
 *       ]
 *   }
 *
 * @param {LinkedRepresentation} resource
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation>} promise contains a {@link LinkedRepresentation}
 */
export function getResource<T extends LinkedRepresentation>(resource: T, options?: CacheOptions = {}): Promise<T> {
    return getResourceState(resource)
        .getResource(resource, options);
}

/**
 * Get a resource. The resource **must** be {@link LinkedRepresentation} with
 * at least the link relation `self` or 'canonical' in place otherwise it will return the defaultValue
 * @param {LinkedRepresentation} resource
 * @param defaultValue
 * @param {CacheOptions} options
 * @return {Promise} promise contains a {@link LinkedRepresentation}
 * @return {Promise<LinkedRepresentation>}
 */
export function tryGetResource<T extends LinkedRepresentation>(
    resource: LinkedRepresentation,
    defaultValue: LinkedRepresentation | undefined = undefined,
    options: CacheOptions = {}): Promise<T | undefined> {
    const tryResource = State.tryGet(resource, defaultValue);

    if (tryResource === defaultValue) {
        log.debug(`Using default value on ${link.getUri(resource, /self/)}`);
        return Promise.resolve(defaultValue);
    } else {
        return tryResource
            .getResource(resource, options);
    }
}

/**
 * Get a collection resource with the items list synchronised.
 *
 * Note: At worst, this is only one call back to the server because the request returns a feed representation and then
 * the items list are synchronised with items at worst in {@link StateEnum.locationOnly}.
 * @example
 *
 *    collection      item
 *    Resource        Resource
 *
 *    +-----+
 *    | hydrated
 *    |     |
 *    +-----+
 *        X   items   +---+
 *        X  <------+ |locationOnly/mapped-title
 *        X           +---+
 *
 * @param {CollectionRepresentation} collection
 * @param {CacheOptions} options
 * @return {Promise<CollectionRepresentation>} collection is {@link StateEnum.hydrated}, sparsely
 * populate the items as {@link LinkedRepr  esentation} to {@link StateEnum.locationOnly} in the current
 * set (but not refresh the item set itself)
 */
export function getCollection<T extends CollectionRepresentation>(collection: T, options: CacheOptions): Promise<T> {
    return getResourceState(collection)
        .getCollectionResource(collection, options);
}

/**
 * Get an item resource from a collection resource. This gets the resource identified by the self/canonical
 * link relation and ensures that it is synchronised with the server.
 *
 * This may result in a partially synchronised collection.
 * @example
 *
 *    collection      item
 *    Resource        Resource
 *
 *    +-----+
 *    |     |
 *    |     |         'self'
 *    +-----+
 *        X    item   +---+
 *        X  <------+ |   |
 *        X           +---+
 *
 * @param {CollectionRepresentation} collection
 * @param {LinkedRepresentation} resource
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation>} promise contains a {@link LinkedRepresentation}
 */
export function getCollectionItem<T extends LinkedRepresentation>(
    collection: CollectionRepresentation,
    resource: T,
    options: CacheOptions): Promise<T> {
    return getCollectionItemByUri(collection, link.getUri(resource, /canonical|self/), options);
}

/**
 * Get an item resource (by uri) from a collection resource. This gets the resource identified by
 * the given uri and ensures that it is synchronised with the server.
 *
 * This may result in a partially synchronised collection.
 *  * @example
 *
 *    collection      item
 *    Resource        Resource
 *
 *    +-----+
 *    |     |
 *    |     |          uri
 *    +-----+
 *        X    item   +---+
 *        X  <------+ |   |
 *        X           +---+
 *
 * @param {CollectionRepresentation} collection
 * @param {string} itemUri the id of the resource
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation>} collection item synchronised with the server
 */
export function getCollectionItemByUri<T extends LinkedRepresentation>(
    collection: CollectionRepresentation,
    itemUri: Uri,
    options: CacheOptions): Promise<T> {
    return getResourceState(collection)
        .makeItemOnCollectionResource<T>(collection, itemUri, options)
        .then((resource: T) => getResource<T>(resource, options));
}


/**
 * Get a singleton resource in the context of a given resource added  as a named attribute on the context resource.
 *
 * Note: this overrides conflicting attributes
 *
 * @example
 *
 *
 *     context     singleton
 *     Resource    Resource
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |
 *     |          |
 *     +----------+
 *
 * @param {LinkedRepresentation} resource
 * @param {string} singletonName the attribute name on the context resource
 * @param {string|RegExp} rel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation>} promise contains a {@link LinkedRepresentation}
 */
export function getSingleton<T extends LinkedRepresentation>(
    resource: LinkedRepresentation,
    singletonName: string,
    rel: RelationshipType,
    options: CacheOptions): Promise<T> {

    return getResource(resource, options)
        .then(resource => {
            if (resource[singletonName]) {
                return getResource(resource[singletonName], options);
            } else {
                return getResourceState(resource)
                // add a sparsely populated resource as a named attribute and return it
                    .makeSingletonResource(resource, singletonName, rel, options)
                    .then(resource => getResource(resource, options));
            }
        });
}

/**
 * Get a singleton resource in the context of a given resource added as a named attribute on the context resource.
 *
 * @example
 *
 *
 *     context     singleton
 *     Resource    Resource
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |
 *     |          |
 *     +----------+
 *
 * @param {LinkedRepresentation} resource
 * @param {string} singletonName the attribute name on the context resource
 * @param {string|RegExp} rel the link relation name
 * @param {LinkedRepresentation} defaultValue
 * @param {CacheOptions=} options
 * @return {Promise} promise contains a {@link LinkedRepresentation}, which could be a {@link FeedRepresentation}
 */
export function tryGetSingleton<T extends LinkedRepresentation>(
    resource: LinkedRepresentation,
    singletonName: string,
    rel: RelationshipType,
    defaultValue: T,
    options: CacheOptions = {}): Promise<T | undefined> {
    // TODO: allow for explicit default value in interface. Underlying library has changed implementation to return default
    options:CacheOptions = {...options, getUri: link.getUri};

    if (!link.getUri(resource, rel, undefined)) {
        log.debug(`Missing uri for rel '${rel}' - resolving with default value`);
        return Promise.resolve(defaultValue);
    }

    if (resource[singletonName]) {
        return tryGetResource<T>(resource[singletonName], defaultValue, options);
    } else {
        return getResourceState(resource)
        // add a sparsely populated resource as a named attribute and return it
            .makeSingletonResource(resource, singletonName, rel, options)
            .then(resource => {
                //
                return getResource(resource, options);
            })
            .catch(() => {
                return log.error(`Unexpected error making singleton '${singletonName}'`);
            });
    }
}

/**
 * Get a collection resource added as a named attribute on the context resource.
 *
 * (see {@link getCollection} for hydration behaviour of the collection)
 *  @example
 *
 *      context    collection
 *      Resource   Resource
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X
 *     |          |   X items
 *     +----------+   X
 *
 * @param {LinkedRepresentation} resource
 * @param {string} collectionName the name of a {@link FeedRepresentation}
 * @param {string|RegExp} collectionRel the link relation name
 * @param {CacheOptions} options
 * @return {Promise<CollectionRepresentation>} promise contains a {@link CollectionRepresentation}
 *
 */
export function getNamedCollection<T extends CollectionRepresentation>(
    resource: LinkedRepresentation,
    collectionName: string,
    collectionRel: RelationshipType,
    options: CacheOptions): Promise<T> {
    return resource[collectionName]
        ? getCollection(resource[collectionName], options)
        : getResource(resource)
            .then((resource) => getResourceState(resource)
                .makeCollectionResource(resource, collectionName, collectionRel, options))
            .then((collection) => getCollection(collection, options));
}

/**
 * Get a collection resource added as a named attribute on the context resource.
 *
 * (see {@link getCollection} for hydration behaviour of the collection)
 *  @example
 *
 *      context    collection
 *      Resource   Resource
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X
 *     |          |   X items
 *     +----------+   X
 *
 * @param {LinkedRepresentation} resource
 * @param {string} collectionName the name of a {@link FeedRepresentation}
 * @param {string|RegExp} collectionRel the link relation name
 * @param {CacheOptions} options
 * @return {Promise<CollectionRepresentation|undefined>} promise contains a {@link CollectionRepresentation}
 */
export function tryGetNamedCollection<T extends CollectionRepresentation>(
    resource: LinkedRepresentation,
    collectionName: string,
    collectionRel: RelationshipType,
    options: CacheOptions = {}): Promise<T | undefined> {
    // TODO: allow for explicit default value in interface. Underlying library has changed implementation to return default
    options = {...options, getUri: link.getUri};
    return getNamedCollection(resource, collectionName, collectionRel, options);
}

/**
 *
 * Get a collection resource on each of the resources added as a named attribute on the context singleton resource.
 *
 * (see {@link getCollection} for hydration behaviour of the collection)
 *  @example
 *
 *      singleton
 *      context     collection
 *      Resources   Resource (per singleton)
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X
 *     |          |   X items
 *     +----------+   X
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X
 *     |          |   X items
 *     +----------+   X
 *
 * @param {LinkedRepresentation[]} singletons
 * @param {string} collectionName
 * @param {string|RegExp} collectionRel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation[]>} promise contains original singletons
 */
export function getNamedCollectionOnSingletons<T extends LinkedRepresentation>(
    singletons: T[],
    collectionName: string,
    collectionRel: RelationshipType,
    options: CacheOptions): Promise<T[]> {
    return mapWaitAll(singletons, singleton =>
        getResource(singleton)
            .then(resource => tryGetNamedCollection(resource, collectionName, collectionRel, options)))
        .catch(err => {
            log.info('Singleton error:', err);
            return Promise.resolve(singletons);
        })
        .then(() => singletons);
}

/**
 *
 * Get a collection resource on each of the resources added as a named attribute on the context singleton resource.

 *
 * (see {@link getCollection} for hydration behaviour of the collection)
 *  @example
 *
 *      singleton
 *      context     collection
 *      Resources   Resource (per singleton)
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X
 *     |          |   X items
 *     +----------+   X
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X
 *     |          |   X items
 *     +----------+   X
 *
 * @param {LinkedRepresentation[]} singletons
 * @param {string} collectionName
 * @param {string|RegExp} collectionRel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation[]>} promise contains original singletons
 */
export function tryGetNamedCollectionOnSingletons<T extends LinkedRepresentation>(
    singletons: T[], collectionName: string, collectionRel: RelationshipType, options: CacheOptions = {}): Promise<T[]> {
    // TODO: allow for explicit default value in interface. Underlying library has changed implementation to return default
    options = {...options, getUri: link.getUri};

    return mapWaitAll(
        singletons,
        (singleton: T) => getResource(singleton)
            .then(resource => tryGetNamedCollection(resource, collectionName, collectionRel, options)))
        .catch(err => {
            log.info('Singleton error:', err);
            return Promise.resolve(singletons);
        })
        .then(() => singletons);
}

/**
 * Get a collection resource and all its items. This is a pre-emptive load of all item resources.
 *
 * @example
 *
 *    collection     item
 *    Resource       Resource
 *
 *    +-----+
 *    |     |
 *    |     |
 *    +-----+
 *        X   items   +---+
 *        X  <------+ |hydrated
 *        X           +---+
 *
 * @param {CollectionRepresentation} collection
 * @param {CacheOptions} options (with a cancellable)
 * @return {Promise<CollectionRepresentation>} with the collection resource
 */
export function tryGetCollectionItems<T extends CollectionRepresentation>(
    collection: T,
    options: CacheOptions = {}): Promise<T> {
    return mapWaitAll(collection, item => {
        return getResource(item, options)
            .catch(() =>
                Promise.resolve(getResourceState(collection).removeItemFromCollectionResource(collection, item)));
    })
        .then(() => {
            return collection;
        });
}

/**
 * Get a collection resource and all its items. This is a pre-emptive load of all item resources.
 *
 * @example
 *
 *    collection     item
 *    Resource       Resource
 *
 *    +-----+
 *    |     |
 *    |     |
 *    +-----+
 *        X   items   +---+
 *        X  <------+ |hydrated
 *        X           +---+
 *
 * @param {LinkedRepresentation} collection
 * @param {CacheOptions=} options
 * @return {Promise<CollectionRepresentation>}
 */
export function getCollectionAndItems<T extends CollectionRepresentation>(
    collection: T,
    options: CacheOptions): Promise<T> {

    return getCollection<T>(collection, options)
        .then((collection: T) => tryGetCollectionItems(collection, options));
}

/**
 * Get a collection resource and all its items added as a named attribute on the context resource. This
 * is a pre-emptive load of all item resources.
 *
 * @example
 *
 *      context    collection    item
 *      Resource   Resource      Resource
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X items    +---+
 *     |          |   X <------+ |hydrated
 *     +----------+   X          +---+
 *
 * @param {LinkedRepresentation} resource
 * @param {string} collectionName the name of the collection in the context container
 * @param {string|RegExp} collectionRel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise} with the collection resource of type {@link FeedRepresentation} (i.e. the collection resource object)
 */
export function getNamedCollectionAndItems<T extends CollectionRepresentation>(
    resource: LinkedRepresentation,
    collectionName: string,
    collectionRel: RelationshipType,
    options: CacheOptions): Promise<T> {
    return getNamedCollection<T>(resource, collectionName, collectionRel, options)
        .then(collection => tryGetCollectionItems<T>(collection, options));
}


/**
 * Get a collection resource and all its items based on an attribute containing a uri-list added
 * as a named attribute. This is a pre-emptive load of all item resources.
 *
 * @example
 *
 *
 *     context      item
 *     Resource     Resources
 *
 *     +-----------+
 *     |           |
 *     |           |
 *     |           +---------+
 *     |   existing|uri-list |
 *     |      named|         | +--------+
 *     |           |         |          |
 *     |           +---------+          |
 *     |           |            each    |
 *     |           |            uri     |
 *     |           +-----+      to      |
 *     |      Named|     |      item    |
 *     |           |     |              |
 *     |           +-----+              |
 *     |           |   X  items         |
 *     |           |   X    <-----------+
 *     |           |   X
 *     +-----------+
 *
 *
 * @param {LinkedRepresentation} resource
 * @param {string} collectionName
 * @param {string} uriListName
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation[]>} contains an array of populated resources
 */
export function getNamedCollectionAndItemsFromUriList(resource: LinkedRepresentation, collectionName, uriListName, options) {
    return SparseResource.makeSingletonSparseListFromAttributeUriList(resource, collectionName, uriListName)
        .then(collection => mapWaitAll(collection, item => getResource(item, options)));
}

/**
 * Get a collection resource and all its items. This is a pre-emptive load of all item resources.
 *
 * @example
 *
 * Get a collection resource and all its items added  as a named attribute on the context resource. This
 * is a pre-emptive load of all item resources.
 *
 * @example
 *
 *      context     collection    item
 *      Resource   Resource      Resource
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X items    +---+
 *     |          |   X <------+ |hydrated
 *     +----------+   X          +---+
 *
 *
 * @param {LinkedRepresentation} resource the context to the collection
 * @param {string} collectionName the name of the collection in the context
 * @param {string|RegExp} collectionRel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise<CollectionRepresentation|undefined>}
 */
export function tryGetCollectionAndItems(resource: LinkedRepresentation, collectionName, collectionRel, options = {}) {
    // TODO: allow for explicit default value in interface. Underlying library has changed implementation to return default
    options = {...options, getUri: link.getUri};

    return getNamedCollection(resource, collectionName, collectionRel, options)
        .then(collection => {

            if (!collection) {
                return Promise.resolve(undefined);
            }
            return mapWaitAll(collection, item => getResource(item, options))
                .then(() => collection);
        });
}

/**
 * Get a collection resource (based also on its 'title') and all its items added  as a named attribute on
 * the context resource. This is a pre-emptive load of all item resources.
 *
 * This is used where there are multiple link relations of the same name and are different by 'title'
 *
 * Note: this is for more complex api designs using multiple link relations on a resource to representation collections.
 *
 * @example
 *
 *
 *      context     collection
 *      Resource   Resource (where link rel and title)
 *
 *     +----------+
 *     |          |
 *     |          +-----+
 *     |     Named|     |
 *     |          |     |
 *     |          +-----+
 *     |          |   X items    +---+
 *     |          |   X <------+ |hydrated
 *     +----------+   X          +---+
 *
 * @example Match on rel --> todos, title --> 49004.rewire.example.nz
 *
 *    {
 *      "links": [
 *        {
 *          "rel": "self",
 *          "href": "http://localhost:5000/user/f58c6dd2a5"
 *        },
 *        {
 *          "rel": "todos",
 *          "href": "http://localhost:5000/user/tenant/5388881ce2/todo",
 *          "title": "586931.rewire.example.nz"
 *        },
 *        {
 *          "rel": "todos",
 *          "href": "http://localhost:5000/user/tenant/db384a9924/todo",
 *          "title": "49004.rewire.example.nz"
 *        },
 *     } ...
 *
 * @param {LinkedRepresentation} resource the context to the collection
 * @param {string} collectionName the name of the collection in the context container
 * @param {string|RegExp} collectionRel the link relation name
 * @param {string} title the title of the resource in the collection to be hydrated
 * @param {CacheOptions=} options
 * @return {Promise} with the item by uri from the collection resource of type {@link FeedRepresentation}
 */
export function getNamedCollectionByTitle(resource: LinkedRepresentation, collectionName, collectionRel, title, options) {

    /**
     * Override the semantic link getUri implementation that returns the first found href. However
     * because these options cascade through, ensure that the getUri is only used 'once' and then discarded
     */
    return getNamedCollection(
        resource,
        collectionName,
        collectionRel,
        {
            ...options,
            getUri: _.once((links, relationshipType, mediaType) => {
                const [first,] = filter(links, relationshipType, mediaType).filter(link => link.title === title);
                if (first) {
                    log.debug(`[Cache] getUri override on rel '${collectionRel}' found title '${title}' using '${first.href}'`);
                    return first.href;
                } else {
                    log.debug(`No match on link rel '${collectionRel}' for title '${title}'`);
                }
            })
        })
        .then(collection => tryGetCollectionItems(collection, options));

}

/**
 * Get an item resource (based on its 'self' uri link relation) from a named collection resource in the context of a given resource
 *
 * @example
 *
 *
 *      context    collection    item
 *      Resource   Resource      Resource
 *
 *     +----------+
 *     |          |
 *     |          +-----+        (where link rel self == uri)
 *     |     Named|     |          +
 *     |          |     |          |
 *     |          +-----+          v
 *     |          |   X item     +---+
 *     |          |   X <------+ |hydrated
 *     +----------+   X          +---+
 *
 * @param {LinkedRepresentation} resource the context resource to the collection
 * @param {string} collectionName the name of the collection in the context
 * @param {string|RegExp} collectionRel the link relation name
 * @param {string} itemUri the uri of the item resource in the collection to be hydrated
 * @param {CacheOptions=} options
 * @return {Promise<LinkedRepresentation>} with the item by uri from the collection item resource
 */
export function getNamedCollectionItemByUri(resource: LinkedRepresentation, collectionName, collectionRel, itemUri, options) {

    return getNamedCollection(resource, collectionName, collectionRel, options)
        .then((collection) => {

            if (!collection) {
                throw new Error(`A collection should have been created ${link.getUri(resource, /self|canonical/)} with ${collectionName}`);
            }

            let itemResource = findResourceInCollectionByRelOrAttribute(collection, itemUri);

            if (!itemResource) {
                itemResource = SparseResource.makeResourceFromUriAddedToCollection(collection, itemUri);
            }
            return getResource(itemResource, options);
        });
}

/**
 * Get each item resource in the named child collection resource in the context of collection items. This is a
 * pre-emptive load of the child collection items.
 *
 * @example
 *
 *   context                      child
 *   collection      item        collection   item
 *   Resource        Resource    Resource     Resource
 *
 *   +-----+
 *   |     |
 *   |     |
 *   +-----+         +----------+
 *       X   each    |          |
 *       X   item    |          +-----+
 *       X <------+  |     Named|     |
 *                   |          |     |
 *                   |          +-----+
 *                   |          |   X   items  +---+
 *                   |          |   X <------+ |hydrated
 *                   +----------+   X          +---+
 *
 * @param {CollectionRepresentation} contextCollection
 * @param {string} childCollectionName the name of the collection on each item resource
 * @param {string|RegExp} childCollectionRel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise<CollectionRepresentation>} original collection
 */
export function tryGetNamedCollectionAndItemsOnCollectionItems(
    contextCollection: CollectionRepresentation, childCollectionName, childCollectionRel, options = {}) {
    // TODO: allow for explicit default value in interface. Underlying library has changed implementation to return default
    options = {...options, getUri: link.getUri};

    // TODO ?? should this return the child collection items ??
    return mapWaitAll(contextCollection,
        item => {
            return getNamedCollection(item, childCollectionName, childCollectionRel, options)
                .then(childCollection => {
                    return tryGetCollectionItems(childCollection, options);
                });
        }
    );
// .then(collection => collection);
}

/**
 * Get each item resource in the named child collection resource in the context of collection items. This is a
 * lazy load of child collection items.
 *
 * @example
 *
 *   context                     child
 *   collection      item        collection   item
 *   Resource        Resource    Resource     Resource
 *
 *   +-----+
 *   |     |
 *   |     |
 *   +-----+         +----------+
 *       X   each    |          |
 *       X   item    |          +-----+
 *       X <------+  |     Named|     |
 *                   |          |     |
 *                   |          +-----+
 *                   |          |   X   items  +---+
 *                   |          |   X <------+ |locationOnly
 *                   +----------+   X          +---+
 *
 * @param {CollectionRepresentation} collection the context to the collection
 * @param {string} childCollectionName the name of the collection in the context collection items
 * @param {string|RegExp} rel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise} with the collection resource of type {@link FeedRepresentation} (i.e. the collection resource object)
 */
export function tryGetNamedCollectionOnCollectionItems(collection, childCollectionName, rel, options) {

    return mapWaitAll(collection, item => tryGetNamedCollection(item, childCollectionName, rel, options));
}

/**
 * Get singleton resource on a context collection added as a named attribute on each item resource
 *
 * @example
 *
 *   context                      child
 *   collection      item        singleton
 *   Resource        Resource    Resource
 *
 *   +-----+
 *   |     |
 *   |     |
 *   +-----+         +----------+
 *       X   each    |          |
 *       X   item    |          +-----+
 *       X <------+  |     Named|     |
 *                   |          |     |
 *                   |          +-----+
 *                   |          |
 *                   |          |
 *                   +----------+
 *
 * @param {CollectionRepresentation} collection the context to the collection
 * @param {string} childSingletonName the name of the collection in the context collection items
 * @param {string|RegExp} childSingletonRel the link relation name
 * @param {CacheOptions=} options
 * @return {Promise} with the array of singleton resources that succeed
 */
export function tryGetSingletonOnCollectionItems(collection, childSingletonName, childSingletonRel, options) {
    return mapWaitAll(collection, item => tryGetSingleton(item, childSingletonName, childSingletonRel, undefined, options))
    // now discard any in the tryGet that returned the default value 'undefined'
        .then(result => _(result).reject(item => !item));
}

/**
 * @type EditFormMergeStrategy
 */
const defaultEditFormStrategy = (resource, documentResource, editForm, options = {}) => {

    const isTracked = (resource, trackedName) => {
        const resourceState = State.tryGet(resource);

        if (resourceState) {
            return resourceState.isTracked(trackedName);
        } else {
            return false;
        }
    };

    options = {...options, isTracked};

    return resourceMerger.editMerge(resource, documentResource, editForm, options)
        .catch(() => {
            log.error('[Merge] unknown merge error');
        });
};

/**
 * Tries to update a resource. If the server refuses an update the local version will not be mutated.
 *
 * @example
 *                   document    edit-form    item
 *    Resource                   Resource     Resource
 *
 *    +-----+        +-----+     +-----+  merged
 *    | edit-form    |     |+--->|     |+--------+
 *    |     |        |     |     |     |         V
 *    +-----+        +-----+     +-----+      +-----+
 *       ^                                    |     |
 *       +----------------------------------+ |     |
 *                  item updated              +-----+
 *
 * @param {LinkedRepresentation} resource must include the 'edit-form' link relation
 * @param {*} document
 * @param {UpdateCollectionResourceItemOptions} options
 * @return {Promise} with the updated resource
 */
export function updateResource(resource, document, options = {}) {

    /**
     * Helper to clean out im-memory objects to be serialised across the wire to the api/server.
     * @param {LinkedRepresentation} resource
     * @return {*}
     */
    const toWireRepresentation = (resource) => State.delete(resource);


    /* @type {EditMergeOptions} */
    options = {...options, undefinedWhenNoUpdateRequired: true};

    if (!document) {
        log.warn(`No document provided to update for resource ${link.getUri(resource, /self/)}`);
        return Promise.resolve(resource);
    }
    const mergeStrategy = options.editForm || defaultEditFormStrategy;

    return tryGetSingleton(resource, 'editForm', /edit-form/, undefined, options)
        .then(editForm => {

            if (!editForm) {
                log.info(`Resource has no edit form ${link.getUri(resource, /self|canonical/)}`);
                // return Promise.resolve(resource);
                editForm = {items: []};
            }

            return mergeStrategy(resource, document, editForm, options)
                .then(merged => {
                    if (merged) {
                        return getResourceState(resource)
                            .updateResource(resource, toWireRepresentation(merged), options);
                    } else {
                        log.info(`No update required ${link.getUri(resource, /canonical|self/)}`);
                        return Promise.resolve(resource);
                    }
                })
                .catch(err => {
                    log.error(`Merge error: edit-form on ${link.getUri(resource, /self|canonical/)}`, err);
                });
        })
        .catch(() => {
            // with a tryGet we should never get here (alas that is not always the case)
            log.error(`Unexpected error on 'edit-form': on ${link.getUri(resource, /self|canonical/)}`/*, err, resource*/);
        });
}

export function tryUpdateResource(resource, documentResource, options = {}) {
    return updateResource(resource, documentResource, options);
}


/**
 * Update a collection through PATCH using a UriList to remove/add collection items.
 *
 * @remarks
 *
 * This is a simply "make it so" operation that really should only be used sparingly because it doesn't play
 * that nicely with lifecyles of collections and items in many cases (put differently, this is an operation that acts
 * on the lifecycle of the collection not the members of the collection).
 *
 * Also, note, it doesn't use an edit form because the uri-list is a known mime-type and knowledge from a form is not
 * required. It possible to model all this in the edit form but seems an unnecessary overhead.
 *
 * @param {CollectionRepresentation} collection
 * @param {UriList} uriList
 * @param {CacheOptions} options
 * @returns {Promise<CollectionRepresentation | never>}
 */
export const updateCollection = (collection:CollectionRepresentation, uriList:UriList, options:CacheOptions) => {

    return getCollection(collection, options)
        .then((collection => link.patch(
            collection,
            /self/,
            'text/uri-list',
            uriList)))
        .then(() => getCollection(collection, {...options, forceLoad: true}));
};

/**
 * @example
 *
 *    collection     document    create-form  item
 *    Resource                   Resource     Resource
 *
 *    +-----+        +-----+     +-----+  merged
 *    | create-form  |     |+--->|     |+--------+
 *    |     |        |     |     |     |         V
 *    +-----+        +-----+     +-----+      +-----+
 *        X                                   |     |
 *  items X  <------------------------------+ |     |
 *        X          item added               +-----+
 *
 * @param {CollectionRepresentation} collectionRepresentation the collection to add the new resource to
 * @param {*} document The document provided to create form callback to make the create data
 * @param {CreateCollectionResourceItemOptions} options
 * @return {LinkedRepresentation} a sparsely populated resource representation
 */
export function createCollectionItem(collectionRepresentation, document, options = {}) {
    const mergeStrategy = options.createForm || defaultCreateFormStrategy;

    return getCollection(collectionRepresentation, options)
        .then(collectionOrCreateForm => {

            if (!options.contributeonly) {
                return getSingleton(collectionOrCreateForm, 'createForm', /create-form/, options)
                    .then(createFormResource => mergeStrategy(document, createFormResource, options))
                    .then(mergedResource => {
                        if (_(mergedResource).isEmpty()) {
                            log.warn(`Unexpected empty item '${link.getUri(document, /self|canonical/)}' in '${link.getUri(collectionRepresentation, /self|canonical/)}' on mapping '${options.mappedTitle}'`);
                            return Promise.resolve(collectionRepresentation);
                        }
                        return getResourceState(collectionRepresentation)
                            .createResource(collectionRepresentation, mergedResource, options);
                    });
            } else {

                // // data for uri returns a json array of Uris
                return getResourceState(collectionRepresentation)
                    .createResource(collectionRepresentation, [link.getUri(document, /canonical|self/)], options);
            }

        })
        .then(resource => {
            return State.makeItemToCollectionResource(collectionRepresentation, () => resource);
        });
}

/**
 * Delete a linked representation
 *
 * @example logical resource (with {@link StateEnum.hydrated} state)
 *
 *    +-----+
 *    | deleteInProgress --> delete (then de-reference)
 *    |     |
 *    +-----+
 *
 * @param {LinkedRepresentation} resource
 * @param {CacheOptions} options
 * @return {Promise} contains the original resource {@link LinkedRepresentation}
 */
export function deleteResource<T extends LinkedRepresentation>(resource:T, options:CacheOptions = {}) :Promise<T>{
    return getResourceState(resource)
        .deleteResource(resource, options)
        .then(() => resource);
}

/**
 * Delete a item resource from a collection.
 *
 * @example
 *
 *    collection     item
 *    Resource       Resource
 *
 *    +-----+
 *    |     |
 *    |     |
 *    +-----+
 *        X   item    +---+
 *        -  <------+ |deleteInProgress -> deleted (then remove from list)
 *        X           +---+
 *
 * @param {CollectionRepresentation} collection
 * @param {LinkedRepresentation} item
 * @param {CacheOptions} options
 * @return {Promise}
 */
export function deleteCollectionItem(collection, item, options = {}) {

    return getCollection(collection, options)
        .then((collectionResource) => {
            const itemResource = findResourceInCollection(collectionResource, item);
            if (itemResource) {
                return deleteResource(itemResource, options);
            } else {
                const reason = `Item not found (${link.getUri(item, /self/)}in collection ${link.getUri(collection, /self/)}`;
                log.error(reason, options);
                return Promise.reject(reason);
            }
        })
        .then((resource) => {
            return getResourceState(collection)
                .removeItemFromCollectionResource(collection, resource);
        });
}

/**
 * Create a sparse representation that can be the root of the cache.
 *
 * This is a wrapper around {@link SparseResource} and {@link.getUri)
 *
 * @param {LinkType} links
 * @param {RelationshipType} rel
 * @return {LinkedRepresentation|CollectionRepresentation}
 */
export const create = (links:LinkType, rel:RelationshipType) => SparseResource.makeSparseResourceFromUri(link.getUri(
    links, rel));
