import _ from 'underscore';
import * as link from 'semantic-link';
import * as cache from '../cache';
import Differencer from './Differencer';
import axios from 'axios';
import {LinkedRepresentation, put, RelationshipType} from 'semantic-link';
import {uriMappingResolver} from './UriMappingResolver';
import {loader} from '../loader';
import {defaultResolver} from './syncResolver';
import {toUriListMimeTypeFormat} from '../utils/uri-list';
import {log} from "semantic-link/lib/logger";
import {CacheOptions, Representation, UriList} from "../interfaces";
import {defaultUriListResolver} from "../../lib/sync/syncUriList";
import {CollectionRepresentation} from "semantic-link/lib/interfaces";

/**
 * @type {UriListResolver}
 * Returns a array of uris from either uris or resources. Basically, this downgrades to uris from source representations.
 *
 * The default strategy is to look for 'self' link relation if it is a linked representation
 *
 * However, in most cases, you will need to write your own resolver, before synchronisation.
 *
 * @example
 *
 * In this example, the resolver the notifications collection also looks into the `question-item` link relation:
 *
 *  options = {
 *      ...options,
 *      uriListResolver: notificationCollection =>
 *          notificationCollection.items.map(item => this.link.getUri(item, /question-item/))
 *  };
 *
 *  getUriListOnNamedCollection(userResource, 'notifications', /notifications/, notificationUriList, options)
 *
 * @param {Representation|CollectionRepresentation} uriListOrResource
 * @return {UriList}
 * @private
 */
export  function defaultUriListResolver(uriListOrResource:Representation|CollectionRepresentation):UriList {

    if (uriListOrResource.items) {

        const uriList = [...uriListOrResource.items]
            .map(item => link.getUri(item, /self|canonical/))
            .filter(item => !!item);

        log.debug(`[Sync] Uri resolving resource items on 'self' [${uriList.join(',')}]`);
        return uriList;
    } else if (uriListOrResource.links) {
        const uri = link.getUri(uriListOrResource, /self|canonical/);
        log.debug(`[Sync] Uri resolving resource on 'self' ${uri}`);
        return [uri];
    } else {
        log.debug(`[Sync] Uri resolving default uri-list [${[uriListOrResource].join(',')}]`);
        // fallback to assuming is an array of uris
        return uriListOrResource;
    }
}

/**
 *
 * @param {CollectionRepresentation} collection
 * @param {UriList} documentUriList
 * @param {CacheOptions} options
 * @return {SyncInfoResult}
 * @private
 */
function synchroniseUriList(collection:CollectionRepresentation, documentUriList:UriList, options:CacheOptions = {}) {

    const uriListResolver = options.uriListResolver || defaultUriListResolver;

    // KLUDGE: for now inject uriMappingResolver for everyone. Gives a resolver without configuring up
    const resolver = options.resolver || uriMappingResolver || defaultResolver;

    /**
     *
     * uri-list resolvers
     *
     */

    const createUriListAndUpdateResolver = uriList => {
        return loader.submit(link.post, collection, /self/, 'text/uri-list', toUriListMimeTypeFormat(uriList))
            .then(response => {
                if (response.status === 201) {
                    const url = response.headers().location;
                    return loader.schedule(url, axios.get, url);
                } else {
                    return Promise.reject(new Error(`Unable to create resources '${uriList.join(',')}'`));
                }
            })
            .catch(response => {
                if (response.status === 415) {
                    log.info('Trying to create again');
                    return loader.submit(link.post, collection, /self/, 'application/json', uriList)
                        .then(response => {
                            if (response.status === 201) {
                                const url = response.headers().location;
                                log.debug(`[Sync] Created ${url}`);
                                return loader.schedule(url, axios.get, url);
                            } else {
                                return Promise.reject(new Error(`Unable to create resources '${uriList.join(',')}'`));
                            }
                        })
                        .catch(() => Promise.reject(new Error(`Unable to create resources '${uriList.join(',')}'`)));
                } else {
                    return Promise.reject(new Error(`Unable to create resources '${uriList.join(',')}'`));
                }
            })
            .then(response => {

                // iterate through the result list and match on the index for url resolution
                // we are assuming that order is matched in the result
                if (response.data.items) {
                    response.data.items.forEach((item, i) => {
                        resolver.add(
                            uriList[i],
                            item.id
                        );
                    });
                } else {
                    log.error(`[Sync] Ill formed representation on GET '${response.config.url}'`);
                }
                return uriList;
            });
    };

    const deleteUriListAndUpdateResolver = uriList => {
        return loader.submit(link.delete, collection, /self/, 'text/uri-list', toUriListMimeTypeFormat(uriList))
            .then(response => {

                if (response.status === 200 || response.status === 204) {
                    _(uriList).each(uri => {
                        resolver.remove(uri);
                    });
                } else {
                    log.error(`[Sync] Unable to DELETE resources  '${uriList.join(',')}'`);
                }
                return uriList;
            })
            .catch(response => {
                if (response.status === 415) {
                    log.info('Trying to delete again');
                    return loader.submit(link.delete, collection, /self/, 'application/json', uriList)
                        .then(response => {

                            if (response.status === 200 || response.status === 204) {
                                log.debug('[Sync] Deleted');

                                _(uriList).each(uri => {
                                    resolver.remove(uri);
                                });
                            } else {
                                log.error(`[Sync] Unable to DELETE resources  '${uriList.join(',')}'`);
                            }
                            return uriList;
                        });
                }
            });

    };

    const resourceUriList = uriListResolver(collection);

    if (options.contributeonly) {

        log.debug(`[Sync] uri-list is contribute-only: [${resourceUriList.join(',')}]`);
        throw new Error('Not implemented');
    }
    // If the caller has signalled that the collection is read-only, or the collection
    // if missing a 'create-form' representation then we assume that the NOD can
    // not be changed.
    else if (options.readonly) {

        log.debug('[Sync] uri-list is read-only: ');

        throw new Error('Not implemented');

    } else {
        log.debug(`[Sync] uri-list is updateable: [${[resourceUriList].join(',')}]`);
        const opts = {
            ...options,
            ...{
                createStrategy: createUriListAndUpdateResolver,
                updateStrategy: () => [],
                deleteStrategy: deleteUriListAndUpdateResolver
            }
        };
        return Differencer.diffUriList(resourceUriList, documentUriList, opts);
    }

}

