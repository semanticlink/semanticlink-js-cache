import { Resolver } from './resolver';
import { ResourceResolver } from './resourceResolver';
import { FieldResolver } from './fieldResolver';
import { LinkedRepresentation, RelationshipType } from 'semantic-link';

export type IsTrackedResolver = <T extends LinkedRepresentation | Partial<T>>(resource: T, field: keyof T) => boolean;

/**
 * Options available when merging resource via a three-way merger
 */
export interface MergeOptions {
    /**
     * When merging resources, these are additional fields that can be added by default from the form resource.
     *
     * @remarks
     * The current implementation always includes the 'name' attribute
     */
    readonly defaultFields?: string[];
    readonly resolver?: Resolver;
    readonly resourceResolver?: ResourceResolver;
    readonly fieldResolver?: FieldResolver;
    /**
     * On resource state, there are fields that are added by the cache - these are tracked fields. This overrides the
     * default implementation when needed which overwrites all fields.
     * @deprecated
     */
    readonly isTracked?: IsTrackedResolver;
    /**
     * When 'true' return 'undefined' from the edit merge rather than the merged document.
     */
    readonly undefinedWhenNoUpdateRequired?: boolean;

    readonly formRel?: RelationshipType;

}

