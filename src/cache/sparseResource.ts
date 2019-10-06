import _ from 'underscore';
import State from '../cache/State';
import StateEnum from './StateEnum';
import * as link from 'semantic-link/lib/index';
import {
    CollectionRepresentation,
    FeedItemRepresentation,
    FeedRepresentation,
    LinkedRepresentation,
    Uri
} from 'semantic-link';
import {SparseResourceOptions} from "./interfaces";
import {CacheOptions} from "../interfaces";


/**
 * A set of factory methods to create sparse resources
 */

/**
 * Default mapped title between feed items and sparse resources
 * @type {string}
 */
export const mappedTitle = 'name';


/**
 * Default state factory will return an empty object
 * @returns {function():{}}
 */
export const defaultStateFactory = () => {
    return {};
};

/**
 *
 * @param {StateEnum} state
 * @return {SparseResourceOptions}
 */
export const makeSparseResourceOptions = (state:Symbol) => {
    return {
        stateFactory: () => State.make(state)
    };
};

/**
 *
 * @param {FeedItemRepresentation} feedItem
 * @param {string=} resourceTitleAttributeName
 * @return {{links: *[]}}
 */
export const makeFromFeedItem = <T extends LinkedRepresentation>(
    feedItem: FeedItemRepresentation,
    resourceTitleAttributeName?: string): T => {

    let localResource: T = {
        links: [{
            rel: 'self',
            href: feedItem.id
        }]
    };
    localResource[resourceTitleAttributeName || mappedTitle] = feedItem.title;
    return localResource;
};

/**
 * Make a new, sparsely populated {@link LinkedRepresentation}.
 * @param {SparseResourceOptions} options
 * @param {?*} defaultValues
 * @return {LinkedRepresentation|CollectionRepresentation}
 */
export const makeLinkedRepresentation = (options: SparseResourceOptions, defaultValues:any) => {
    options = options || {};

    if (!options.stateFactory) {
        options.stateFactory = defaultStateFactory;
    }

    return Object.assign(options.stateFactory(), {links: []}, defaultValues);
};

/**
 * Make a new, sparsely populated {@link LinkedRepresentation} potentially with {@link State} and
 * link relation 'self' populated with from given uri. if href is undefined the resource should be in state virtual
 * @param {string} uri
 * @param {SparseResourceOptions} options
 * @param {?*} defaultValues
 * @return {LinkedRepresentation|CollectionRepresentation}
 */
export const makeFromUri = (uri: Uri, options: SparseResourceOptions, defaultValues:any) => {
    const localResource = {links: [{rel: 'self', href: uri}]};
    return makeLinkedRepresentation(options, Object.assign(localResource, defaultValues));
};

/**
 * Make a new, sparsely populated {@link CollectionRepresentation} potentially with {@link State}
 *
 * @param {SparseResourceOptions} options
 * @param {?*} defaultValues
 * @param {?[{rel:string,href:string,title:string}]}defaultItems
 * @return {CollectionRepresentation}
 */
export const makeCollection = <T extends CollectionRepresentation>(
    options: SparseResourceOptions,
    defaultValues: any,
    defaultItems = []) => {
    return makeLinkedRepresentation(options, Object.assign({items: defaultItems}, defaultValues));
};

/**
 * Make a new, sparsely populated {@link CollectionRepresentation} potentially with {@link State} and
 * link relation 'self' populated with from given uri
 *
 * @param {string} uri
 * @param {SparseResourceOptions} options
 * @param {?*} defaultValues
 * @return {CollectionRepresentation}
 */
export const makeCollectionFromUri = (uri: Uri, options: SparseResourceOptions, defaultValues?:any) => {
    return makeFromUri(uri, options, Object.assign({items: []}, defaultValues));
};

/**
 * Given a feed item (an item from a list of 'things') create a local linked representation resource.
 * This is the first stage at hydrating (state synchronisation) a remote resource locally.
 *
 * @param {FeedItemRepresentation} feedItem The item from the list
 * @param {string=} resourceTitleAttributeName=name an option name for the title from the feed (e.g. 'name')
 * @param {SparseResourceOptions} options
 * @param {?*} defaultValues default values to populate the locate representation of the resource with
 * @return {LinkedRepresentation}
 */
export const makeResourceFromFeedItem = <T extends LinkedRepresentation>(
    feedItem: FeedItemRepresentation,
    resourceTitleAttributeName: string,
    options: SparseResourceOptions,
    defaultValues: any): T => {
    const localResource = makeFromFeedItem(feedItem, resourceTitleAttributeName);
    return makeLinkedRepresentation(options, Object.assign(localResource, defaultValues));
};

