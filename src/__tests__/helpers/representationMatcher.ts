import { match } from 'mismatched';
import { instanceOfLinkedRepresentation } from 'semantic-link';
import { instanceOfSingleton } from '../../utils/instanceOf/instanceOfSingleton';
import { instanceOfCollection } from '../../utils/instanceOf/instanceOfCollection';

/**
 * Test helpers
 */

export type RepresentationMatcher = (predicate: (v: any) => boolean, description?: any) => any;

export const singletonRepresentation: RepresentationMatcher = match.predicate(v => instanceOfSingleton(v));
export const collectionRepresentation: RepresentationMatcher = match.predicate(v => instanceOfCollection(v));
export const linkedRepresentation: RepresentationMatcher = match.predicate(v => instanceOfLinkedRepresentation(v));
export const collectionIsEmpty: RepresentationMatcher = match.predicate(v => instanceOfCollection(v) && v.items.length === 0);
