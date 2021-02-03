import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import LinkRelation from '../linkRelation';
import { ComparableRepresentation, Comparator } from '../interfaces/comparator';

/**
 * Match on the canonical or self link relation on the resources
 */
export const canonicalOrSelf: Comparator<LinkedRepresentation> = (lvalue: LinkedRepresentation, rvalue: LinkedRepresentation) => {
    const lUri = LinkUtil.getUri(lvalue, [LinkRelation.Canonical, LinkRelation.Self] as RelationshipType);
    const rUri = LinkUtil.getUri(rvalue, [LinkRelation.Canonical, LinkRelation.Self] as RelationshipType);
    if (lUri && rUri) {
        return lUri === rUri;
    }
    return false;
};

/**
 * Simple match on the name attribute on the resources
 */
export const name: Comparator<ComparableRepresentation> = (lvalue: ComparableRepresentation, rvalue: ComparableRepresentation) => {
    if (lvalue.name && rvalue.name) {
        return lvalue.name === rvalue.name;
    }
    return false;
};

/**
 * Simple match on the name attribute on the resources
 */
export const emptyName: Comparator<ComparableRepresentation> = (lvalue: ComparableRepresentation, rvalue: ComparableRepresentation) => {
    return !lvalue.name && !rvalue.name;
};

/**
 * A default set of comparisons made to check if two resource
 * representation refer to the same resource in a collection.
 *
 * The most specific and robust equality check is first, with the most vague and
 * optimistic last.
 *
 */
export const defaultEqualityOperators: (Comparator<ComparableRepresentation> | Comparator<LinkedRepresentation>)[] = [canonicalOrSelf, name];
