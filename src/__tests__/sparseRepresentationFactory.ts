import { CollectionRepresentation, LinkUtil } from 'semantic-link';
import { assertThat } from 'mismatched';
import {
    collectionRepresentation,
    linkedRepresentation,
    RepresentationMatcher,
    singletonRepresentation,
} from './helpers/representationMatcher';
import { Status } from '../representation/status';
import each from 'jest-each';
import SparseRepresentationFactory from '../representation/sparseRepresentationFactory';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import TrackedRepresentationUtil from '../utils/trackedRepresentationUtil';
import LinkRelation from '../linkRelation';

describe('Sparse Representation Factory', () => {

    describe('make', () => {
        each([
            ['sparse, singleton, unknown (undefined)', undefined, singletonRepresentation, Status.virtual, false],
            ['sparse, singleton, unknown (null)', null, singletonRepresentation, Status.virtual, false],
            ['sparse, singleton, unknown (empty)', {}, singletonRepresentation, Status.virtual, false],
            ['sparse, singleton, location only (default)', { uri: 'http://example.com/1' }, singletonRepresentation, Status.locationOnly, true],
            ['sparse, singleton, location only (explicit)', {
                uri: 'http://example.com/1',
                sparseType: 'singleton',
            }, singletonRepresentation, Status.locationOnly, true],
            ['sparse, collection, location only', {
                uri: 'http://example.com/1',
                sparseType: 'collection',
            }, collectionRepresentation, Status.locationOnly, true],
            ['sparse, singleton, on (undefined)', {
                uri: 'http://example.com/1',
                on: undefined,
            }, singletonRepresentation, Status.locationOnly, true],
            ['hydrated, singleton', {
                on: { links: [] },
            } as ResourceFactoryOptions, singletonRepresentation, Status.hydrated, false],
            ['hydrated, collection', {
                sparseType: 'collection',
                on: { links: [], items: [] },
            } as ResourceFactoryOptions, collectionRepresentation, Status.hydrated, false],
        ])
            .describe(
                '%s',
                (title: string, options: ResourceFactoryOptions, type: RepresentationMatcher, status: Status, matchesSelf: boolean) => {

                    const resource = SparseRepresentationFactory.make(options);

                    it('should be defined as linkedRepresentation', () => {
                        // @ts-ignore
                        assertThat(resource).is(linkedRepresentation);
                    });

                    it('should be of type', () => {
                        // @ts-ignore
                        assertThat(resource).is(type);
                    });

                    it('should have Self link', () => {
                        assertThat(LinkUtil.matches(resource, LinkRelation.Self)).is(matchesSelf);
                    });

                    it('has status', () => {
                        assertThat(TrackedRepresentationUtil.getState(resource).status).is(status);
                    });

                });
    });


    describe('make, collection items as singletons', () => {

        each([
            ['empty (undefined)', {}, 0],
            ['items, single, uri', { defaultItems: ['//example.com/item/1'] } as ResourceFactoryOptions, 1],
            ['items, two, uri', { defaultItems: ['1', '2'] } as ResourceFactoryOptions, 2],
            ['items, two, uri', { defaultItems: ['1', '2'] } as ResourceFactoryOptions, 2],
            ['items, one, feed', { defaultItems: [{ id: '1', title: '' }] } as ResourceFactoryOptions, 1],
        ])
            .describe(
                '%s',
                (title: string, options: ResourceFactoryOptions, count: number) => {

                    options = { sparseType: 'collection', ...options };

                    const resource = SparseRepresentationFactory.make<CollectionRepresentation>(options);

                    it('should be of type', () => {
                        // @ts-ignore
                        assertThat(resource).is(collectionRepresentation);
                    });

                    it('has items', () => {
                        expect(resource.items).toBeDefined();
                    });

                    it('has items of count', () => {
                        expect(resource.items.length).toBe(count);
                    });

                    it('any items are singletons', () => {
                        for (const item of resource.items) {
                            // @ts-ignore
                            assertThat(item).is(singletonRepresentation);
                        }
                    });

                });
    });

});


