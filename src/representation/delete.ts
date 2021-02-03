import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { TrackedRepresentation } from '../types/types';
import TrackedRepresentationFactory from './trackedRepresentationFactory';
import { ResourceQueryOptions } from '../interfaces/resourceQueryOptions';
import { ResourceLinkOptions } from '../interfaces/resourceLinkOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { instanceOfCollection } from '../utils/instanceOf';
import RepresentationUtil from '../utils/representationUtil';
import anylogger from 'anylogger';

const log = anylogger('delete');

/**
 *
 * TODO: accept but don't require TrackedRepresentation interface
 * @param resource
 * @param options
 * @returns removed representation or default
 */
export default async function del<U extends LinkedRepresentation,
    T extends LinkedRepresentation = TrackedRepresentation<U>>(
    resource: TrackedRepresentation<U>,
    options?: ResourceFactoryOptions &
        ResourceQueryOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceFetchOptions): Promise<T | undefined> {

    const { where = undefined, removeOnDeleteItem = true } = { ...options };

    // find specific item in collection to delete
    if (where) {
        if (instanceOfCollection(resource)) {
            // refresh collection first
            const collection = await TrackedRepresentationFactory.load(resource, options);
            // then check for existence
            // TODO: needs to process collection<T & LocalState> rather than collection<T>
            const item = RepresentationUtil.findInCollection(collection as unknown as CollectionRepresentation<U>, options) as TrackedRepresentation<U>;
            if (item) {
                const deletedResource = await TrackedRepresentationFactory.del(item, options);
                if (deletedResource && removeOnDeleteItem) {
                    const removeItemFromCollection = TrackedRepresentationFactory.removeCollectionItem(
                        collection as unknown as TrackedRepresentation<CollectionRepresentation<TrackedRepresentation<U>>>,
                        deletedResource);
                    return removeItemFromCollection as unknown as T | undefined;
                } else {
                    return undefined;
                }
            } else {
                log.debug('Item not found in collection');
                return;
            }
        } else {
            log.warn('Where options cannot be used outside of a collection, skipping where');
            // fall through to return context resource
        }
    }

    if (instanceOfCollection(resource)) {
        log.debug('Attempting to delete collection resource');
    }

    return await TrackedRepresentationFactory.del(resource, options) as unknown as T;
}
