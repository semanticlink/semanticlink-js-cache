import {QueryOptions} from "./interfaces";
import {instanceOfCollection} from "./utils";
import {deleteCollectionItem, deleteResource} from "../cache";
import {instanceOfLinkedRepresentation} from "semantic-link";
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
export function del<T extends Representation>(resource: T, options?: QueryOptions): Promise<T> {

    if (instanceOfCollection(resource)) {

        if (!instanceOfLinkedRepresentation(options.where)) {
            // TODO add {@link Uri) support
            throw new Error(`Where type not supported: ${typeof options.where}`);
        }

        return deleteCollectionItem(resource, options.where);
    }

    return deleteResource(resource, options);
}