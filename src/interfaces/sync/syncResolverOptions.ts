import { Representation } from '../../types/types';

/**
 * TODO: needs to return Promise<T | undefined>
 */
export type CreateStrategy = <T extends Representation>(createDataDocument: T) => Promise<T>;
export type UpdateStrategy = <T extends Representation>(resource: T, update: T) => Promise<void>;
export type DeleteStrategy = <T extends Representation>(resource: T) => Promise<void>;

export interface SyncResolverOptions {
    /**
     * A function that should create a single resource. It must return a promise with the resource (created on the collection resource)
     * @param createDataDocument
     */
    readonly createStrategy: CreateStrategy;
    /**
     * Conditionally update the given resource using the provides document. The implementation can
     *  choose to not update the resource if its state is equivalent. return a promise with no parameters
     * @param resource
     * @param update
     */
    readonly updateStrategy: UpdateStrategy
    /**
     * Delete a resource
     * @param resource
     */
    readonly deleteStrategy: DeleteStrategy;

}
