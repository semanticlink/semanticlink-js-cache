import { LinkedRepresentation } from 'semantic-link';
import anylogger from 'anylogger';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';
import { ResourceResolver } from '../../interfaces/resourceResolver';

const log = anylogger('AbstractPooledResource');

export type PooledResourceResolver = <T extends LinkedRepresentation>(resource: T, options?: PooledCollectionOptions) => Promise<T | undefined>;

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

    /**
     * Set of resolvers returning the sub collections
     */
    protected abstract makeResolvers(): Record<string, PooledResourceResolver>;

    /**
     * The resolver returns the 'questions'
     * pooled collection. The question required in this test already exists.
     */
    private pooledResource(type: string): PooledResourceResolver {
        if (this.resolvers[type]) {
            log.debug('resolving resource pool type: %s', type);
            return this.resolvers[type];
        } else {
            return async () => undefined;
        }
    }

    /**
     * Default resolves returns a noop undefined
     */
    protected defaultPooledResolver: (type: string) => PooledResourceResolver = () => async () => undefined;
}
