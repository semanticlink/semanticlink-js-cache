import { match } from 'mismatched';
import {
    instanceOfCollection, instanceOfSingleton,
} from './utils/instanceOf';
import { instanceOfLinkedRepresentation } from 'semantic-link';

export type RepresentationMatcher = (predicate: (v: any) => boolean, description?: any) => any;

export const singletonRepresentation: RepresentationMatcher = match.predicate(v => instanceOfSingleton(v));
export const collectionRepresentation: RepresentationMatcher = match.predicate(v => instanceOfCollection(v));
export const linkedRepresentation: RepresentationMatcher = match.predicate(v => instanceOfLinkedRepresentation(v));
export const collectionIsEmpty: RepresentationMatcher = match.predicate(v => instanceOfCollection(v) && v.items.length === 0);
