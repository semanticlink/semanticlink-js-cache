import { LinkedRepresentation } from 'semantic-link';
import anylogger from 'anylogger';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';

const log = anylogger('AbstractPooledResource');

export type PooledResourceResolver = <T extends LinkedRepresentation>(resource: T, options?: PooledCollectionOptions) => Promise<T | undefined>;

export abstract class AbstractPooledResource<T extends LinkedRepresentation> {
    /**
     * the home resource (or starting point) of the sub collections
     */
    protected collection: T | undefined;

    protected resolvers: Record<string, PooledResourceResolver>;

    protected constructor(resolvers?: Record<string, PooledResourceResolver>) {
        this.resolvers = resolvers ?? {};
    }

    public init(resource: T): (type: string) => PooledResourceResolver {
        if (!resource) {
            log.error('empty resource for pooled resources');
            return this.defaultPooledResolver;
        }

        this.collection = resource;
        // binding here allows for us to access super fields in the abstract method
        return this.pooledResource.bind(this);
    }

    /**
     * The resolver returns the 'questions'
     * pooled collection. The question required in this test already exists.
     */
    protected pooledResource(type: string): PooledResourceResolver {
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
    private defaultPooledResolver: (type: string) => PooledResourceResolver = () => async () => undefined;
}
