/* global JSON */

import _ from 'underscore';
import StateEnum from './StateEnum';
import * as SparseResource from './sparseResource';
import {log} from '..';
import * as link from 'semantic-link';
import {
    Cancellable,
    CollectionRepresentation,
    FeedRepresentation,
    LinkedRepresentation,
    RelationshipType,
    Uri
} from 'semantic-link';
import {loader} from '../loader/Loader';
import {findResourceInCollection, findResourceInCollectionByRelOrAttribute} from '../utils/collection';
import {CacheOptions} from "../interfaces";

const stateFlagName = Symbol('state');

type States = { [state]: State };

/**
 * The state of a representation.
 *
 * This is an internal state that we are going to use to management the synchronisation between the
 * in-memory representation and the server.
 *
 */
export default class State {

    /**
     *
     * @param {StateEnum} defaultStatus
     */
    constructor(defaultStatus) {
        /**
         * @type {StateEnum}
         * @default {@link StateEnum.unknown}
         */
        this.status = defaultStatus || StateEnum.unknown;

        this.previousStatus = undefined;

        /**
         * List of the named singleton resource which have been onto the resource (network of data)
         * @type {string[]}
         */
        this.resources = [];

        /**
         * List of named collections which have been added onto the resource (network of data)
         * @type {string[]}
         */
        this.collection = [];

        /**
         * Header meta data from the across-the-wire response
         * @type {*}
         */
        this.headers = {};

        /**
         * Time when the resource was last retrieved
         * @type {Date}
         */
        this.retrieved = undefined;

        /**
         * Mapped title when creating sparse resources from feed items
         */
        this.mappedTitle = undefined;
    }

    /**
     * Make a state object ready to be added to a resource and ensuring that {@link stateFlagName}
     * keys the object.
     *
     * This is a helper function because we can't simply add the {@link State}
     * object onto the resource using the object literal notation
     *
     * @param {StateEnum=} state
     * @return {{[state]: State}}
     */
    static make(state: StateEnum): States {
        return {
            [stateFlagName]: new State(state)
        };
    }

    /**
     * Get the state object on a resource
     * @param {*} resource
     * @return {State}
     * @throws
     */
    static get(resource: any): State {
        if (!resource) {
            throw new Error('No resource to find state on');
        }

        if (!resource[stateFlagName]) {
            const hrefOrActual = link.getUri(resource, /self|canonical/) || State.toJson(resource);
            throw new Error(`No state found on resource '${hrefOrActual}'`);
        }

        return resource[stateFlagName];
    }

    /**
     * Get the state object on a resource and return the default value (undefined) if not found
     * @param {*} resource
     * @param {*=undefined} defaultValue
     * @return {State|*|undefined}
     */
    static tryGet(resource, defaultValue = undefined): State {
        if (!resource) {
            log.debug('[State] No resource using default');
            return defaultValue;
        }

        if (!resource[stateFlagName]) {
            log.debug('[State] No state on resource using default');
            return defaultValue;
        }

        return resource[stateFlagName];
    }

    /**
     * Takes the state object off the object (if exists)
     * @param {*} resource
     * @return {*}
     */
    static delete(resource) {
        if (resource) {
            delete resource[stateFlagName];
        }
        return resource;
    }

    /**
     * Checks the resource is currently tracked as a resource
     * @param {string} resourceName
     * @return {boolean}
     * @private
     */
    resourceExists(resourceName): boolean {
        return this.resources.includes(resourceName);
    }

    /**
     * Checks the resource is currently tracked as a collection
     * @param {string} collectionResourceName
     * @return {boolean}
     * @private
     */
    collectionExists(collectionResourceName): boolean {
        return this.collection.includes(collectionResourceName);
    }

    /**
     * Checks the resource is currently tracked in either a resource or a collection
     * @param {string} resourceName
     * @return {boolean}
     */
    isTracked(resourceName): boolean {
        return this.resourceExists(resourceName) || this.collectionExists(resourceName);
    }

