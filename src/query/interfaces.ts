import {LinkedRepresentation, RelationshipType, Uri} from "semantic-link";
import {Representation} from "../interfaces";


/**
 * Options for be able to traverse the semantic network of data
 */
export type QueryOptions = {
    /**
     * If this is set then the get will perform a `tryGet` and return default representation on failure
     */
    defaultRepresentation?: Representation,
    /**
     * Identifies the child resource in a collection by its identity (either as 'self' link rel or a `Uri`)
     */
    where?: Representation | Uri,
    /**
     * Identifies the link rel to follow to add {@link LinkedRepresentation} onto the resource.
     */
    rel?: RelationshipType,
    /**
     * The name of the attribute that the {@link LinkedRepresentation} is added on the resource. Note: this
     * value is defaulted based on the {@link QueryOptions.rel} if not specified. If the {@link QueryOptions.rel} is
     * an array then this value must be explicitly set.
     */
    name?: string
    /**
     * Alters the hydration strategy for collections. By default collections are sparsely populated (that is
     * the `items` attribute has not gone to the server to get all the details for each item).
     * {@link QueryOptions.include} currently flags that it should go and fetch each item.
     */
    includeItems?: boolean

    /**
     * Alters the hydration strategy that it treats the resource as an array of resource and then does a further
     * get using the options as an iterator.
     *
     * This should not be used for eager loading of collections (ie items)—use `includeItems`
     */
    iterateOver?: boolean

    /**
     * Used in conjunction with `iterateOver` for the strategy to load (arrays of) resources. The current implementation
     * supports only two practice cases: sequential ('1') or parallel ('0' or undefined).
     */
    batchSize?: number
} & {} | any;
