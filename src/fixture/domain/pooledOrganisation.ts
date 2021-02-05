import { LinkedRepresentation } from 'semantic-link';
import { AbstractPooledResource, PooledResourceResolver } from '../../representation/sync/abstractPooledResource';
import CustomLinkRelation from './CustomLinkRelation';
import { Template } from './template';
import { Question } from './question';


export default class PooledOrganisation<T extends LinkedRepresentation> extends AbstractPooledResource<T> {

    protected makeResolvers(): Record<string, PooledResourceResolver> {
        return {
            [CustomLinkRelation.Question as string]: this.resolve(CustomLinkRelation.Questions as string, { pooledResolver: Question.syncPooled }),
            [CustomLinkRelation.Information as string]: this.resolve(CustomLinkRelation.Information as string, { readonly: true }),
            [CustomLinkRelation.Template as string]: this.resolve(CustomLinkRelation.Templates as string, { pooledResolver: Template.syncPooled }),
        };
    }

}

