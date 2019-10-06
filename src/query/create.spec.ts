import {expect} from 'chai';
import {create} from './create';
import sinon from 'sinon';
import * as cache from '../cache';
import {
    makeSparseCollectionResourceFromUri,
    makeSparseResourceFromUri
} from 'semantic-network/cache/sparseResource';

global.Element = () => {
};

const stub = methodName => sinon.stub(cache, methodName)
    .returns(Promise.resolve());


describe('Create', () => {

    let resourceFactory;

    const singleton = makeSparseResourceFromUri('https://api.example.com/1');
    const collection = makeSparseCollectionResourceFromUri('https://api.example.com/coll/1');

    it(cache.create.name, () => {
        resourceFactory = stub(cache.create.name);
        return create('HEAD', {rel: 'api'});
    });

    it(cache.createCollectionItem.name, () => {
        resourceFactory = stub(cache.createCollectionItem.name);
        return create(collection, {where: singleton});
    });

    afterEach((() => {
        expect(resourceFactory.called).to.be.true;
        resourceFactory.restore();
    }));

});
