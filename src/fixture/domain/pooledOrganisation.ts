import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import anylogger from 'anylogger';
import { AbstractPooledResource, PooledResourceResolver } from '../../representation/sync/abstractPooledResource';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import PooledCollectionUtil from '../../representation/sync/pooledCollectionUtil';
import CustomLinkRelation from './CustomLinkRelation';
import LinkRelation from '../../linkRelation';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';
import { Template } from './template';
import { Question } from './question';

const log = anylogger('PooledOrganisation');


export default class PooledOrganisation<T extends LinkedRepresentation> extends AbstractPooledResource<T> {

    protected makeResolvers(): Record<string, PooledResourceResolver> {
        return {
            [CustomLinkRelation.Question as string]: this.resolve(CustomLinkRelation.Questions as string, { pooledResolver: Question.syncPooled }),
            [CustomLinkRelation.Information as string]: this.resolve(CustomLinkRelation.Information as string, { readonly: true }),
            [CustomLinkRelation.Template as string]: this.resolve(CustomLinkRelation.Templates as string, { pooledResolver: Template.syncPooled }),
        };
    }

    private resolve(rel: string, options?: SyncOptions): PooledResourceResolver {

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
}

