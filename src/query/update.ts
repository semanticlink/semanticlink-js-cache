import {QueryOptions} from "./interfaces";
import {instanceOfCollection, instanceOfRepresentationSet, instanceOfUriList} from "./utils";
import {updateCollection, updateResource} from "../cache";
import {Representation} from "../interfaces";
import {mapWaitAll} from "../utils/asyncCollection";

/**
 * Update a set of resources where each resource is updated based on predicate.
 *
 * @param resource resource must include the 'edit-form' link relation
 * @param predicate the predicate that transforms the resource to make the new state into
 * @param options query options to remove an item from a collection
 * @returns the resource set that was logically deleted
 */
export function update<T extends Representation>(resource: T[], predicate: (t: T) => T, options?: QueryOptions): Promise<T[] | never>

/**
 * Update a resource. When not a collection then PUT, when a collection PATCH using {@link UriList}
 *
 * @param resource resource must include the 'edit-form' link relation
 * @param document the values to make the new state into
 * @param options query options to remove an item from a collection
 * @returns the resource that was logically deleted
 */
export function update<T extends Representation | Representation[]>(resource: T | T[], document: (t: T) => T | T, options?: QueryOptions): Promise<T | T[] | never> {

    // PATCH
    if (instanceOfCollection(resource)) {

        if (!instanceOfUriList(document)) {
            throw new Error('To update a collection, a document of type UriList must be supplied');
        }

        return updateCollection(resource, document, options)
    }

    // PUT
    if (instanceOfRepresentationSet(resource)) {
        /*
         * Batching a set of items in a collection is done via each item. Here we will deal with items as a set of representations
         * when they are handed in as a an array of representations and then process them one at at time.
         *
         * The current implementation is simple and naive — takes a predicate to process across the set.
         */

        if (typeof document !== 'function') {
            throw new Error("Parameter 'document' must be a predicate function");
        }
        // casting for typing
        const iterator: (t: any) => any = document;

        return mapWaitAll(resource, doc => update(doc, iterator(doc), options), options)
    } else {
        // update a single resource
        return updateResource(resource, document, options);
    }
}