    /**
     * Simple cache bust strategy which is an override switch. To be expanded as needed. Currently, only
     * cache bust on {@link StateEnum.hydrated} resources. There is no time-based, refresh st
     * @param {StateEnum} status
     * @param {CacheOptions} options
     * @return boolean
     * @private
     */
    static cacheBust(status, options): boolean {
        return options.forceLoad && this.status === StateEnum.hydrated;
    }

    /**
     * Checks whether or not the resource requires an across-the-wire fetch.
     *
     * We can only do a fetch when we actually have a potentially valid uri and that we haven't already
     * got the resource. Currently, the forceLoad allows an override which is an initial cache busting
     * strategy that will need improvement
     *
     * @param {StateEnum} status
     * @param {CacheOptions} options
     * @return boolean
     * @private
     */
    static needsFetch(status, options): boolean {
        return status === StateEnum.unknown ||
            status === StateEnum.locationOnly ||
            status === StateEnum.stale ||
            State.cacheBust(status, options);
    }

    static defaultPostFactory(resource, data, mediaType) {
        return link.post(resource, /canonical|self/, mediaType, data);
    }

    /**
     * Updates a resource across the wire
     * @param {LinkedRepresentation} resource
     * @param {*} data
     * @param mediaType
     */
    static defaultPutFactory(resource: LinkedRepresentation, data, mediaType) {
        return link.put(resource, /canonical|self/, mediaType, data);
    }

    /**
     * Returns the value of the private status flag
     * @return {StateEnum}
     */
    getStatus(): StateEnum {
        return this.status;
    }

    /**
     * Add a singleton resource to an existing (@link LinkedRepresentation} by attribute name on the passed
     * in resource.
     *
     * @param {LinkedRepresentation} resource
     * @param {string} resourceName
     * @param {Function} linkedRepresentationFactory
     * @param {CacheOptions=} options
     * @return {LinkedRepresentation} newly created resource
     */
    addResourceByName<T extends LinkedRepresentation>(
        resource: LinkedRepresentation,
        resourceName: string,
        linkedRepresentationFactory: () => T,
        options = {}): T {

        if (this.resourceExists(resourceName) && resource[resourceName]) {
            return resource[resourceName];
        }

        if (!this.resourceExists(resourceName) && !resource[resourceName]) {
            this.resources.push(resourceName);
            const representation = linkedRepresentationFactory() || State.makeLinkedRepresentationWithState();
            if (options.set) {
                options.set(resource, resourceName, representation);
            } else {
                resource[resourceName] = representation;
            }
            return resource[resourceName];
        }

        log.warn(`[State] Trying to add an existing resource of '${resourceName}'`);
        return resource[resourceName];
    }

    /**
     * Add a collection resource to an existing (@link LinkedRepresentation} by attribute name on the passed
     * in resource.
     *
     * @param {LinkedRepresentation} resource
     * @param {string} collectionResourceName
     * @param {Function} linkedRepresentationFactory
     * @return {CollectionRepresentation} newly created resource
     */
    addCollectionResourceByName<T extends CollectionRepresentation>(
        resource: LinkedRepresentation,
        collectionResourceName: string,
        linkedRepresentationFactory: () => T,
        options = {}): T {
        if (this.collectionExists(collectionResourceName) && resource[collectionResourceName]) {
            return resource[collectionResourceName];
        }

        if (!this.collectionExists(collectionResourceName) && !resource[collectionResourceName]) {
            this.collection.push(collectionResourceName);

            const representation = linkedRepresentationFactory() || State.makeCollection();
            if (options.set) {
                options.set(resource, collectionResourceName, representation);
            } else {
                resource[collectionResourceName] = representation;
            }
            return resource[collectionResourceName];
        }

        log.warn('Trying to add an existing collection resource of ', collectionResourceName);
        return resource[collectionResourceName];
    }

