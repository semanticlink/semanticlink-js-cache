import { Representation } from '../../types/types';
import { ResourceSync } from './resourceSync';
import { RelationshipType } from 'semantic-link';

export interface NamedResourceSync<T extends Representation> extends ResourceSync<T> {
    /**
     * Link rel on the parent (ie context) resource to be followed
     */
    readonly rel: RelationshipType;
    /**
     * The attribute name of the named resource that is added to the in-memory resource. This is an override value
     * where the default is a stringly-type of {@link rel}.
     */
    readonly name?: string;
}
