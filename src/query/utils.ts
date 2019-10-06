import {FormItem, FormRepresentation, Representation, UriList} from "../interfaces";
import {RelationshipType} from "semantic-link";

/**
 * A guard to detect whether the object is a collection {@link Representation}
 *
 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfCollection(object: any): object is Representation {
    // note this check may not be strict enough as we progress. It may need to check
    // that the items of type type FeedItem
    return object && 'items' in object;
}

/**
 * A guard to detect whether the object is an array of {@link Representation}
 *
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfRepresentationSet(object: any): object is Representation[] {
    return Array.isArray(object);
}

/**
 * A guard to detect whether the object is a form {@link FormRepresentation}
 *
 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfForm(object: any): object is FormRepresentation {
    if ('items' in object) {
        const [first,]: FormItem[] = object['items'];
        return first != undefined && 'type' in first;
    }
    return false;
}

/**
 * A guard to detect whether the object is a form {@link RelationshipType}
 *
 * TODO: extend for arrays specific to RegExp and string
 *
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfRel(object: any): object is RelationshipType {
    return typeof object === 'string'
        || object instanceof String
        || object instanceof RegExp;

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