    /**
     * Add a new representation to the {@link CollectionRepresentation}
     *
     * @param {CollectionRepresentation} collection
     * @param {Function} linkedRepresentationFactory
     * @return {LinkedRepresentation}
     */
    static makeItemToCollectionResource<T extends LinkedRepresentation>(
        collection: CollectionRepresentation,
        linkedRepresentationFactory: () => T): T {

        if (!collection) {
            throw new Error('No collection passed in');
        }
        if (!collection.items) {
            throw new Error('No items found on managed collection');
        }
        const representation = linkedRepresentationFactory();

        // only add to the collection if it doesn't already exist
        if (!findResourceInCollection(collection, representation)) {
            // push causes no problems for reactive bindings
            collection.items.push(representation);
        } else {
            log.info(`Resource ${link.getUri(representation, /self/)} already exists in collection ${link.getUri(collection, /self/)}`);
        }
        return representation;
    }

    /**
     * Removes the item from the collection by matching its URI. If not found, it returns undefined.
     * If an items is removed from a collection, it is marked as 'stale'
     *
     * @param collection
     * @param item
     * @return {*|LinkedRepresentation} undefined if not found otherwise the removed resource
     */
    removeItemFromCollectionResource(collection, item) {
        const resourceUri = link.getUri(item, /canonical|self/);
        const indexOfItemToBeRemoved = _(collection.items).findIndex(
            item => link.getUri(item, /canonical|self/) === resourceUri);
        if (indexOfItemToBeRemoved >= 0) {
            this.status = StateEnum.stale;
            // splice causes no problems for reactive bindings
            return _(collection.items.splice(indexOfItemToBeRemoved, 1)).first();
        }
        return undefined;
    }

    /**
     * Updates a previous {@link LinkedRepresentation} resource with a new one
     *
     * @param {LinkedRepresentation} resource
     * @param {object|LinkedRepresentation} updateValues
     * @param {CacheOptions} options
     * @return {LinkedRepresentation}
     * see {@link ResourceMerger}
     */
    static mergeResource<T extends LinkedRepresentation>(
        resource: T,
        updateValues: LinkedRepresentation | object,
        options: CacheOptions = {}): T {
        if (options.set) {
            // iterate through each property so that observer can be registered
            for (const key in updateValues) {
                options.set(resource, key, updateValues[key]);
            }
            return resource;
        } else {
            return Object.assign(resource, updateValues);
        }
    }

    /**
     *
     * @param {StateEnum} state
     * @return {SparseResourceOptions}
     */
    static makeSparseResourceOptions(state:Symbol) {
        return {
            stateFactory: () => State.make(state)
        };
    }

    /**
     * Make a new, sparsely populated {@link LinkedRepresentation} with {@link State}.
     * @param {*=} defaultValues
     * @param {StateEnum=} state
     * @return {LinkedRepresentation}
     */
    static makeLinkedRepresentationWithState(defaultValues, state:Symbol) {
        return SparseResource.makeLinkedRepresentation(State.makeSparseResourceOptions(
            state || StateEnum.unknown),
            defaultValues);
    }

    /**
     * Make a new, sparsely populated {@link CollectionRepresentation} with {@link State}.
     *
     * This means that there is at least an empty `items` attribute.
     *
     * @param {*=} defaultValues
     * @param {StateEnum=} state
     * @return {CollectionRepresentation}
     */
    static makeCollection<T extends CollectionRepresentation>(defaultValues, state): T {
        return SparseResource.makeCollection(State.makeSparseResourceOptions(state || StateEnum.unknown), defaultValues);
    }

    /**
     * Make a new, sparsely populated {@link LinkedRepresentation} with {@link State} and
     * link relation 'self' populated with from given uri. If the uri is empty then
     * this is a client-side resource (marked by the state 'virtual'
     *
     * @param {string} uri
     * @param {*=} defaultValues
     * @param {StateEnum=} state
     * @return {LinkedRepresentation}
     */
    static makeFromUri<T extends LinkedRepresentation>(uri: Uri, defaultValues, state: StateEnum): T {
        if (uri) {
            return SparseResource.makeFromUri(
                uri,
                State.makeSparseResourceOptions(state || StateEnum.locationOnly),
                defaultValues);
        } else {
            return SparseResource.makeFromUri(uri, State.makeSparseResourceOptions(StateEnum.virtual), defaultValues);
        }
    }

