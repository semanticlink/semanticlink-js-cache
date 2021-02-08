import { LinkedRepresentation } from 'semantic-link';
import { ComparableRepresentation, Comparator } from '../../interfaces/comparator';
import { name } from './name';
import { canonicalOrSelf } from './canonicalOrSelf';


/**
 * A default set of comparisons made to check if two resource
 * representation refer to the same resource in a collection.
 *
 * The most specific and robust equality check is first, with the most vague and
 * optimistic last.
 *
 */
export const defaultEqualityOperators: (Comparator<ComparableRepresentation> | Comparator<LinkedRepresentation>)[] = [canonicalOrSelf, name];
