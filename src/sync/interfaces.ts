import {CollectionRepresentation, LinkedRepresentation, RelationshipType, Uri} from "semantic-link";
import {Representation, UriList} from "../interfaces";

export interface SyncResult<T extends Representation> {
    readonly resource: T;
    readonly document: T;
    readonly options: SyncOptions;
}

// export type StrategyType = <T extends Representation>(resource: T, document: T, options: SyncOptions) => Promise<void>;
export type StrategyType = <T extends Representation>(syncResult: SyncResult<T>) => Promise<void>;

export interface ResourceSync<T extends Representation> {
    readonly resource: T;
    readonly document: T;
    readonly strategies?: StrategyType[];
    readonly options?: SyncOptions;
}

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

/**
 * Action to make on resource
 */
export type SyncInfoAction = 'create' | 'update' | 'delete';

/**
 * Internal data structure for working out which action to perform on documents when syncing.
 * @private
 */
export interface SyncInfo {
    readonly resource: Representation
    readonly document: Representation
    readonly action: SyncInfoAction
}

/**
 *   An array of 4 values for the form [SyncInfo[], createlist, updatelist, deletelist].
 *
 *   Where the first collection is the collection resource grouped with the document data. The createlist is
 *   an array describing the resources created. The update list is an array that describes the resources
 *   updated. The delete list describes the resources deleted.</p>
 *
 *   The create list items are an array of two values. The first item is the new item returned from the
 *   createStrategy promise. The second item is the create data provided to the createStrategy.
 *
 *   The update list item are an array of two values. The first value is the resource from the
 *   collection resource that is provided to the updateStrategy. The second item is the update
 *   data from the document resource used to update the resource.
 *
 *   The delete list items are an array with a single value. The value is the resource from
 *   the collection resource prior to being deleted.
 */
export type SyncResultItem = [SyncInfo[], [LinkedRepresentation[], LinkedRepresentation[]], [LinkedRepresentation[], LinkedRepresentation[]], LinkedRepresentation[]];

export type SyncInfoResult = Promise<SyncResultItem[]>;

/**
 * Used for provisioning the resources (network of data) based on providing new document (resources). Based
 * on a difference set this class synchronises between the client version and the api
 * @private
 */
export interface UriResolver {
    /**
     * Based on a known {@link Uri} what should it now be resolved to
     * @param key
     */
    resolve: (key: Uri) => Uri
    /**
     * Add a new {@link Uri} into the resolver for later resolution
     * @param key
     * @param value
     */
    add: (key: Uri, value: Uri) => void
    /**
     * Update (or add new) an existing {@link Uri} value for a known resolver key
     * @param key
     * @param value
     */
    update: (key: Uri, value: Uri) => void
    /**
     * Remove the know {@link Uri} entry so that it is no longer resolved
     * @param key
     */
    remove: (key: Uri) => void
}

/**
 * A resolver on {@link UriList}
 */
export interface UriListResolver {
    (resource: Representation): UriList
}

export interface ResourceResolver {
    (resource: string | any): Representation
}

export interface SyncOptions {

    /**
     * Set the size of the batches of requests on `sync`.
     *
     * When `sync` is moving through its child strategies the requests can be either sequential or parallel. Currently,
     * a non-zero number sets the strategy as sequential. The default value is 'undefined' or 0 to invoke a parallel
     * strategy.
     *
     * @see batchSize for controlling batching requests on individual resources
     */
    readonly strategyBatchSize?: number

    /**
     * Set the size of the batches of requests on differencing for the creation and deletion of individual resources.
     *
     * When moving through differencing the requests can be either sequential or parallel. Currently,
     * a non-zero number sets the strategy as sequential. The default value is 'undefined' or 0 to invoke a parallel
     * strategy.
     *
     * @see strategyBatchSize for controlling strategies
     */
    readonly batchSize?: number
    /**
     * When set to true, the next check on the resource ensures that it flushes through the stack
     */
    readonly forceLoad?: boolean
    /**
     * Ensures that the resource is created
     */
    readonly forceCreate?: boolean
    /**
     * Marks a collection as read-only - you'd don't get the ability to add items
     */
    readonly readonly?: boolean
    /**
     * Marks a collection as mutable - you only get to remove/add items from the collection (you may or may
     * not be able to delete/create the items themselves)
     */
    readonly contributeonly?: boolean

    /**
     * Change the strategy to locate a resource in a collection when syncing eg the resource in the collection
     * will be searched by only on link relation (default: canonical|self)
     *
     * @see {@link defaultFindResourceInCollectionStrategy}
     */
    readonly findResourceInCollectionStrategy?: <T extends Representation>(collection: CollectionRepresentation, document: T) => T

    /**
     *
     *
     * @see defaultUriListResolver
     */
    readonly uriListResolver?: UriListResolver
    /**
     * A function that should create a single resource. It must return a promise with the resource (created on the collection resource)
     * @param createDataDocument
     */
    readonly createStrategy?: <T extends Representation>(createDataDocument: T) => Promise<T>
    /**
     * Conditionally update the given resource using the provides document. The implementation can
     *  choose to not update the resource if its state is equivalent. return a promise with no parameters
     * @param resource
     * @param update
     */
    readonly updateStrategy?: <T extends Representation>(resource: T, update: T) => Promise<void>
    /**
     * Delete a resource
     * @param resource
     */
    readonly deleteStrategy?: <T extends Representation>(resource: T) => Promise<void>

    /**
     * A set of comparators for matching resources in the network of data (@link Differencer} to compute the identity
     * of an object based on a transformation
     */
    readonly comparators?: Comparator[]

}

/**
 * A set of comparators for matching resources in the network of data differencer (@link Differencer}
 *
 * You can also add your own. TODO: no registration, just code them in
 *
 * @example
 *
 * Specific maters for role-filters on a report template. It requires that both the role and the filter match
 * from the link relations:
 *
 * {
 *
 *    "links": [
 *        {
 *            "rel": "self",
 *            "href": "http://localhost:1080/role/filter/408"
 *        },
 *        {
 *            "rel": "up",
 *            "href": "http://localhost:1080/report/template/4991"
 *        },
 *        {
 *            "rel": "filter",
 *            "href": "http://localhost:1080/filter/1"
 *        },
 *        {
 *            "rel": "role",
 *            "href": "http://localhost:1080/role/11"
 *
 *    ]
 * }
 *
 *  byLinkRelation(lvalue, rvalue) {
 *      return link.matches(lvalue, /^role$/) === link.matches(rvalue, /^role$/) &&
 *          link.matches(lvalue, /^filter$/) === link.matches(rvalue, /^filter$/);
 *  }
 *
 */
export interface Comparator {
    (lvalue: Representation, rvalue: Representation): boolean;
}