    /**
     * Make a new, sparsely populated {@link CollectionRepresentation} with {@link State} and one of two situation:
     *
     * 1. link relation 'self' populated with from given uri and an empty items list
     * 2. link relation 'self' unknown (virtual resource) with a sparsely populated items list
     *
     * @param {string|[{rel:string,href:string,title:string}]} uriOrLinkRelation uri or an array or link relations
     * @param {*=} defaultValues
     * @param {StateEnum=} state
     * @return {CollectionRepresentation}
     */
    static makeCollectionFromUri<T extends CollectionRepresentation>(uriOrLinkRelation, defaultValues, state): T {
        let options = State.makeSparseResourceOptions(state || StateEnum.locationOnly);

        if (_(uriOrLinkRelation).isString() || !uriOrLinkRelation) {
            return SparseResource.makeCollectionFromUri(uriOrLinkRelation, options, defaultValues);
        } else {
            return SparseResource.makeCollection(options, {}, uriOrLinkRelation);
        }
    }

    /**
     * All items provided as a feedItems are transformed into sparse resources.
     *
     * @param {CollectionRepresentation} collection
     * @param {?string} resourceTitleAttributeName an option name for where the title from the feed
     *    item should be mapped to a {@link LinkedRepresentation}
     * @param state
     * @param options
     * @return {CollectionRepresentation}
     */
    makeSparseCollectionItemsFromFeed<T extends CollectionRepresentation>(
        collection: T,
        resourceTitleAttributeName,
        state = StateEnum.locationOnly, options = {}): T {
        this.mappedTitle = resourceTitleAttributeName;
        return SparseResource.makeCollectionItemsFromFeedItems(
            collection,
            resourceTitleAttributeName,
            State.makeSparseResourceOptions(state || StateEnum.locationOnly),
            options);
    }

    /**
     *
     * @param {LinkedRepresentation} item
     * @param {string|RegExp} rel
     * @param cancellable
     * @return {Promise}
     * @private
     */
    static defaultGetFactory<T extends LinkedRepresentation>(
        item: T,
        rel: RelationshipType,
        cancellable: Cancellable): Promise<T> {
        return link.get(item, rel, cancellable);
    }

    /**
     *
     * @param {LinkedRepresentation} resource
     * @param {string|RegExp} rel
     * @param {CacheOptions|{}} options
     * @return {Promise.<LinkedRepresentation>} promise contains a {@link LinkedRepresentation}
     */
    loadResource<T extends LinkedRepresentation>(
        resource: T,
        rel: RelationshipType,
        options: CacheOptions = {}): Promise<T> {

        // TODO Promise.reject need to all return Errors. Error may need to be subclassed
        // TODO Need to hook messages into the loader
        // TODO Load centre is not taking in options to get different priority requests
        // TODO no checking of retrieval based on headers and previous requests
        // TODO no media type

        const uri = (options.getUri || link.getUri)(resource, rel);

        // uri may be undefined on a link.getUri
        if (!uri || this.status === StateEnum.virtual) {
            log.info(`Resource is client-side only and will not be fetched ${uri} ${this.status.toString()}`);
            return Promise.resolve(resource);
        } else if (this.status === StateEnum.deleted || this.status === StateEnum.deleteInProgress) {
            return Promise.reject(`Resource is deleted ${uri}`);
        } else if (this.status === StateEnum.forbidden) {
            // TODO: enhance forbidden strategy as needed currently assumes forbidden access doesn't change per session
            log.info(`[State] Resource is already forbidden and will not be fetched ${uri}`);
            return Promise.resolve(resource);
        }

        const getFactory = options.getFactory || State.defaultGetFactory;

        let id = link.getUri(resource, rel);

        return loader.schedule(id, getFactory, resource, rel)
            .then(response => {

                if (response) {
                    // how was it retrieved
                    this.headers = response.headers;
                    // save the across-the-wire meta data so we can check for collisions/staleness
                    this.status = StateEnum.hydrated;

                    // when was it retrieved
                    this.retrieved = new Date();

                    return response.data;
                } else {
                    throw new Error(`[State] response empty on ${id}`);
                }
            })
            .catch(/** @type {Error|BottleneckError|AxiosError} */err => {

                // TODO: add catching Bottleneck error handling
                // TODO: add error instanceof handling
                // @see https://github.com/SGrondin/bottleneck#debugging-your-application

                if (err.status === 403) {
                    log.debug(`[State] Request forbidden ${err.status} ${err.statusText} '${uri}'`);
                    // save the across-the-wire meta data so we can check for collisions/staleness
                    this.status = StateEnum.forbidden;
                    // when was it retrieved
                    this.retrieved = new Date();
                    // how was it retrieved
                    this.headers = err.headers;
                    /**
                     * On a forbidden resource we are going to let the decision of what to do with
                     * it lie at the application level. So we'll set the state, etc and return the
                     * resource. This means that the application needs to check if it is {@link StateEnum.forbidden}
                     * and decide whether to remove (from say the set, or in the UI dim the item).
                     */
                    return Promise.resolve(resource);
                } else if (err.status === 404) {
                    log.info(`[State] Likely stale collection for '${link.getUri(resource, ['up', 'parent', 'self', '*'])}' on resource ${uri}`);
                    this.status = StateEnum.deleted;
                    return Promise.reject(resource);
                } else if (err.status >= 400 && err.status < 499) {
                    log.info(`[State] Client error '${err.statusText}' on resource ${uri}`);
                    this.status = StateEnum.unknown;
                    return Promise.resolve(resource);
                } else if (err.status >= 500 && err.status < 599) {
                    log.info(`[State] Server error '${err.statusText}' on resource ${uri}`);
                    this.status = StateEnum.unknown;
                    return Promise.resolve(resource);
                } else {
                    log.error(`[State] Request error: '${err.message}'}`);
                    log.debug(err.stack);
                    this.status = StateEnum.unknown;
                    /**
                     * We really don't know what is happening here. But allow the application
                     * to continue.
                     */
                    return Promise.resolve(resource);
                }
            });
    }

