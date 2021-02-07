import { Status } from '../models/status';
import { Representation } from 'src/types/types';
import { LinkedRepresentation, LinkType, Uri } from 'semantic-link';
import { FeedItemRepresentation } from 'semantic-link/lib/interfaces';

export type ResourceType = 'singleton' | 'collection' | 'feed';

export interface ResourceFactoryOptions {

    /**
     * The href set on the 'self' link relation
     */
    readonly uri?: Uri;

    /**
     * The title set on the sparsely populate resource.
     */
    readonly title?: string;

    /**
     * Explicitly set the {@link State.status} on the resource. Currently, when there is a uri, it is set to location
     * otherwise, set to unknown
     *
     * @see TrackedRepresentationFactory.make
     * @see State
     */
    readonly status?: Status;

    /**
     * Where the resource is sparse, the type can be explicitly set. Default is singleton
     *
     * Note: 'feed' is an internal type that generally should not be used/needed.
     */
    readonly sparseType?: ResourceType;

    /**
     * For {@link ResourceType} collection, default items can be added at creation time. Items are added as sparse representations
     */
    readonly defaultItems?: (Uri | FeedItemRepresentation)[];

    /**
     * Set a state on this data if it exists rather than a sparsely populated representation
     *
     * Note: use a functor to return the representation to use generics (don't want generic at interface level)
     *
     * TODO: this isn't right and often requires `<T>on: () => x as unknown as T`
     */
    on?: LinkedRepresentation;

    /**
     * Internally used, to generate a items on a collection. Used in conjunction with {@link sparseType} 'feed'.
     */
    feedItem?: FeedItemRepresentation;

    mappedTitle?: string;

}