/**
 * All items provided as a feedItems are transformed into sparse resources.
 *
 * @param {CollectionRepresentation} collection
 * @param {string} resourceTitleAttributeName an option name for where the title from the feed
 *    item should be mapped to a {@link LinkedRepresentation}
 * @param {CacheOptions} options
 * @return {CollectionRepresentation}
 */
export const makeCollectionItemsFromFeedItems = <T extends CollectionRepresentation>(
    collection: T,
    resourceTitleAttributeName: string,
    options: CacheOptions = {}) => {
    const items = _(collection.items).map((item: LinkedRepresentation) => makeResourceFromFeedItem(
        item, resourceTitleAttributeName, options));
    if (options.set) {
        options.set(collection, 'items', items);
    } else {
        collection.items = items;
    }
    return collection;
};

/*


/**
 * Make a new, sparsely populated {@link LinkedRepresentation} with {@link State} and
 * link relation 'self' populated with from given uri
 *
 * @param {string} uri
 * @param {*=} defaultValues
 * @param {stateFlagEnum=} state
 * @return {LinkedRepresentation}
 */
export const makeSparseResourceFromUri = (uri: Uri|undefined, defaultValues?: any, state?: Symbol) => {
    if (!uri) {
        state = StateEnum.virtual;
    }
    return makeFromUri(uri, makeSparseResourceOptions(state || StateEnum.locationOnly), defaultValues);
};

/**
 * Make a new, sparsely populated {@link CollectionRepresentation} with {@link State} and
 * link relation 'self' populated with from given uri
 *
 * @param {string} uri
 * @param {*=} defaultValues
 * @param {StateEnum=} state
 * @return {CollectionRepresentation}
 */
export const makeSparseCollectionResourceFromUri = (uri: Uri, defaultValues: any, state: Symbol) => {
    if (!uri) {
        state = StateEnum.virtual;
    }
    return makeCollectionFromUri(uri, makeSparseResourceOptions(state || StateEnum.locationOnly), defaultValues);
};

/**
 * Add a collection resource into the tree where the value is unknown (including the URI)
 *
 * @param {LinkedRepresentation} resource a parent resource container
 * @param {string} collectionResourceName
 * @param {LinkedRepresentation=} defaultValues optional default values for the resource
 * @param {CacheOptions} options
 * @return {CollectionRepresentation}
 */
export const makeUnknownCollectionAddedToResource = (
    resource: LinkedRepresentation,
    collectionResourceName: string,
    defaultValues: any,
    options: CacheOptions = {}) => {
    return (resource => State.get(resource))(resource)
        .addCollectionResourceByName(resource, collectionResourceName, () => makeCollection(makeSparseResourceOptions(StateEnum.unknown), defaultValues), options);
};

/**
 * Add a resource into a collection in the tree where the value is unknown (including the URI)
 *
 * @param {CollectionRepresentation} collection
 * @param {LinkedRepresentation=} defaultValues optional default values for the resource
 * @return {LinkedRepresentation}
 */
export const makeUnknownResourceAddedToCollection = <T extends LinkedRepresentation>(
    collection: CollectionRepresentation, defaultValues: any): T => {
    return State.makeItemToCollectionResource(
        collection,
        () => makeCollection(makeSparseResourceOptions(StateEnum.unknown), defaultValues));
};


/**
 * Add a resource into the tree where the value is unknown (including the URI)
 *
 * @param {LinkedRepresentation} resource the parent resource that will act as the container
 *   for the named child resource.
 * @param {string} resourceName the name of the child resource in the container
 * @param {LinkedRepresentation=} defaultValues optional default values for the resource
 * @param {CacheOptions} options
 * @return {LinkedRepresentation} resource existing as a child
 */
export const makeUnknownResourceAddedToResource = <T extends LinkedRepresentation>(
    resource: LinkedRepresentation,
    resourceName: string, defaultValues: any,
    options: CacheOptions = {}): T => {
    return (resource => State.get(resource))(resource)
        .addResourceByName(resource, resourceName, () => makeLinkedRepresentation(makeSparseResourceOptions(StateEnum.unknown), defaultValues), options);
};


/**
 *
 * @param {CollectionRepresentation} collection
 * @param {string} resourceUri
 * @param {*} defaultValues
 * @return {*|LinkedRepresentation}
 */
export const makeResourceFromUriAddedToCollection = <T extends LinkedRepresentation>(collection: CollectionRepresentation, resourceUri: Uri, defaultValues: any): T => {
    return State.makeItemToCollectionResource(
        collection,
        () => makeSparseResourceFromUri(resourceUri, defaultValues));
};

