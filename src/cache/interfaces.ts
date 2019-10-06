import {AcrossTheWire, Cancellable, Link, LinkedRepresentation, RelationshipType, Uri} from "semantic-link";
import {FormRepresentation, Representation, CacheOptions} from "../interfaces";
import {ResourceResolver, UriResolver} from "../sync/interfaces";

export interface ResourceFactory {
    (link: Link): Representation
}

export interface StateOptions {
    /**
     * Override where the resource uses a different attribute for identification (eg 'title').
     */
    mappedTitle: string;
    rel: RelationshipType
    /**
     * Allows for specific implementation to override the default {@link getUri} implementation from semantic link.
     * @param resource
     * @param rel
     */
    getUri: (resource: Representation, rel: RelationshipType) => Uri
    /**
     * Allows for a specific implementation to override the default semantic link implementation
     * @param link
     */
    resourceFactory: ResourceFactory
}

export interface LinkOptions {
    getFactory?: <T extends Representation>(resource: T, rel: RelationshipType, cancellable: Cancellable) => Promise<T | void>
    postFactory?: <T extends Representation>(resource: T, data: T, options?: CacheOptions) => Promise<T | void>
    putFactory?: <T extends Representation>(resource: T, data: T, options?: CacheOptions) => Promise<T | void>
    deleteFactory?: <T extends Representation>(resource: T, options?: CacheOptions) => Promise<void>
}


/**
 * @private
 */
export interface SparseResourceOptions {
    /**
     * Creates a {@link State} object (as a Symbol) on an object.
     *
     * @remarks
     *
     * The default implementation {@link State.make} adds this onto an empty object ready to be merged onto
     * a {@link Representation}
     *
     * Note: interface document around index symbols is difficult: https://github.com/Microsoft/TypeScript/issues/1863
     * (not yet possible) and thus the interface will work but is not specific enough. The original implementation
     * was before typescript and was documenting using jsdoc
     */
    // stateFactory: (state?: StateEnum) => {[state]: State}
    stateFactory?: (state?: string) => any
}


/**
 * Options available when merging resource via a three-way merger
 */
export interface EditMergeOptions extends MergeOptions {
    /**
     * When 'true' return 'undefined' from the edit merge rather than the merged document.
     */
    readonly undefinedWhenNoUpdateRequired?: boolean
    /**
     * On resource state, there are fields that are added by the cache - these are tracked fields. This overrides the
     * default implementation when needed which overwrites all fields.
     *
     * @param resource
     */
    readonly isTracked?: (resource: LinkedRepresentation) => boolean
}

/**
 * Options available when merging resource via a three-way merger
 */
export interface CreateMergeOptions extends MergeOptions {
}

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
    readonly defaultFields?: string[]
    readonly resolver?: UriResolver
    readonly resourceResolver?: ResourceResolver
}

/**
 * Merge strategy function between an existing {@link LinkedRepresentation}
 * client-side representation and a form that returns an {@link AcrossTheWire} document
 *
 * @see @{link ResourceMerger.createMerge}
 */
export interface CreateFormMergeStrategy {
    <T extends LinkedRepresentation>(
        resource: T,
        createForm: FormRepresentation,
        options: MergeOptions): Promise<AcrossTheWire | never>
}

/**
 * A three-way merge between an edit form  and existing {@link LinkedRepresentation}
 * client-side representation that returns an {@Link AcrossTheWire} document.
 *
 * @see @{link ResourceMerger.editMerge}
 */
export interface EditFormMergeStrategy {
    <T extends LinkedRepresentation>(
        resource: T,
        document: T,
        editForm: FormRepresentation,
        options: UpdateCollectionResourceItemOptions): Promise<AcrossTheWire | never>
}

export interface CreateCollectionResourceItemOptions extends MergeOptions {
    /**
     * Create form merge strategy
     */
    readonly createForm?: CreateFormMergeStrategy
}

export interface UpdateCollectionResourceItemOptions extends MergeOptions {
    readonly editForm?: EditFormMergeStrategy
}
