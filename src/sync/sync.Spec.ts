import {expect} from 'chai';
import * as syncRepresentation from './syncLinkedRepresentation';
import * as syncUriList from './syncUriList';
import {sync} from './';
import sinon from 'sinon';
import {makeSparseCollectionResourceFromUri, makeSparseResourceFromUri} from '../cache/sparseResource';

global.Element = () => {
};

const stub = methodName => sinon.stub(syncRepresentation, methodName)
    .returns(Promise.resolve());

const singleton = makeSparseResourceFromUri('https://api.example.com/1');
const collection = makeSparseCollectionResourceFromUri('https://api.example.com/coll/1');

describe('sync', () => {

    let syncFactory;

    it('resource', () => {
        syncFactory = stub(syncRepresentation.getResource.name);
        return sync({resource: singleton, document: singleton});
    });

    describe('defaults', function () {

        it('resource no strategy', () => {
            syncFactory = stub(syncRepresentation.getResource.name);
            return sync({resource: singleton, document: singleton, options: {}});
        });

        it('resource no options', () => {
            syncFactory = stub(syncRepresentation.getResource.name);
            return sync({resource: singleton, document: singleton, strategies: []});
        });

        it('resource no options', () => {
            syncFactory = stub(syncRepresentation.getResource.name);
            return sync({resource: singleton, document: singleton, strategies: [], options: {}});
        });

    });

    it('resource in collection', () => {
        syncFactory = stub(syncRepresentation.getResourceInCollection.name);
        return sync({resource: collection, document: singleton});
    });

    it('named singleton resource', () => {
        syncFactory = stub(syncRepresentation.getSingleton.name);
        return sync({resource: singleton, rel: /me/, document: singleton});
    });

    it('resource in named collection', () => {
        syncFactory = stub(syncRepresentation.getResourceInNamedCollection.name);
        return sync({resource: collection, rel: /me/, document: singleton});
    });

    it('named collection in named collection', () => {
        syncFactory = stub(syncRepresentation.getCollectionInNamedCollection.name);
        return sync({resource: collection, rel: /todos/, document: {...collection, todos: collection}});
    });

    describe('UriList', function () {

        const uriList = ['http://api.example.com/1', 'http://api.example.com/1'];

        it('url list', () => {
            syncFactory = sinon.stub(syncUriList, syncUriList.getUriListOnNamedCollection.name)
                .returns(Promise.resolve());
            return sync({resource: singleton, rel: /todos/, document: uriList});
        });

    });
    afterEach((() => {
        expect(syncFactory.called).to.be.true;
        syncFactory.restore();
    }));

});