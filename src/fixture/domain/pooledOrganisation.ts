import { LinkedRepresentation } from 'semantic-link';
import {
    AbstractPooledResource,
    PooledResourceResolver,
    RelName
} from '../../representation/sync/abstractPooledResource';
import CustomLinkRelation from './CustomLinkRelation';
import { Question } from './question';


export default class PooledOrganisation<T extends LinkedRepresentation> extends AbstractPooledResource<T> {

    protected makeResolvers(): Record<RelName, PooledResourceResolver> {
        return {
            [CustomLinkRelation.Question as string]: this.resolve(CustomLinkRelation.Questions as string, { pooledResolver: Question.syncPooled }),
            [CustomLinkRelation.Information as string]: this.resolve(CustomLinkRelation.Information as string, { readonly: true }),
        };
    }

}

