import {QueryOptions} from "./interfaces";
import {instanceOfLinkedRepresentation, LinkType} from "semantic-link";
import {createCollectionItem, create as createResource} from "../cache";
import {Representation} from "../interfaces";

/**
 * Delete a resource: either an item in a collection or a singleton.
 *
 * @remarks
 *
 * Logically one does delete a collection but rather deletes all the items in a collection.
 *
 * @param resource
 * @param options query options to remove an item from a collection
 * @returns the resource that was logically deleted
 */
export function create<T extends Representation>(resource: T | LinkType, options?: QueryOptions): Promise<T> | T {

    const {rel, where}: QueryOptions = {...options, opts: <QueryOptions>{}};

    if (!instanceOfLinkedRepresentation(resource)) {

        if (rel === undefined) {
            throw new Error('Rel must be set to create a sparsely populated resource');
        }
        return createResource(resource, rel);
    }

    if (where !== undefined) {
        return createCollectionItem(resource, where, options);
    }

    throw new Error('Create options not satisfied');
}