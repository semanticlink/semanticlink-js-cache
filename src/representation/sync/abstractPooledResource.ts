import { LinkedRepresentation } from 'semantic-link';
import anylogger from 'anylogger';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';

const log = anylogger('AbstractPooledResource');

export type PooledResolverType = <T extends LinkedRepresentation>(resource: T, options?: PooledCollectionOptions) => Promise<T | undefined>;

export abstract class AbstractPooledResource<T extends LinkedRepresentation> {
    /**
     * the 'tenanted' home of the sub collections
     */
    protected collection: T | undefined;

    protected rels: Record<string, PooledResolverType>;

    protected constructor(rels?: Record<string, PooledResolverType>) {
        this.rels = rels ?? {};
    }

    public init(resource: T): (type: string) => PooledResolverType {
        if (!resource) {
            log.error('empty resource for pooled resources');
            return this.defaultPooledResolver;
        }

        this.collection = resource;
        // binding here allows for us to access super fields in the abstract method
        return this.pooledResource.bind(this);
    }

    /**
     * Demonstrate the use of a resolver for this network of data. The resolver returns the 'questions'
     * pooled collection. The question required in this test already exists.
     */
    protected pooledResource(type: string): PooledResolverType {
        if (this.rels[type]) {
            log.debug('resolving resource pool type: %s', type);
            return this.rels[type];
        } else {
            return async () => undefined;
        }
    }

    /**
     * Default resolves returns a noop undefined
     */
    private defaultPooledResolver: (type: string) => PooledResolverType = () => async () => undefined;
}
