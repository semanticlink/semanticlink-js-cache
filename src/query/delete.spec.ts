import {expect} from 'chai';
import {del} from './delete';
import sinon from 'sinon';
import * as cache from '../cache';
import {makeSparseCollectionResourceFromUri, makeSparseResourceFromUri} from '../cache/sparseResource';

global.Element = () => {
};

const stub = methodName => sinon.stub(cache, methodName)
    .returns(Promise.resolve());


describe('Delete', () => {

    let resourceFactory;

    const singleton = makeSparseResourceFromUri('https://api.example.com/1');
    const collection = makeSparseCollectionResourceFromUri('https://api.example.com/coll/1');

    it(cache.deleteResource.name, () => {
        resourceFactory = stub(cache.deleteResource.name);
        return del(singleton);
    });


    it(cache.deleteCollectionItem.name, () => {
        resourceFactory = stub(cache.deleteCollectionItem.name);
        return del(collection, {where: singleton});
    });

    afterEach((() => {
        expect(resourceFactory.called).to.be.true;
        resourceFactory.restore();
    }));

});
