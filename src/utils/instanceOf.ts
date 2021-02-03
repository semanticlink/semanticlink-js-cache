import {
    CollectionRepresentation,
    FeedRepresentation,
    instanceOfLinkedRepresentation,
    LinkedRepresentation,
    LinkUtil,
} from 'semantic-link';
import LinkRelation from '../linkRelation';
import { SingletonRepresentation } from '../types/types';
import { FeedItemRepresentation } from 'semantic-link/lib/interfaces';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { FormItem } from '../interfaces/formItem';
import { UriList } from '../types/mediaTypes';

/**
 * A guard to detect whether the object is a {@link CollectionRepresentation<T extends LinkedRepresentation>}.
 * A linked representation must be an object with an array called 'links'.
 *
 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfCollection<T extends LinkedRepresentation = LinkedRepresentation>(object: unknown | CollectionRepresentation<T>): object is CollectionRepresentation<T> {

    if (instanceOfLinkedRepresentation(object)) {
        const asObject = object as CollectionRepresentation;
        return !!(asObject && Array.isArray(asObject.items) && !instanceOfForm(object));
    } else {
        return false;
    }
}

export function instanceOfSingleton(object: unknown | LinkedRepresentation): object is SingletonRepresentation {
    return instanceOfLinkedRepresentation(object) && !instanceOfCollection(object);
}

export function instanceOfFeed(object: unknown | LinkedRepresentation): object is FeedRepresentation {
    // TODO: perhaps also check from feedOnly state

    if (instanceOfLinkedRepresentation(object)) {
        const asObject = object as FeedRepresentation;
        if ((asObject && Array.isArray(asObject.items) && !instanceOfForm(object))) {
            const { items } = asObject;
            const [first]: FeedItemRepresentation[] = items;
            // naive check that the items has an 'id' in it
            if (first !== undefined && 'id' in first) {
                return true;
            }
        }
    }
    return false;
}

/**
 * A guard to detect whether the object is a form {@link FormRepresentation}
 *
 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfForm(object: unknown | LinkedRepresentation): object is FormRepresentation {
    // form starts off looking like a collection with 'items'
    const { items } = object as FormRepresentation;

    if (items) {
        const [first]: FormItem[] = items;
        // simple check that the items has a 'type' in it
        if (first !== undefined && 'type' in first) {
            /*
             * However, there is a false match in the case of a collection that has items hydrated
             * where the resource also has an attribute with 'type'. (This isn't really either an edge case either.)
             *
             * In this case, double check that the convention of 'form' is used in the url
             *
             *    NOTE: this is very wrong because uris should be transparent
             *
             * Finally, the symptom that this solves is that collections are reloaded as singletons meaning
             * that the items have id/title loaded as attributes rather than a link relations
             *
             * TODO: work out a better type strategy
             */
            return LinkUtil.getUri(object as LinkedRepresentation, LinkRelation.Self)?.includes('form') || false;
        }
    }
    return false;
}

/**
 * A guard to detect whether the object is a {@link UriList}
 *
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfUriList(object: any): object is UriList {
    const [first,] = object;
    // a very naive type check for a UriList
    return Array.isArray(object) && typeof first === 'string';

}
