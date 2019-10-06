import * as PooledCollection from './PooledCollection';
import { expect } from 'chai';
import sinon from 'sinon';
import * as cache from '../cache';

describe('Pooled collection', () => {

    let document = {
        links: [{
            rel: 'self', href: 'http://api.example.com/role/1'
        }],
        name: 'Admin'
    };

    let pooledCollection = {
        links: [
            {rel: 'self', href: 'http://api.example.com/role/'}
        ],
        items: [document]
    };

    let parentCollection = {
        links: [
            {rel: 'self', href: 'http://api.example.com/collection/'},
            {rel: 'roles', href: 'http://api.example.com/role/'},
        ],
        roles: pooledCollection
    };

    sinon.stub(cache, 'getNamedCollection')
        .callsFake(() => Promise.resolve(pooledCollection));

    describe('strategy one & two: it is simply found map it based on self and/or mappedTitle', () => {

        let resource = {
            links: [{
                rel: 'self', href: 'http://api.example.com/role/2'
            }],
            name: 'Admin'
        };

        it('returns document based on uri/name matching', () => {
            PooledCollection
                .getPooledCollection(parentCollection, 'roles', /roles/, resource)
                .then(representation => {
                    expect(representation).to.deep.equal(document);
                });
        });

        // it('returns document based on uri only matching', () => {
        //     document.name = undefined;
        //     nodCollection
        //         .getResourceInNamedCollection(parentCollection, 'roles', /roles/, document)
        //         .then(representation => {
        //             expect(representation).to.deep.equal(document);
        //         });
        // });

        it('add uris to the resolution map when existing resource', () => {
            let documentUriResolved;
            let nodUriResolved;
            let options = {
                resolver: {
                    add: (l, r) => {
                        documentUriResolved = l;
                        nodUriResolved = r;
                    }
                }
            };
            PooledCollection
                .getPooledCollection(parentCollection, 'roles', /roles/, resource, options)
                .then(() => {
                    expect(documentUriResolved).to.equal('http://api.example.com/role/2');
                    expect(nodUriResolved).to.equal('http://api.example.com/role/1');
                });
        });
    });

    describe('strategy three: check to see if self is an actual resource anyway and map it if it is, otherwise make', () => {

        let resource = {
            links: [{
                rel: 'self', href: 'http://api.example.com/role/2'
            }],
            name: 'NewRole'
        };

        it('should find self, resolve uri and then return resource', () => {
            let options = {
                resolver: {
                    resolve: resolving => {
                        expect(resolving).to.equal('http://api.example.com/role/2');
                        // we just say here that we've already got it - so return this from the known collection
                        return 'http://api.example.com/role/1';
                    }
                }
            };
            return PooledCollection
                .getPooledCollection(parentCollection, 'roles', /roles/, resource, options)
                .then(representation => {
                    expect(representation).to.deep.equal(document);

                });
        });

        it('should find self and then make resource with add mapping', () => {
            let options = {
                resolver: {
                    resolve: resolving => resolving,
                    add: (documentUri, nodUri) => {
                        expect(documentUri).to.equal('http://api.example.com/role/2');
                        expect(nodUri).to.equal('http://api.example.com/role/3');
                    },
                }
            };

            let createdResource = {
                links: [{
                    rel: 'self', href: 'http://api.example.com/role/3'
                }],
                name: 'NewRole'
            };

            sinon.stub(cache, 'createCollectionItem')
                .callsFake(() => Promise.resolve(createdResource));

            return PooledCollection
                .getPooledCollection(parentCollection, 'roles', /roles/, resource, options)
                .then(representation => {
                    expect(representation).to.equal(createdResource);
                    cache.createCollectionItem.restore();
                });

        });
    });

    describe('strategy four: make if we can because we at least might have the attributes', () => {

        it('should make resource', () => {

            let resource = {
                links: [],
                name: 'UtterlyNewRole'
            };

            let addResolverCalled = false;

            let options = {
                resolver: {
                    resolve: resolving => resolving,
                    add: () => {
                        addResolverCalled = true;
                    },
                }
            };

            let createdResource = {
                links: [{
                    rel: 'self', href: 'http://api.example.com/role/3'
                }],
                name: 'UtterlyNewRole'
            };

            sinon.stub(cache, 'createCollectionItem')
                .callsFake(() => Promise.resolve(createdResource));

            return PooledCollection
                .getPooledCollection(parentCollection, 'roles', /roles/, resource, options)
                .then(representation => {
                    expect(representation).to.equal(createdResource);
                    expect(addResolverCalled).to.be.false;
                    cache.createCollectionItem.restore();
                });
        });

    });

});