    /**
     * Ensures the in-memory resource is up-to-date with the server. Synchronising needs to
     * occur within the context of this {@link State} object so that {@link State.status} flag of
     * the to-be-retrieved resource is in context.
     *
     * @param {LinkedRepresentation} resource
     * @param {string|RegExp} rel the link relation name
     * @param {CacheOptions|{}} options
     * @return {Promise<LinkedRepresentation>} promise contains a {@link LinkedRepresentation}, which could be a {@link FeedRepresentation}
     */
    synchronise<T extends LinkedRepresentation>(
        resource: T,
        rel: RelationshipType,
        options: CacheOptions = {}): Promise<T> {
        if (State.needsFetch(this.status, options)) {
            log.debug(`[State] Fetch resource ${this.status.toString()}: '${link.getUri(resource, rel)}'`);
            return this.loadResource(resource, rel, options)
                .then(response => State.mergeResource(resource, response, options));
        } else {
            log.debug(`[State] Fetch cached resource ${this.status.toString()}: '${link.getUri(resource, rel)}'`);
            return Promise.resolve(resource);
        }
    }

    /**
     * Ensures the in-memory collection resource and its items are up-to-date with the server with
     * the number of items matching and all items at least sparsely populated.
     *
     * @param {CollectionRepresentation|FeedRepresentation} collection
     * @param {string|RegExp} rel
     * @param {CacheOptions|{}} options
     * @return {Promise<CollectionRepresentation>}
     */
    synchroniseOnCollection<T extends CollectionRepresentation>(
        collection: T | FeedRepresentation,
        rel: RelationshipType,
        options: CacheOptions = {}): Promise<T> {
        if (State.needsFetch(this.status, options)) {
            log.debug(`[State] Fetch collection ${this.status.toString()}: '${link.getUri(collection, rel)}'`);
            return this.loadResource(collection, rel, options)
                .then(representation => {
                    //
                    return State.mergeResource(collection, representation, options);
                })
                .then(collection => {
                    // make into a sparsely populated collection
                    /*
                     * WARNING: here is where a resource state actually creates a resource with an attached
                     * resource state - this is where resource state needs the ability to factory up a resource
                     * and it creates the confusion in the code that wasn't solved with a good implementation
                     * of a factory injected from a above. One approach is to make this a class and it is available
                     * from the class scope, alternatively, hand in the factory as part of the options.
                     *
                     * Third option, push this functionality back up to the cache to where it probably belongs
                     * and hand through explicitly as a callback factory. See {@links this.addResourceByName} below
                     */
                    return this.makeSparseCollectionItemsFromFeed(collection, options.mappedTitle, undefined, options);
                });
        } else {
            log.debug(`[State] Fetch cached collection ${this.status.toString()}: '${link.getUri(collection, rel)}'`);
            // actually it is already loaded so return the resource (TODO: and not stale)
            return Promise.resolve(collection);
        }
    }

