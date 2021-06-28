import { LinkedRepresentation } from 'semantic-link';
import {
    PooledResource,
    PooledResourceResolver,
    RelName,
} from '../../sync/pooledResource';
import { CustomLinkRelation } from './customLinkRelation';
import { Question } from './question';


export class PooledOrganisation<T extends LinkedRepresentation> extends PooledResource<T> {

    protected makeResolvers(): Record<RelName, PooledResourceResolver> {
        return {
            [CustomLinkRelation.Question as string]: this.resolve(CustomLinkRelation.Questions as string, { pooledResolver: Question.syncPooled }),
            [CustomLinkRelation.Information as string]: this.resolve(CustomLinkRelation.Information as string, { readonly: true }),
        };
    }

}

