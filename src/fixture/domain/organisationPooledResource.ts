import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import anylogger from 'anylogger';
import { AbstractPooledResource, PooledResolverType } from '../../representation/sync/abstractPooledResource';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import PooledCollectionUtil from '../../representation/sync/pooledCollectionUtil';
import CustomLinkRelation from './CustomLinkRelation';
import LinkRelation from '../../linkRelation';
import { ApiOptions } from '../../interfaces/apiOptions';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';
import { Template } from './template';
import { Question } from './question';

const log = anylogger('OrganisationPooledResource');

export type SyncFunction = <T extends LinkedRepresentation>(resource: T, document: T, ApiOptions?: ApiOptions) => Promise<void>;

export default class OrganisationPooledResource<T extends LinkedRepresentation> extends AbstractPooledResource<T> {
    constructor() {
        super();
        /*
         * Looks up the questions collection that is parented (global to) the organisation
         */
        this.rels = {
            [CustomLinkRelation.Question as string]: this.resolve(CustomLinkRelation.Questions as string, { pooledSync: Question.syncPooledQuestion }),
            [CustomLinkRelation.Information as string]: this.resolve(CustomLinkRelation.Information as string, { readonly: true }),
            [CustomLinkRelation.Template as string]: this.resolve(CustomLinkRelation.Templates as string, { pooledSync: Template.syncPooledTemplate }),
        };
    }

    /**
     *
     * @param rel
     * @param syncOptions
     * @private
     */
    private resolve(rel: string, syncOptions?: SyncOptions & { pooledSync?: SyncFunction }): PooledResolverType {
        return async <T extends LinkedRepresentation>(document: T, options?: PooledCollectionOptions): Promise<T | undefined> => {
            log.debug('resolve pooled %s %s', rel, LinkUtil.getUri(document, LinkRelation.Self));
            if (this.collection) {
                const resource = await PooledCollectionUtil.sync(
                    this.collection,
                    document as LinkedRepresentation,
                    { ...syncOptions, ...options, rel });

                /*
                 * If a pooled collection has linked representations, process here as a nest sync
                 */
                if (resource) {
                    syncOptions?.pooledSync?.(resource, document, options);
                }

                return resource as T;
            }

        };
    }
}