    /**
     * Ensures that resource with 'self' or 'canonical' is synchronised
     * @param {LinkedRepresentation} resource
     * @param {CacheOptions} options
     * @return {Promise} promise contains a {@link LinkedRepresentation}, which could be a {@link FeedRepresentation}
     */
    getResource<T extends LinkedRepresentation>(resource: T, options: CacheOptions): Promise<T> {
        return this.synchronise(resource, /self|canonical/, options);
    }

    /**
     * Ensures that resource from a link relation is synchronised as name attribute
     * @param {LinkedRepresentation} resource
     * @param {string} singletonName
     * @param {string|RegExp} rel the link relation name
     * @param {CacheOptions=} options
     * @return {Promise} promise contains new {@link LinkedRepresentation}, which could be a {@link FeedRepresentation}
     */
    makeSingletonResource(
        resource: LinkedRepresentation,
        singletonName: string,
        rel: RelationshipType,
        options: CacheOptions) {
        options = options || {};

        if (this.collectionExists(singletonName)) {
            throw new Error('Singleton cannot be created because it is already a collection');
        }

        if (!resource[singletonName]) {

            // look ahead to see if the link relation exists
            const uri = (options.getUri || link.getUri)(resource, rel, undefined);

            if (!uri) {
                log.warn(`[State] No ${singletonName} (${rel.toString()}) for resource ${link.getUri(resource, /self|canonical/)} returning default undefined`);
                return Promise.resolve(undefined);
            }

            log.debug(`[State] add singleton '${rel}' as ${this.status.toString()} '${uri}' on ${link.getUri(resource, /self|canonical/)}`);

            if (options.set) {
                options.set(resource, singletonName, this.addResourceByName(resource, singletonName, () => State.makeFromUri(uri), options));
            } else {
                // add a sparsely populated resource ready to be synchronised
                resource[singletonName] = this.addResourceByName(resource, singletonName, () => State.makeFromUri(uri), options);
            }
        }

        return Promise.resolve(resource[singletonName]);
    }

    /**
     * Ensures that a collection resource from a link relation is synchronised as a name
     * attribute with its items all to feedOnly state - ie words no across-the-wire fetches
     *
     * @param {LinkedRepresentation} resource
     * @param {string} collectionName
     * @param {string|RegExp} rel
     * @param {CacheOptions=} options
     * @return {Promise} promise contains a {@link CollectionRepresentation}
     */
    makeCollectionResource(
        resource: LinkedRepresentation,
        collectionName: string,
        rel: RelationshipType,
        options: CacheOptions = {}) {
        options = options || {};

        if (this.resourceExists(collectionName)) {
            throw new Error('Collection cannot be created because it is already a singleton');
        }

        if (!resource[collectionName]) {

            // look ahead to see if the link relation exists
            const uri = (options.getUri || link.getUri)(resource, rel, undefined);

            if (!uri) {
                log.info(`[State] No '${collectionName}' (${rel.toString()}) for resource ${link.getUri(resource, /self|canonical/)}`);
                return Promise.resolve(undefined);
            }

            // add a sparsely populated resource ready to be synchronised because it has the link relation
            this.addCollectionResourceByName(
                resource,
                collectionName,
                () => State.makeCollectionFromUri(uri),
                options);
        }

        if (!resource[collectionName]) {
            throw new Error('I\'m confused that it still has built a collection - remove this at a later date');
        }

        return Promise.resolve(resource[collectionName]);
    }

