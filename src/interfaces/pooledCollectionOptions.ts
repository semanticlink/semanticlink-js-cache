import { Resolver } from './resolver';
import { RelationshipType } from 'semantic-link';
import { ResourceResolver } from './resourceResolver';


export interface PooledCollectionOptions {

    readonly resolver?: Resolver;
    readonly rel?: RelationshipType;
    readonly resourceResolver?: ResourceResolver;

}