/**
 * Retrieves a uri-list from a named collection on a resource, uses the uriListResolver to convert from
 * items in the collection (if necessary) and then synchronises with the provided uri-list (array of strings).
 *
 * @param {LinkedRepresentation} parentResource
 * @param {string} uriListName
 * @param {RelationshipType} uriListRel
 * @param {UriList} uriList
 * @param {CacheOptions} options
 * @return {Promise.<CollectionRepresentation>} containing the collection resource and items {@link LinkedRepresentation} but not resolved uri-list items
 */
export function getUriListOnNamedCollection(
    parentResource:LinkedRepresentation,
    uriListName:string,
    uriListRel:RelationshipType,
    uriList:UriList,
    options:CacheOptions = {}):Promise<CollectionRepresentation> {

    log.debug(`[Sync] uriList '${uriListName}' on ${link.getUri(parentResource, /self/)}`);

    return cache
        .getResource(parentResource)
        .then(resource => cache
            .tryGetNamedCollection(resource, uriListName, uriListRel, options)
            .then(collection => {
                if (!collection) {
                    log.info(`[Sync] No update: uri-list '${uriListName}' not found on ${link.getUri(parentResource, /self/)}`);
                    return Promise.resolve(undefined);
                } else {

                    return synchroniseUriList(collection, uriList, options)
                    // note discarding synch infos (not sure why)
                        .then(() => {
                            options = {...options, forceLoad: true};
                            return cache.getCollectionAndItems(collection, options);
                        });
                }
            }));
}

/**
 * Retrieves a uri-list from a named collection on a resource, uses the uriListResolver to resolve
 * items in the collection (if necessary) and then PUTs the provided uri-list back on the collection.
 *
 * @param {LinkedRepresentation} parentResource
 * @param {string} uriListName
 * @param {RelationshipType} uriListRel
 * @param {UriList} uriList
 * @param {CacheOptions} options
 * @return {Promise.<CollectionRepresentation>} containing the collection resource and items {@link LinkedRepresentation} but not resolved uri-list items
 */
export function patchUriListOnNamedCollection(
    parentResource:LinkedRepresentation,
    uriListName:string,
    uriListRel:RelationshipType,
    uriList:UriList,
    options:CacheOptions = {}) {

    log.debug(`[Sync] uriList '${uriListName}' on ${link.getUri(parentResource, /self/)} [${[uriList].join(',')}]`);
    return cache
        .getResource(parentResource)
        .then(resource => cache
            .tryGetNamedCollection(resource, uriListName, uriListRel, options)
            .then(collection => {
                if (!collection) {
                    log.info(`[Sync] No update: uri-list '${uriListName}' not found on ${link.getUri(parentResource, /self/)}`);
                    return Promise.resolve(undefined);
                } else {
                    // make all the necessary changes to create and remove individual uri
                    return synchroniseUriList(collection, uriList, options)
                        .then(() => {
                            // now make it so and the server should pay nicely and accept all the changes
                            log.debug('[Sync] update collection with uri-list');
                            return cache
                                .getSingleton(collection, 'editForm', /edit-form/, options)
                                .then(form => put(form, /submit/, 'text/uri-list', uriList.join('\n')));
                        })
                        .then(() => cache.getCollectionAndItems(collection, {...options, ...{forceLoad: true}}));
                }
            }));
}

export function patchUriList(
    collection,
    uriList,
    options = {}) {

    log.debug(`[Sync] uriList on ${link.getUri(collection, /self/)} [${[uriList].join(',')}]`);
    return cache
        .getResource(collection)
        .then(collection => {
            if (!collection) {
                log.info(`[Sync] No update: uri-list '${uriListName}' not found on ${link.getUri(collection, /self/)}`);
                return Promise.resolve(undefined);
            } else {
                // make all the necessary changes to create and remove individual uri
                return synchroniseUriList(collection, uriList, options)
                    .then(() => {
                        // now make it so and the server should pay nicely and accept all the changes
                        log.debug('[Sync] update collection with uri-list');
                        return cache
                            .getSingleton(collection, 'editForm', /edit-form/, options)
                            .then(form => put(form, /submit/, 'text/uri-list', uriList.join('\n')));
                    })
                    .then(() => cache.getCollectionAndItems(collection, {...options, ...{forceLoad: true}}));
            }
        });
}