    /**
     * Locate by uri a single {@link LinkedRepresentation} item within the {@link CollectionRepresentation}
     *
     * @param {CollectionRepresentation} collection
     * @param {string} itemUri
     * @param {CacheOptions|{}} options
     * @return {Promise} promise contains a {@link LinkedRepresentation}, which could be a {@link FeedRepresentation}
     */
    makeItemOnCollectionResource<T extends LinkedRepresentation>(
        collection:CollectionRepresentation,
        itemUri:Uri,
        options :CacheOptions= {})  :Promise<T>{

        if (!collection.items) {
            log.error(`Collection not created through makeRepresentation ${link.getUri(collection, /self|canonical/)} - this is likely to be a coding error that the resource is not a collection`);
            collection.items = [];
        }

        let resource = findResourceInCollectionByRelOrAttribute(collection, itemUri, options.rel);

        if (!resource) {
            // we don't already know about this resource (but the client does), so so let's
            // add a sparsely populated resource ready to be synchronised
            resource = State.makeItemToCollectionResource(collection, () => State.makeFromUri(itemUri));
        }
        return Promise.resolve(resource);
    }

    /**
     * Ensures that a {@link CollectionRepresentation} from a link relation is synchronised as a name
     * attribute with its items all to feedOnly state - ie one call across the wire
     *
     * @param {LinkedRepresentation} resource
     * @param {CacheOptions|{}} options
     * @return {Promise} promise contains a {@link CollectionRepresentation}
     */
    getCollectionResource<T extends CollectionRepresentation>(
        resource: LinkedRepresentation,
        options: CacheOptions = {}) :Promise<T>{
        return this.synchroniseOnCollection(resource, /self|canonical/, options);
    }

    /**
     * Make an across-the-wire create of a resource. It is up to the calling code to manage whether how this
     * resource goes into the network of data. All the headers will get set on GET retrieval
     * @param resource
     * @param data
     * @param {CacheOptions} options
     * @return {Promise} containing created resource (@link LinkedRepresentation}
     */
    createResource(resource: LinkedRepresentation, data, options = {}) {


        let uri = link.getUri(resource, /self/);

        let postFactory = options.postFactory || State.defaultPostFactory;

        log.debug(`[State] start create resource ${uri}`);

        return loader.submit(postFactory, resource, data)
            .then(response => {

                const resourceUri = response.headers.location;
                if (!resourceUri) {
                    log.error(`[State] Create failed to return new resource location for ${uri} [${Object.keys(options).map(o => o).join(',')}]`);
                    return Promise.resolve(undefined);
                }
                return this.getResource(State.makeFromUri(resourceUri), options);
            })
            .catch(/** @type {Error|BottleneckError|AxiosError} */response => {

                // TODO: add catching Bottlneck error handling
                // @see https://github.com/SGrondin/bottleneck#debugging-your-application

                if (response.status === 403) {
                    log.info(`[State] Resource forbidden ${uri}`, options);
                } else if (response.status === 404 || response.status === 405) {
                    log.error(`[State] create returned not found '${response.status}' for create ${uri} [${Object.keys(options).map(o => o).join(',')}]`);
                } else {
                    // 500, 400, 409
                    let msg = `Error '${response.statusText}' (${response.status}) on create '${uri}':`;
                    return Promise.reject(msg);
                }
                return Promise.resolve(State.makeLinkedRepresentationWithState(resource));
            });

    }

    /**
     * Makes an across-the-wire update of a resource.
     * @param {LinkedRepresentation} resource
     * @param {*} data
     * @param {CacheOptions|{}} options
     * @return {Promise}  containing the original {@link LinkedRepresentation}
     */
    updateResource(resource: LinkedRepresentation, data, options = {}) {

        this.previousStatus = this.status;
        let uri = link.getUri(resource, /self/);

        let putFactory = options.putFactory || State.defaultPutFactory;

        const id = link.getUri(resource, /self/);
        log.debug(`[State] [PUT] ${id}`);

        return loader.submit(putFactory, resource, data)
            .then(response => {
                this.status = StateEnum.hydrated;
                this.retrieved = new Date();
                this.headers = response.headers;
                return State.mergeResource(resource, data, options);
            })
            .catch(response => {

                // TODO: add catching Bottlneck error handling
                // @see https://github.com/SGrondin/bottleneck#debugging-your-application

                if (response.status === 403) {
                    this.status = StateEnum.forbidden;
                } else if (response.status === 404 || response.status === 405) {
                    this.status = this.previousStatus;
                    log.info(`[State] Resource not found for update ${uri} [${Object.keys(options).map(o => o).join(',')}]`);
                } else {
                    // 500, 400, 409
                    let msg = `Error on update resource ${uri}: ${response.statusText} [${StateEnum.unknown.toString()}]`;
                    return Promise.reject(msg);
                }

                return Promise.resolve(resource);
            });

    }

