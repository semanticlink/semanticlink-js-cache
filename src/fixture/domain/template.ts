import { LinkedRepresentation } from 'semantic-link';
import { ApiOptions } from '../../interfaces/apiOptions';
import { sync } from '../../representation/sync';
import CustomLinkRelation from './CustomLinkRelation';
import { UriFieldResolver } from '../../representation/sync/uriFieldResolver';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import anylogger from 'anylogger';

const log = anylogger('Template');

export class Template {

    /**
     * Synchronise on the {@link TemplateRepresentation} its child {@link ContentRepresentation}.
     *
     * In the text field, the content also requires field resolution with the new fields added to the template
     */
    public static async syncPooledTemplate<T extends LinkedRepresentation>(resource: T, document: T, cacheOptions?: ApiOptions): Promise<void> {
        await sync({
            resource,
            document,
            strategies: [
                syncResult => sync({ ...syncResult, rel: CustomLinkRelation.Fields }),
                ({ resource, document, options }) => {
                    return sync({
                        resource,
                        document,
                        rel: CustomLinkRelation.Content,
                        options: {
                            ...options,
                            /*
                             * The text of the template is prosemirror JSON that requires Id resolution
                             * for field resources (from the strategy above)
                             */
                            fieldResolver: (field, value) => {
                                if (field === 'text' && value) {
                                    if (cacheOptions?.resolver) {
                                        log.debug('resolve field \'%s\'', field);
                                        return UriFieldResolver.resolve(value, cacheOptions?.resolver);
                                    }
                                } // else no resolution required
                                return value;
                            },
                        } as SyncOptions,
                    });
                },
            ],
            options: cacheOptions,
        });
    }
}
