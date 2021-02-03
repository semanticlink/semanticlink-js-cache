import { LinkedRepresentation } from 'semantic-link';
import { TrackedRepresentation } from '../types/types';
import { DocumentRepresentation } from './document';
import { FormRepresentation } from './formRepresentation';
import { MergeOptions } from './mergeOptions';

export type EditFormMergeStrategy = {
    <U extends LinkedRepresentation = LinkedRepresentation,
        T extends U = TrackedRepresentation<U>>
    (resource: T, document: DocumentRepresentation, form: FormRepresentation, options?: MergeOptions): Promise<T | undefined>;
};



