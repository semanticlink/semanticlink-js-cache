import {findResourceInCollection, findResourceInCollectionByUri} from '../utils/collection';
import {log} from '..';
import * as cache from '../cache';
import * as link from 'semantic-link';
import {defaultResolver as resolver} from './syncResolver';

export {defaultResolver} from './syncResolver';

/**
 * Used for provisioning a pooled collection (network of data) based on providing a document (resources). Based on
 * the differences it will resolve a resource and may create one in the process.
 *
 * A pooled collection lives outside of the current context that needs to be resolved. Examples similar to this
 * in other contexts are called meta-data or static collections. The main point is that resources from the pooled collection
 * are used by reference in the current collection.
 *
 * When pooled collection is read-only then no resources may be added from other contexts.
 *
 * @example
 *
 * import * as cache from './cache';
 * import {getPooledCollection} from './sync/PooledCollection';
 * import {log} from 'logger';
 *
 * export default function (contextResource) {
 *
 *     let resolve = (collectionName, collectionRel, type) =>
 *         (resource, options) => getPooledCollection(contextResource, collectionName, collectionRel, resource, options)
 *             .then(document => {
 *                  if (!document) {
 *                      log.error(`TODO: make new pooled resource: ${type} '${resource.name || ''}'`);
 *                  }
 *                  return document;
 *             });
 *
 *     return {
 *         resourceFactory: linkRel => cache.makeSparseResourceFromUri(linkRel.href, {name: linkRel.title}),
 *         resourceResolver: (type) => {
 *
 *             const rels = {
 *                 role: resolve('roles', /roles/, type),
 *             };
 *
 *             if (rels[type]) {
 *                 return rels[type];
 *             } else {
 *                 log.info(`Unable to resolve pooled resource '${type}', available: [${Object.keys(rels).join(',')}]`);
 *                 return () => Promise.resolve(undefined);
 *             }
 *         }
 *     };
 *
 * }
 *
 */


/**
 * Add to the resolver the mapping between the new document uri and the existing nod uri
 * @param document
 * @param resource
 * @param {CacheOptions} options
 * @return {*}
 * @private
 */
function resolve(document, resource, options) {
    if (link.matches(document, /self|canonical/)) {
        (options.resolver || resolver).add(
            link.getUri(document, /self|canonical/),
            link.getUri(resource, /self|canonical/));
    }
    return resource;
}

/**
 * Make a resource item inside a collection, add it to the resolver and
 * @param collectionResource
 * @param resourceDocument
 * @param {CacheOptions} options
 * @return {Promise} containing the created resource
 * @private
 */
function makeAndResolveResource(collectionResource, resourceDocument, options) {
    return cache
        .createCollectionItem(collectionResource, resourceDocument, options)
        .then(createdResource => {
            log.info(`Pooled: created ${link.getUri(createdResource, /self|canonical/)}`);
            return resolve(resourceDocument, createdResource, options);
        });
}

/**
 * Retrieves a resource from a named collection from the context of a given resource.
 *
 * @param {LinkedRepresentation} resource
 * @param {string} collectionName
 * @param {string|RegExp|string[]|RegExp[]} collectionRel
 * @param {*} resourceDocument
 * @param {CacheOptions} options
 * @return {Promise<string>} containing the uri resource {@link LinkedRepresentation}
 */
export function getPooledCollection(resource, collectionName, collectionRel, resourceDocument, options) {

    //options = Object.assign({}, {mappedTitle: 'name'}, options);

    return cache
        .getNamedCollection(resource, collectionName, collectionRel, options)
        .then(collectionResource => {

            let uri = link.getUri(resource, /self|canonical/);

            // strategy one & two: it is simply found map it based on self and/or mappedTitle
            let existingResource = findResourceInCollection(collectionResource, resourceDocument, options.mappedTitle);

            if (existingResource) {

                log.info(`Pooled: ${collectionName} on ${uri} - found: ${link.getUri(existingResource, /self|canonical/)}`);
                return resolve(resourceDocument, existingResource, options);

            } else if (link.getUri(resourceDocument, /self|canonical/)) {

                //strategy three: check to see if self is an actual resource anyway and map it if it is, otherwise make
                let documentURI = link.getUri(resourceDocument, /self|canonical/);
                let resolvedUri = (options.resolver || resolver).resolve(documentURI);

                if (resolvedUri !== documentURI) {
                    let tryGetResource = findResourceInCollectionByUri(collectionResource, resolvedUri);
                    if (tryGetResource) {
                        return tryGetResource;
                    } else {
                        log.error(`Resource '${resolvedUri}' is not found on ${uri} - very unexpected`);
                    }
                } else {
                    return makeAndResolveResource(collectionResource, resourceDocument, options);
                }

            } else {
                // strategy four: make if we can because we at least might have the attributes
                log.info(`Pooled: ${collectionName} on ${uri} - not found}`);
                return makeAndResolveResource(collectionResource, resourceDocument, options);
            }

        });
}


