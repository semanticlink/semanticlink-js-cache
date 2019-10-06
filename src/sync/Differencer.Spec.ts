import {expect} from 'chai';
import {log} from '..';
import Differencer from './Differencer';

/**
 * semantic link library has a DOM dependency that we are faking out
 */
global.Element = () => {
};

describe('NOD Differencer', () => {
    const strategy = (method) => {
        return x => {
            log.info('Execute: ' + method);
            return Promise.resolve(x);
        };
    };

    /* @type {DifferencerOptions} */
    const options = {
        createStrategy: strategy('create'),
        updateStrategy: strategy('update'),
        deleteStrategy: strategy('delete')
    };

    /**
     *
     * @param {int} createdCount
     * @param {int} updatedCount
     * @param {int} deletedCount
     * @return {*}
     */
    const verifySyncCounts = (createdCount, updatedCount, deletedCount) => {
        return ([, created, updated, deleted]) => {
            expect(created.length).to.equal(createdCount, 'created');
            expect(updated.length).to.equal(updatedCount, 'updated');
            expect(deleted.length).to.equal(deletedCount, 'deleted');
        };
    };

    describe('Collections', () => {

        xdescribe('Match on default comparator of link relation self', () => {

            it('should have one update/match when identical', () => {

                const collection = {
                    'items': [
                        {
                            links: [{rel: 'self', href: 'http://example.com/item/1'}],
                            name: 'identical',
                        }
                    ]
                };

                return Differencer
                    .diffCollection(collection, collection, options)
                    .then(verifySyncCounts(0, 1, 0));
            });

            it('should match rel=self and update based on name', () => {

                const collection = {
                    'items': [
                        {
                            links: [{rel: 'self', href: 'http://example.com/item/1'}],
                            name: 'current',
                        }
                    ]
                };

                const document = {
                    'items': [
                        {
                            links: [{rel: 'self', href: 'http://example.com/item/1'}],
                            name: 'update to',
                        }
                    ]
                };

                return Differencer
                    .diffCollection(collection, document, options)
                    .then(verifySyncCounts(0, 1, 0));
            });

            it('should delete when item is removed from the list', () => {
                const collection = {
                    'items': [
                        {
                            links: [{rel: 'self', href: 'http://example.com/item/1'}],
                            name: 'I will be removed',
                        }
                    ]
                };

                const document = {
                    'items': []
                };

                return Differencer
                    .diffCollection(collection, document, options)
                    .then(verifySyncCounts(0, 0, 1));
            });

            it('should create when new item exists', () => {
                const collection = {
                    'items': []
                };

                const document = {
                    'items': [
                        {
                            links: [{rel: 'self', href: 'http://example.com/item/1'}],
                            name: 'create becase this is a new item',
                        }
                    ]
                };

                return Differencer
                    .diffCollection(collection, document, options)
                    .then(verifySyncCounts(1, 0, 0));

            });
        });

        describe('match on "name" attribute', () => {

            it('should sync document to resource collection', () => {

                const collection = {
                    'items': [
                        {
                            links: [{'rel': 'self', 'href': 'http://example.com/question/item/10'}],
                            name: 1,
                        },
                        {
                            links: [{'rel': 'self', 'href': 'http://example.com/question/item/11'}],
                            name: 2,
                        },
                        {
                            links: [{'rel': 'self', 'href': 'http://example.com/question/item/12'}],
                            name: 3,
                        }
                    ]
                };

                const document = {
                    'items': [
                        {
                            links: [{'rel': 'self', 'href': 'http://example.com/question/item/1'}],
                            name: 1,
                            update: 2
                        },
                        {
                            links: [{'rel': 'self', 'href': 'http://example.com/question/item/3'}],
                            name: 3,
                        },
                        {
                            links: [{'rel': 'self', 'href': 'http://example.com/question/item/4'}],
                            name: 4,
                            create: 4
                        }
                    ]
                };

                return Differencer
                    .diffCollection(collection, document, options)
                    .then(verifySyncCounts(1, 2, 1));

            });

        });

    });

    describe('Uri lists', () => {

        it('should make no changes on empty lists', () => {
            return Differencer
                .diffUriList([], [], options)
                .then(verifySyncCounts(0, 0, 0));

        });

        it('should match one new create', () => {
            return Differencer
                .diffUriList([], [1], options)
                .then(verifySyncCounts(1, 0, 0));

        });

        it('should match one delete', () => {
            return Differencer
                .diffUriList([1], [], options)
                .then(verifySyncCounts(0, 0, 1));

        });
        it('should match once create and one delete', () => {
            return Differencer
                .diffUriList([1, 2, 3], [3, 5], options)
                .then(verifySyncCounts(1, 0, 1));

        });
        it('should make no changes on identical lists', () => {
            return Differencer
                .diffUriList([1, 2, 3], [3, 2, 1], options)
                .then(verifySyncCounts(0, 0, 0));

        });

        it('should make no changes on identical lists of uris', () => {
            const uriList = [
                'http://example.com/question/item/1',
                'http://example.com/question/item/2',
                'http://example.com/question/item/3',
            ];
            return Differencer
                .diffUriList(uriList, uriList, options)
                .then(verifySyncCounts(0, 0, 0));

        });
    });
});
