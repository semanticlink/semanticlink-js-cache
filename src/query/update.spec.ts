import {expect} from 'chai';
import {update} from './update';
import sinon from 'sinon';
import * as cache from '../cache';
import {makeSparseResourceFromUri} from 'semantic-network/cache/sparseResource';

global.Element = () => {
};

const stub = methodName => sinon.stub(cache, methodName)
    .returns(Promise.resolve());


describe('Update', () => {

    let resourceFactory;

    const singleton = makeSparseResourceFromUri('https://api.example.com/1');

    it(cache.updateResource.name, () => {
        resourceFactory = stub(cache.updateResource.name);
        return update(singleton, singleton);
    });

    afterEach((() => {
        expect(resourceFactory.called).to.be.true;
        resourceFactory.restore();
    }));

});