/**
 *
 * @param {CollectionRepresentation} collection
 * @param {string[]} uriList
 * @return {CollectionRepresentation}
 */
export const makeCollectionItemsFromUriListAddedToCollection = <T extends CollectionRepresentation>(
    collection:T,
    uriList:Uri[]):T => {
    const resourceState = (resource => State.get(resource))(collection);
    uriList.forEach(resourceUri =>
        resourceState.addItemToCollectionResource(collection, () => makeSparseResourceFromUri(resourceUri)));
    return collection;
};


/**
 * Add a resource into a collection in the tree where the value is known (including the URI)
 *
 * @param {CollectionRepresentation} collection
 * @param {string} resourceUri
 * @param {LinkedRepresentation=} defaultValues optional default values for the resource
 * @return {LinkedRepresentation}
 * @obsolete
 */
export function makeCollectionResourceItemByUri<T extends LinkedRepresentation>(
    collection: CollectionRepresentation,
    resourceUri: Uri,
    defaultValues?: any): T {
    return State.makeItemToCollectionResource(
        collection,
        () => makeSparseResourceFromUri(resourceUri, defaultValues));
}


/**
 * Takes a feed representation and converts to a sparse collection representation
 *
 * @param {CollectionRepresentation} collection
 * @param {FeedRepresentation} feedRepresentation
 * @return {CollectionRepresentation}
 */
export const makeCollectionItemsFromFeedAddedToCollection = <T extends CollectionRepresentation>(
    collection: T,
    feedRepresentation: FeedRepresentation): T => {
    feedRepresentation.items.forEach(item => makeCollectionResourceItemByUri(
        collection, item.id, {name: item.title}));
    return collection;
};

/**
 * Adds a, or uses an existing, named collection on resource and then adds items into the collection based on a uri list
 *
 * @param {LinkedRepresentation} resource
 * @param {string} collectionResourceName
 * @param {string} collectionUri
 * @param {string[]} itemsUriList
 * @param {StateEnum} state
 * @param {CacheOptions} options
 * @return {LinkedRepresentation}
 */
export const makeNamedCollectionFromUriAndResourceFromUriList = (
    resource: LinkedRepresentation,
    collectionResourceName: string,
    collectionUri: Uri,
    itemsUriList: Uri[],
    state: Symbol,
    options: CacheOptions = {}) => {
    let collection = (resource => State.get(resource))(resource)
        .addCollectionResourceByName(resource, collectionResourceName, () => {
            if (!collectionUri) {
                state = StateEnum.virtual;
            }
            return makeCollectionFromUri(collectionUri, makeSparseResourceOptions(state || StateEnum.locationOnly));
        }, options);

    // only add items not currently loaded
    _(itemsUriList).each((uri:Uri) => makeCollectionResourceItemByUri(collection, uri));
    return collection;
};

/**
 * Add a singleton list (array) of sparse LinkedRepresentations based on an attribute that has a uriList.
 * @param {LinkedRepresentation} resource
 * @param {string} singletonName
 * @param {string} itemsUriListName
 * @return {Promise} contains an array of sparsely populated resources
 */
export const makeSingletonSparseListFromAttributeUriList = <T extends LinkedRepresentation>(
    resource: LinkedRepresentation,
    singletonName: string,
    itemsUriListName: string): Promise<T[]> => {
    return State.get(resource)
        .then((resource:State) => {

            if (!resource[singletonName]) {
                makeUnknownCollectionAddedToResource(resource, singletonName);
            }

            _(resource[itemsUriListName]).map(uri => {
                if (!resource[singletonName].items.find(item => link.getUri(item, /canonical|self/) === uri)) {
                    resource[singletonName].items.splice(resource[singletonName].length, 0, makeSparseResourceFromUri(uri));
                }
            });

            return resource[singletonName];
        });
};

/**
 * Add a singleton sparse LinkedRepresentations based on an uri.
 * @param {LinkedRepresentation} resource
 * @param {string} singletonName
 * @param {string} uri
 * @param {CacheOptions} options
 * @return {Promise} contains an array of populated resources
 */
export const makeSingletonSparseFromUri = (resource, singletonName, uri, options) => {
    return State.get(resource)
        .then(resource => {

            if (!resource[singletonName]) {
                if (options.set) {
                    options.set(resource, singletonName, makeSparseResourceFromUri(uri));
                } else {

                    resource[singletonName] = makeSparseResourceFromUri(uri);
                }
            }

            return resource[singletonName];
        });
};

