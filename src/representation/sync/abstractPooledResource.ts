import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import anylogger from 'anylogger';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';
import { ResourceResolver } from '../../interfaces/resourceResolver';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import LinkRelation from '../../linkRelation';
import PooledCollectionUtil from './pooledCollectionUtil';

const log = anylogger('AbstractPooledResource');

export type PooledResourceResolver = <T extends LinkedRepresentation>(resource: T, options?: PooledCollectionOptions) => Promise<T | undefined>;
const noopUndefined = async () => undefined;


export abstract class AbstractPooledResource<T extends LinkedRepresentation> {
    /**
     * the home resource (or starting point) of the sub collections
     */
    protected collection: T | undefined;

    protected resolvers: Record<string, PooledResourceResolver>;

    public constructor(resource: T) {
        if (!resource) {
            log.error('empty resource for pooled resources');
        }

        this.collection = resource;

        this.resolvers = this.makeResolvers();
    }

    public get resourceResolver(): ResourceResolver {
        return this.pooledResource.bind(this);
    }


    protected resolve(rel: RelationshipType, options?: SyncOptions): PooledResourceResolver {

        const { pooledResolver } = { ...options };

        return async <T extends LinkedRepresentation>(document: T, options?: PooledCollectionOptions): Promise<T | undefined> => {
            log.debug('resolve pooled %s %s', rel, LinkUtil.getUri(document, LinkRelation.Self));
            if (this.collection) {
                const resource = await PooledCollectionUtil.sync(
                    this.collection,
                    document as LinkedRepresentation,
                    { ...options, rel });

                /*
                 * If a pooled collection has linked representations, process here as a nest sync
                 */
                if (resource) {
                    pooledResolver?.(resource, document, options);
                }

                return resource as T;
            }

        };
    }

    /**
     * Set of resolvers returning the sub collections
     */
    protected abstract makeResolvers(): Record<string, PooledResourceResolver>;

    /**
     * Default resolves returns a noop undefined
     */
    protected defaultPooledResolver: (type: string) => PooledResourceResolver = () => noopUndefined;

    /**
     * Access back to the keyed resolver
     */
    private pooledResource(type: string): PooledResourceResolver {
        if (this.resolvers[type]) {
            log.debug('resolving resource pool type: %s', type);
            return this.resolvers[type];
        } else {
            return noopUndefined;
        }
    }
}
