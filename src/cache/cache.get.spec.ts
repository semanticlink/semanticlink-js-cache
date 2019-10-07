import {expect} from 'chai';
import * as cache from '.';
import State from './State';
import * as sinon from '@types/sinon';

// global.Element = () => {
// };

describe('Cache', () => {

    describe('Async: cache get/add resources - async promised-based', () => {

        describe('getResource', () => {

            it('retrieves the resource', () => {

                let stateFactory = sinon.stub(State, 'get')
                    .returns({
                        getResource: () => Promise.resolve({x: 4, links: []})
                    });

                return cache.getResource({})
                    .then((newResource) => {
                        expect(newResource.x).to.equal(4);
                        expect(newResource.links).to.not.be.null;
                        expect(stateFactory.called).to.be.true;
                        stateFactory.restore();
                    });
            });
        });

        describe('tryGetResource', () => {

            it('retrieves the resource when value', () => {

                let stateFactory = sinon.stub(State, 'tryGet')
                    .returns({
                        getResource: () => Promise.resolve({x: 4, links: []})
                    });

                return cache.tryGetResource({})
                    .then((newResource) => {
                        expect(newResource.x).to.equal(4);
                        expect(newResource.links).to.not.be.null;
                        expect(stateFactory.called).to.be.true;
                        stateFactory.restore();
                    });
            });

            it('returns default value when undefined', () => {

                let stateFactory = sinon.stub(State, 'tryGet')
                    .returns(undefined);

                return cache.tryGetResource({}, undefined)
                    .then((newResource) => {
                        expect(newResource).not.to.not.be.null;
                        expect(stateFactory.called).to.be.true;
                        stateFactory.restore();
                    });
            });
        });
    });
});
