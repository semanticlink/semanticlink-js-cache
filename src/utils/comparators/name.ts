import { ComparableRepresentation } from '../../interfaces/comparator';

/**
 * Simple match on the name attribute on the resources
 */
export function name(lvalue: ComparableRepresentation, rvalue: ComparableRepresentation): boolean {
    if (lvalue.name && rvalue.name) {
        return lvalue.name === rvalue.name;
    }
    return false;
}
