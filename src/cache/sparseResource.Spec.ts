import {expect} from 'chai';
import State from './State';
import * as SparseResource from './sparseResource';
import StateEnum from './StateEnum';

global.Element = () => {
};

/**
 * Increasing counter to create new & unique resource names
 * @type {number}
 */
let repCount = 1;

/**
 * Return an url based on the incremented counter to make href unique
 * @param {string=} prefix=http://example.com/
 * @return {string} of url type
 */
const uniqueUri = () => `http://example.com/${++repCount}`;

describe('Cache', () => {
    let linkedRepresentation, feedRepresentation;

    describe('Sparse resource', () => {

        describe('Unknown state', () => {
            beforeEach(() => {
                linkedRepresentation = SparseResource.makeSparseResourceFromUri(uniqueUri());
            });

            describe('makeUnknownResourceAddedToResource', () => {

                it('Does not add a tracked resource into state when attribute of same name exists', () => {
                    linkedRepresentation.name = 'N';
                    const result = SparseResource.makeUnknownResourceAddedToResource(linkedRepresentation, 'name');

                    expect(result).to.equal('N');
                    expect(State.get(linkedRepresentation).isTracked('name')).to.be.false;
                });

                it('Does add a tracked resource into state when attribute of same name does not exist', () => {
                    const result = SparseResource.makeUnknownResourceAddedToResource(linkedRepresentation, 'name');

                    expect(result).to.not.be.null;
                    expect(State.get(linkedRepresentation).isTracked('name')).to.be.true;
                    expect(State.get(result).getStatus()).to.equal(StateEnum.unknown);
                });

                it('Makes a new one with defaults', () => {
                    const result = SparseResource.makeUnknownResourceAddedToResource(linkedRepresentation, 'name', {
                        attr1: 'value'
                    });
                    expect(result.attr1).to.equal('value');
                });

                it('has a set of links that are properly formed', () => {
                    expect(linkedRepresentation.links).to.be.an('array');
                    expect(linkedRepresentation.links[0].rel).to.be.a('string');
                    expect(linkedRepresentation.links[0].href).to.be.a('string');
                });
            });

            describe('makeUnknownCollectionAddedToResource', () => {
                it('Does not add a tracked resource into state when attribute of same name exists', () => {
                    const feed = SparseResource.makeSparseResourceFromUri(uniqueUri());
                    feed.items = [
                        {id: uniqueUri(), title: 'a'},
                        {id: uniqueUri(), title: 'b'},
                    ];
                    linkedRepresentation.name = feed;

                    const result = SparseResource.makeUnknownCollectionAddedToResource(linkedRepresentation, 'name');

                    expect(result).to.equal(feed);
                    expect(State.get(linkedRepresentation).isTracked('name')).to.be.false;

                });

                it('Does add a tracked resource into state when attribute of same name does not exist', () => {
                    const result = SparseResource.makeUnknownCollectionAddedToResource(linkedRepresentation, 'name');

                    expect(result).to.not.be.null;
                    expect(State.get(linkedRepresentation).isTracked('name')).to.be.true;
                    expect(State.get(result).getStatus()).to.equal(StateEnum.unknown);
                });

                it('Makes a new one with defaults including empty items attribute', () => {
                    const result = SparseResource.makeUnknownCollectionAddedToResource(linkedRepresentation, 'name', {
                        attr1: 'value'
                    });
                    expect(result.attr1).to.equal('value');
                    expect(result.items).to.not.be.null;
                    expect(result.items.length).to.equal(0);
                });

                it('Makes a new one with defaults with items provided', () => {
                    const defaultValues = {
                        attr1: 'value',
                        items: [{
                            id: 'http://example.com',
                            title: 'bla'
                        }]
                    };
                    const result = SparseResource.makeUnknownCollectionAddedToResource(linkedRepresentation, 'name', defaultValues);
                    expect(result.attr1).to.equal('value');
                    expect(result.items.length).to.equal(1);
                    expect(result.items[0].id).to.equal('http://example.com');
                });

            });

            describe('makeUnknownResourceAddedToCollection', () => {
                beforeEach(() => {
                    feedRepresentation = SparseResource.makeSparseCollectionResourceFromUri(uniqueUri());
                });
                it('Does add a new item to the collection', () => {
                    const result = SparseResource.makeUnknownResourceAddedToCollection(feedRepresentation);

                    expect(result).to.not.be.null;
                    expect(feedRepresentation.items).to.deep.equal([result]);
                });

                it('Makes a new one with defaults', () => {
                    const result = SparseResource.makeUnknownResourceAddedToCollection(feedRepresentation, {
                        extra: 3
                    });
                    expect(result.extra).to.equal(3);
                    expect(feedRepresentation.items).to.deep.equal([result]);
                });
            });

        });

        describe('LocationOnly state', () => {

            describe('addCollectionResourceItemByUri', () => {
                beforeEach(() => {
                    feedRepresentation = SparseResource.makeSparseCollectionResourceFromUri(uniqueUri());
                });

                it('add', () => {
                    const uri = uniqueUri();
                    const result = SparseResource.makeCollectionResourceItemByUri(feedRepresentation, uri);

                    expect(result.links).to.deep.equal([{rel: 'self', href: uri}]);
                    expect(feedRepresentation.items).to.deep.equal([result]);
                    expect(State.get(result).getStatus()).not.to.equal(StateEnum.hydrated);
                    expect(State.get(result).getStatus()).to.equal(StateEnum.locationOnly);
                });

                it('add with defaults', () => {
                    const defaultLinked = {
                        extra: 3
                    };
                    const result = SparseResource.makeCollectionResourceItemByUri(feedRepresentation, uniqueUri(), defaultLinked);

                    expect(result.extra).to.equal(3);
                    expect(result.items).to.be.undefined;
                });
            });
        });

    });

});