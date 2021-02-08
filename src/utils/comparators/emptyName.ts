import { ComparableRepresentation } from '../../interfaces/comparator';

/**
 * Simple match on the name attribute on the resources
 */
export function emptyName(lvalue: ComparableRepresentation, rvalue: ComparableRepresentation) {
    return !lvalue.name && !rvalue.name;
}
