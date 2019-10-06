import {expect} from 'chai';
import * as link from 'semantic-link';
import {
    differenceCollection,
    findResourceInCollection,
    findResourceInCollectionByRel,
    findResourceInCollectionByRelAndAttribute,
    findResourceInCollectionByRelOrAttribute,
    clone, pushResource
} from './collection';

global.Element = () => {
};


describe('Collection mixins', () => {

    let document = {
        links: [{
            rel: 'self', href: 'http://api.example.com/role/1'
        }],
        name: 'Admin'
    };

    let collection = {
        links: [
            {rel: 'self', href: 'http://api.example.com/role/'}
        ],
        items: [document]
    };

    describe('differenceCollection', () => {

        describe('Collection', () => {

            it('should return empty if sets both empty', () => {
                expect(differenceCollection({}, {})).to.deep.equal([]);
            });

            it('should return empty if sets are the same', () => {
                expect(differenceCollection(collection, collection)).to.deep.equal([]);
            });

            describe('different collection', () => {

                let document2 = {
                    links: [{
                        rel: 'self', href: 'http://api.example.com/role/2'
                    }],
                    name: 'NOtAdmin'
                };

                let collection1 = {
                    items: [document]
                };
                let collection2 = {
                    items: [document, document2]
                };

                it('should return missing document', () => {
                    expect(differenceCollection(collection2, collection1)).to.deep.equal([document2]);
                });

                it('should return empty if sets are the same', () => {
                    expect(differenceCollection(collection1, collection2)).to.deep.equal([]);
                });

            });
        });

        describe('LinkedRepresentation[]', () => {

            it('should return empty if set are both empty', () => {
                expect(differenceCollection([])).to.deep.equal([]);
            });

            it('should return empty if sets are the same', () => {
                expect(differenceCollection([document], [document])).to.deep.equal([]);
            });

            describe('different collection', () => {

                let document2 = {
                    links: [{
                        rel: 'self', href: 'http://api.example.com/role/2'
                    }],
                    name: 'NOtAdmin'
                };

                let collection1 = [document];
                let collection2 = [document, document2];

                it('should return missing document', () => {
                    expect(differenceCollection(collection2, collection1)).to.deep.equal([document2]);
                });

                it('should return empty if sets are the same', () => {
                    expect(differenceCollection(collection1, collection2)).to.deep.equal([]);
                });

            });

        });

    });

    describe('_.pushResource', () => {

        beforeEach(() => {
            document = {
                links: [{
                    rel: 'self', href: 'http://api.example.com/role/1'
                }],
                name: 'Admin'
            };
        });

        let document2 = {
            links: [{
                rel: 'self', href: 'http://api.example.com/role/1'
            }],
            name: 'Admin'
        };
        let document3 = {
            links: [{
                rel: 'self', href: 'http://api.example.com/role/2'
            }],
            name: 'Admin2'
        };

        it('should push onto empty array', () => {
            const result = pushResource([], document2);
            expect(result).to.deep.equal([document2]);
        });

        it('should not push when resource already exists', () => {
            const result = pushResource([document], document2);
            expect(result).to.deep.equal([document]);
        });

        it('should push if new', () => {
            const result = pushResource([document], document2);
            const result2 = pushResource(result, document3);
            expect(result2).to.deep.equal([document, document3]);
        });
    });

    describe('findResourceInCollectionByRelOrAttribute', () => {
        it('document with uri', () => {
            let found = findResourceInCollectionByRelOrAttribute(collection, 'http://api.example.com/role/1');
            expect(found).to.deep.equal(document);
        });

        it('document with name as default', () => {
            let found = findResourceInCollectionByRelOrAttribute(collection, 'Admin');
            expect(found).to.deep.equal(document);
        });

        it('document with name', () => {
            let found = findResourceInCollectionByRelOrAttribute(collection, 'Admin', 'name');
            expect(found).to.deep.equal(document);
        });

        it('document with title not found', () => {
            let notFound = findResourceInCollectionByRelOrAttribute(collection, 'Admin', 'title');
            expect(notFound).to.be.undefined;
        });

        it('document with default attribute title returns not found as undefined', () => {
            let notFound = findResourceInCollectionByRelOrAttribute(collection, 'http://api.example.com/role/1', /up/);
            expect(notFound).to.be.undefined;
        });
    });

    describe('findResourceInCollection', () => {

        it('document with self and name returns item in collection', () => {
            let found = findResourceInCollection(collection, document);
            expect(found).to.deep.equal(document);
        });

        it('document with self and without name returns item in collection', () => {
            let resource = {
                links: [{
                    rel: 'self', href: 'http://api.example.com/role/1'
                }]
            };

            let found = findResourceInCollection(collection, resource);
            expect(found).to.deep.equal(document);
        });

        it('document without self and with name returns item from collection and not resource as search input', () => {
            let resource = {
                links: [{
                    rel: 'self', href: 'http://api.example.com/role/2'
                }],
                name: 'Admin'
            };

            let found = findResourceInCollection(collection, resource, 'name');
            expect(found).to.deep.equal(document);
            expect(link.getUri(found, /self/)).not.to.equal(link.getUri(resource, /self/));
        });

        it('document with self and title returns item in collection', () => {

            let documentWithTitle = {
                links: [{
                    rel: 'self', href: 'http://api.example.com/role/1'
                }],
                title: 'Admin'
            };

            let collectionWithTitleDocument = {
                links: [
                    {rel: 'self', href: 'http://api.example.com/role/'}
                ],
                items: [documentWithTitle]
            };

            let found = findResourceInCollection(collectionWithTitleDocument, documentWithTitle);
            expect(found).to.equal(documentWithTitle);
        });

        describe('different attribute name', () => {
            const documentWithUndefinedName = {
                links: [
                    {rel: 'self', href: 'http://localhost:1080/role/49'}
                ],
                name: undefined
            };
            const item = {
                links: [
                    {rel: 'self', href: 'http://localhost:1080/role/49'}
                ],
                name: 'Administrator'
            };
            const collection = {
                links: [{rel: 'self', href: 'http://localhost:1080/tenant/12/role/'}],
                items: [item],
            };

            it('should should return a resource on self when attribute name or link relation is undefined', () => {
                let found = findResourceInCollection(collection, documentWithUndefinedName, undefined);
                expect(found).to.equal(item);
            });

            it('should should return a resource on self when mapping overrides link relation matching on name', () => {
                let found = findResourceInCollection(collection, documentWithUndefinedName, 'name');
                expect(found).to.equal(item);
            });
        });
    });

    describe('findResourceInCollectionByRelAndAttribute', () => {

        let document = {
            links: [{
                rel: 'self', href: 'http://api.example.com/role/1'
            }],
            name: 'Admin'
        };

        let collection = {
            links: [
                {rel: 'self', href: 'http://api.example.com/role/'}
            ],
            items: [document]
        };

        it('should return document', () => {
            let found = findResourceInCollectionByRelAndAttribute(collection, document, /self/, 'name');
            expect(found).to.deep.equal(document);
        });

        it('should return document with resource identifier as document with defaults', () => {
            let found = findResourceInCollectionByRelAndAttribute(collection, document);
            expect(found).to.deep.equal(document);
        });

        it('should not return a document on non-matching attribute', () => {
            let notFound = findResourceInCollectionByRelAndAttribute(collection, document, /self/, 'title');
            expect(notFound).to.be.undefined;
        });

        it('should not return a document on non-matching link relation', () => {
            let notFound = findResourceInCollectionByRelAndAttribute(collection, document, /not-found/, 'name');
            expect(notFound).to.be.undefined;
        });

        it('should not return a document on non-matching link relation and attribute', () => {
            let notFound = findResourceInCollectionByRelAndAttribute(collection, document, /not-found/, 'title');
            expect(notFound).to.be.undefined;
        });

    });

    describe('findResourceInCollectionByUri', () => {

        it('document with self and name returns item in collection', () => {
            let found = findResourceInCollection(collection, document);
            expect(found).to.deep.equal(document);
        });

        it('document with self and without name returns item in collection', () => {
            let resource = {
                links: [{
                    rel: 'self', href: 'http://api.example.com/role/1'
                }]
            };

            let found = findResourceInCollectionByRel(collection, resource);
            expect(found).to.deep.equal(document);
        });

        it('document without self and with name returns item from collection and not resource as search input', () => {

            let resource = {
                links: [{
                    rel: 'parent', href: 'http://api.example.com/role/2'
                }],
                name: 'Admin'
            };

            let found = findResourceInCollectionByRel(collection, resource, 'parent');
            expect(found).to.be.undefined;
        });
    });

    describe('clone()', () => {

        it('should be able to detach an array of objects', () => {
            const resource = {items: [{name: 'i'}]};
            const document = [{name: 'i'}];
            const result = clone(resource.items);
            expect(result).to.deep.equal(document);
        });

        it('should be able to detail a collection of items', () => {
            const resource = {items: [{name: 'i'}]};
            const document = [{name: 'i'}];
            const result = clone(resource);
            expect(result).to.deep.equal(document);
        });

        it('should return object on null', () => {
            expect(clone(null)).to.deep.equal([]);
        });

        it('should return object on undefined', () => {
            expect(clone(undefined)).to.deep.equal([]);
        });

    });


});