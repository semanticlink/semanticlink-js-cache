import * as link from "semantic-link";
import {
    getCollection,
    getCollectionAndItems,
    getCollectionItem,
    getCollectionItemByUri,
    getNamedCollection,
    getNamedCollectionAndItems,
    getNamedCollectionItemByUri,
    getNamedCollectionOnSingletons,
    getResource,
    getSingleton,
    tryGetNamedCollectionAndItemsOnCollectionItems,
    tryGetResource,
    tryGetSingleton
} from "../cache";
import {relTypeToCamel} from "../utils/linkRel";
import {QueryOptions} from "./interfaces";
import {instanceOfCollection, instanceOfForm, instanceOfRel} from "./utils";
import {Representation} from "../interfaces";
import {mapWaitAll, sequentialWaitAll} from "../utils/asyncCollection";

/**
 * Helper part of get for duplicated code that deals with allowing transparently for whether the context
 * is a singleton or collection.
 *
 * @param context
 * @param resource
 * @param rel
 * @param name
 * @param options
 * @private
 */
function getOnContext<T extends Representation>(
    context: T,
    resource: T,
    rel: string | RegExp,
    name: string,
    options: QueryOptions)
    : Promise<T> {

    const {includeItems, defaultRepresentation, where} = options;

    if (instanceOfForm(context)) {
        return getSingleton(resource, name, rel, options);
    }

    if (instanceOfCollection(context)) {

        if (where != undefined) {
            if (typeof where === 'string') {
                return getNamedCollectionItemByUri(resource, name, rel, where, options);
            } else {
                throw new Error('Loading an item based on a representation on where is not implemented');
            }
        }

        if (instanceOfCollection(resource) && rel != undefined && includeItems) {
            // @ts-ignore (cannot understand why this has type warning)
            return tryGetNamedCollectionAndItemsOnCollectionItems(resource, name, rel, options);
        }

        if (includeItems) {
            return getNamedCollectionAndItems(resource, name, rel, options);
        }

        return getNamedCollection(resource, name, rel, options);
    }
    return defaultRepresentation != undefined
        ? tryGetSingleton(resource, name, rel, defaultRepresentation, options)
        : getSingleton(resource, name, rel, options);
}

export function get<T extends Representation>(resource: T | T[], options?: QueryOptions): Promise<T | T[]>;
/**
 * Get resources and related resources.
 *
 * @remarks
 *
 * This should be simply approach that covers most situations. If not, either drop down into the {@link cache} library
 * or extend this one.
 *
 * @param resource
 * @param rel
 * @param options query options to specify the depth and width to be retrieved
 * @returns the target resource which may be the originating or target resource
 */
export function get<T extends Representation>(
    resource: T | T[],
    rel: string | RegExp,
    options?: QueryOptions):
    Promise<T | T[]> {

    if (rel === undefined || options === undefined) {
        options = {};
    }

    // shift the parameters
    if (!instanceOfRel(rel)) {
        options = rel || options;
        rel = options.rel;
    }

    // set the name based on the rel unless there is an override
    const name = options.name || relTypeToCamel(rel);

    /**
     * Iterating over the resource(s) and use the options for the iterator. The batch size
     * indicates at this stage whether the queries or sequential or parallel (ie batch size is a bit misleading
     * because in practice batch size is either one (sequential) or all (parallel). This can be extended when needed.
     *
     * In the case of a named collections/singletons, the options should also have 'rel' (which is picked up by the 'get').
     *
     */
    if (options.iterateOver) {
        delete options.iterateOver;
        if (!options.batchSize || options.batchSize == 0) {
            return mapWaitAll(resource, (item) => get(item, {...options}));
        } else {
            return sequentialWaitAll(resource, (_, item) => get(item, {...options}));
        }
    }

    // named resources
    if (rel != undefined) {

        // T[]
        if (resource instanceof Array) {
            return getNamedCollectionOnSingletons(resource, name, rel, options) as Promise<T[]>;
        }

        // T existing
        if (resource[name]) {
            return getOnContext(resource[name], resource, rel, name, options);
        } else {

            // T - to fetch
            // look ahead to be able to deal with whether it is a collection or not
            // shouldn't be too much of a penalty
            return getResource(resource)
            // @ts-ignore (difficulty inter-operating with js library)
                .then(resource => {

                    if (options.includeItems && instanceOfCollection(resource)) {
                        return Promise.resolve({data: resource})
                    } else {
                        return link.get(resource, rel /*, options.cancellable */);
                    }
                })
                // @ts-ignore
                .then(response => {
                    return getOnContext(response.data, resource, rel, name, options);
                });
        }
    }

    const {where, defaultRepresentation}: QueryOptions = {...options, opts: <QueryOptions>{}};

    // collection
    if (instanceOfCollection(resource)) {

        // find specific item in collection
        if (where != undefined) {

            // use uri for identity
            if (typeof where === 'string') {
                return getCollectionItemByUri(resource, where, options);

            }
            // use link rel 'self' for identity
            return getCollectionItem(resource, where, options);
        }

        if (options.includeItems) {
            return getCollectionAndItems(resource, options)
        }

        return getCollection(resource, options);
    }


    // singleton
    return defaultRepresentation
        ? tryGetResource(resource, defaultRepresentation, options)
        : getResource(resource, options);
}
