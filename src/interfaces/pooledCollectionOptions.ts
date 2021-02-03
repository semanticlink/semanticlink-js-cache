import { Resolver } from './resolver';
import { RelationshipType } from 'semantic-link';

export interface PooledCollectionOptions {

    readonly resolver?: Resolver;
    readonly rel?: RelationshipType;


}