    static defaultDeleteFactory(item) {
        return link.delete(item, /canonical|self/);
    }

    /**
     * Makes an across-the-wire deletion of a resource based on the state of the resource. It can resolve
     * response codes of 403, 404, 405, 20x (meaning that the calling code can remove the resource).
     * It rejects when receiving all other codes but in practice is a 50x or general 400.
     *
     * @param {LinkedRepresentation} item
     * @param {CacheOptions=} options
     * @return {Promise}  containing the original {@link LinkedRepresentation}
     */
    deleteResource(item: LinkedRepresentation, options: CacheOptions = {}) {

        this.previousStatus = this.status;

        let deleteFactory = options.deleteFactory || State.defaultDeleteFactory;

        let uri = link.getUri(item, /self/);

        if (this.status === StateEnum.feedOnly ||
            this.status === StateEnum.hydrated ||
            this.status === StateEnum.locationOnly || StateEnum) {
            this.status = StateEnum.deleteInProgress;
        } else if (this.status === StateEnum.deleteInProgress) {
            log.info(`[State] Delete already in progress ${uri}`);
            return Promise.resolve(item);
        } else if (this.status === StateEnum.virtual) {
            log.info(`[State] Virtual resources can just be removed ${uri}`);
            return Promise.resolve(item);
        } else if (StateEnum.deleted) {
            log.info(`[State] Already deleted, please remove from collection ${uri}`);
            return Promise.resolve(item);
        } else if (StateEnum.forbidden) {
            log.info(`[State] Forbidden access ${uri}`);
            return Promise.resolve(item);
        } else {
            log.warn(`Unexpected state on deletion ${uri}`);
        }

        return loader.submit(deleteFactory, item)
            .then(() => {
                this.status = StateEnum.deleted;
                log.info(`[State] Resource  for delete'${uri}' ${this.status.toString()} `);
                return item;
            })
            .catch(response => {

                // TODO: add catching Bottlneck error handling
                // @see https://github.com/SGrondin/bottleneck#debugging-your-application

                if (response.status === 403) {

                    this.status = StateEnum.forbidden;
                    log.debug(`Resource forbidden '${uri}' ${this.status.toString()}`);

                    return Promise.resolve(item);

                } else if (response.status === 404 || response.status === 405) {

                    this.status = this.previousStatus;
                    log.debug(`Resource not found ${uri} ${this.status.toString()} [${Object.keys(options).map(o => o).join(',')}]`);

                    return Promise.resolve(item);

                } else {
                    // 500, 400, 409
                    let msg = `Error '${response.statusText}' on delete resource ${uri} ${StateEnum.unknown.toString()}`;
                    return Promise.reject(msg);
                }

            });
    }


    /**
     * A replacer function to strip the state from a model
     * see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
     *
     * @param key
     * @param value
     * @return {*|undefined} undefined to keep the key
     */
    static ToJsonReplacer<T>(key: string, value: T): T | undefined {
        return key !== 'createForm' && key !== 'editForm' ? value : undefined;
    }

    /**
     * Returns a representation from a model that is already hydrated and looks close as possible to what
     * it looked like when it came over the wire. In this case, it removes the state attribute.
     *
     * @param {LinkedRepresentation} resource
     * @param {[Number|String]=} space number of spaces in the pretty print JSON
     * @return {string}
     */
    static toJson(resource: LinkedRepresentation, space: number | string): string {
        return JSON.stringify(resource, State.ToJsonReplacer, space);
    }
}

