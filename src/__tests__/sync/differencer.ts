import anylogger from 'anylogger';
import { SyncResultItem } from '../../interfaces/sync/types';
import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import Differencer from '../../representation/sync/differencer';
import { SyncOptions } from '../../interfaces/sync/syncOptions';

const log = anylogger('test');

interface TestRepresentation extends LinkedRepresentation {
    name: string
}

type TestCollection = CollectionRepresentation<TestRepresentation>;

describe('Differencer', () => {
    const strategy = (method: string) =>
        async (x: string) => {
            log.info('Execute: ' + method);
            return x;
        };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const options = {
        createStrategy: strategy('create'),
        updateStrategy: strategy('update'),
        deleteStrategy: strategy('delete'),
    } as SyncOptions;

    const verifySync = (
        { created, updated, deleted }: SyncResultItem,
        createdCount: number,
        updatedCount: number,
        deletedCount: number) => {
        expect(created.length).toStrictEqual(createdCount);
        expect(updated.length).toStrictEqual(updatedCount);
        expect(deleted.length).toStrictEqual(deletedCount);
    };

    describe('collections', () => {
        describe('Match on default comparator of link relation self', () => {
            it('should have one update/match when identical', async () => {
                const collection = {
                    links: [],
                    items: [
                        {
                            links: [{ rel: 'self', href: 'http://example.com/item/1' }],
                            name: 'identical',
                        },
                    ],
                } as TestCollection;

                const actual = await Differencer.difference(collection as any, collection as any, options);
                verifySync(actual, 0, 1, 0);
            });

            it('should match rel=self and update based on name', async () => {
                const collection = {
                    links: [],
                    items: [
                        {
                            links: [{ rel: 'self', href: 'http://example.com/item/1' }],
                            name: 'current',
                        },
                    ],
                };

                const document = {
                    links: [],
                    items: [
                        {
                            links: [{ rel: 'self', href: 'http://example.com/item/1' }],
                            name: 'update to',
                        },
                    ],
                };
                const actual = await Differencer.difference(collection as any, document as any, options);
                verifySync(actual, 0, 1, 0);
            });

            it('should delete when item is removed from the list', async () => {
                const collection = {
                    links: [],
                    items: [
                        {
                            links: [{ rel: 'self', href: 'http://example.com/item/1' }],
                            name: 'I will be removed',
                        },
                    ],
                };

                const document = {
                    links: [],
                    items: [],
                };

                const actual = await Differencer.difference(collection as any, document as any, options);
                verifySync(actual, 0, 0, 1);
            });

            it('should create when new item exists', async () => {
                const collection = {
                    links: [],
                    items: [],
                };

                const document = {
                    links: [],
                    items: [
                        {
                            links: [{ rel: 'self', href: 'http://example.com/item/1' }],
                            name: 'create becase this is a new item',
                        },
                    ],
                };

                const actual = await Differencer.difference(collection as any, document as any, options);
                verifySync(actual, 1, 0, 0);
            });
        });

        describe('match on "name" attribute', () => {
            it('should sync document to resource collection', async () => {
                const collection = {
                    links: [],
                    items: [
                        {
                            links: [{ rel: 'self', href: 'http://example.com/question/item/10' }],
                            name: 1,
                        },
                        {
                            links: [{ rel: 'self', href: 'http://example.com/question/item/11' }],
                            name: 2,
                        },
                        {
                            links: [{ rel: 'self', href: 'http://example.com/question/item/12' }],
                            name: 3,
                        },
                    ],
                };

                const document = {
                    links: [],
                    items: [
                        {
                            links: [{ rel: 'self', href: 'http://example.com/question/item/1' }],
                            name: 1,
                            update: 2,
                        },
                        {
                            links: [{ rel: 'self', href: 'http://example.com/question/item/3' }],
                            name: 3,
                        },
                        {
                            links: [{ rel: 'self', href: 'http://example.com/question/item/4' }],
                            name: 4,
                            create: 4,
                        },
                    ],
                };

                const actual = await Differencer.difference(collection as any, document as any, options);
                verifySync(actual, 1, 2, 1);
            });
        });
    });

});
