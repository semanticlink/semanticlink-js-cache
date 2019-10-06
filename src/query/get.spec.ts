import {expect} from 'chai';
import {get} from './get';
import sinon from 'sinon';
import * as cache from '../cache';
// make sure that you stub the js implementation and not the type declaration
import * as http from 'semantic-link/lib/http';
import {
    makeSparseCollectionResourceFromUri,
    makeSparseResourceFromUri
} from 'semantic-network/cache/sparseResource';

global.Element = () => {
};

const stub = methodName => sinon.stub(cache, methodName)
    .returns(Promise.resolve());

const stubGet = result => sinon.stub(http, http.get.name).returns(Promise.resolve({data: result}));

describe('Get', () => {

    let resourceFactory;

    const singleton = makeSparseResourceFromUri('https://api.example.com/1');
    const collection = makeSparseCollectionResourceFromUri('https://api.example.com/coll/1');

    it(cache.getResource.name, () => {
        resourceFactory = stub(cache.getResource.name);
        return get(singleton);
    });

    it(cache.tryGetResource.name, () => {
        resourceFactory = stub(cache.tryGetResource.name);
        return get(singleton, {defaultRepresentation: {}});
    });

    it(cache.getCollection.name, () => {
        resourceFactory = stub(cache.getCollection.name);
        return get(collection);
    });

    it(cache.getCollectionItem.name, () => {
        resourceFactory = stub(cache.getCollectionItem.name);
        return get(collection, {where: {links: [{rel: 'self', href: 'https://api.example.com/item/1'}]}});
    });

    it(cache.getCollectionItemByUri.name, () => {
        resourceFactory = stub(cache.getCollectionItemByUri.name);
        return get(collection, {where: 'https://api.example.com/item/1'});
    });

    describe('Named resources', () => {

        let getFactory;

        describe('Singleton', () => {

            beforeEach(() => {
                getFactory = stubGet(singleton);
            });

            it(`${cache.getSingleton.name} on resource`, () => {
                resourceFactory = stub(cache.getSingleton.name);
                return get(singleton, {rel: 'tags'});
            });

            it(`${cache.getSingleton.name} on collection`, () => {
                resourceFactory = stub(cache.getSingleton.name);
                return get(collection, {rel: 'tags'});
            });


            it(`${cache.getSingleton.name} on resource long form string`, () => {
                resourceFactory = stub(cache.getSingleton.name);
                return get(singleton, 'tags');
            });

            it(`${cache.getSingleton.name} on collection long form regex`, () => {
                resourceFactory = stub(cache.getSingleton.name);
                return get(collection, /tags/);
            });

            it(`${cache.tryGetSingleton.name} on resource`, () => {
                resourceFactory = stub(cache.tryGetSingleton.name);
                return get(singleton, {rel: 'tags', defaultRepresentation: {}});
            });

            it(`${cache.tryGetSingleton.name} on resource longest from`, () => {
                resourceFactory = stub(cache.tryGetSingleton.name);
                return get(singleton, /tags/, {defaultRepresentation: {}});
            });


        });

        describe('Collection', () => {

            beforeEach(() => {
                getFactory = stubGet(collection);
            });

            it(`${cache.getNamedCollection.name} on singleton`, () => {
                resourceFactory = stub(cache.getNamedCollection.name);
                return get(singleton, {rel: 'tags'});
            });

            it(`${cache.getNamedCollection.name} on collection`, () => {
                resourceFactory = stub(cache.getNamedCollection.name);
                return get(collection, {rel: 'tags'});
            });

            it(cache.getNamedCollectionAndItems.name, () => {
                resourceFactory = stub(cache.getNamedCollectionAndItems.name);
                return get(singleton, {rel: 'tags', includeItems: 'items'});
            });


            it(`${cache.getNamedCollectionAndItems.name} with includeItems as true`, () => {
                resourceFactory = stub(cache.getNamedCollectionAndItems.name);
                return get(singleton, {rel: 'tags', includeItems: true});
            });

            it(cache.getNamedCollectionItemByUri.name, () => {
                resourceFactory = stub(cache.getNamedCollectionItemByUri.name);
                return get(singleton, {rel: 'tags', where: 'https://api.example.com/item/1'});
            });

        });

        afterEach((() => {
            expect(getFactory.called).to.be.true;
            getFactory.restore();
        }));

    });

    it(cache.tryGetNamedCollectionAndItemsOnCollectionItems.name, () => {
        resourceFactory = stub(cache.tryGetNamedCollectionAndItemsOnCollectionItems.name);
        return get(collection, {rel: 'tags', includeItems: 'items'});
    });

    it(cache.getNamedCollectionOnSingletons.name, () => {
        resourceFactory = stub(cache.getNamedCollectionOnSingletons.name);
        return get([singleton, singleton], {rel: 'tags'});
    });


    afterEach((() => {
        expect(resourceFactory.called).to.be.true;
        resourceFactory.restore();
    }));

});
