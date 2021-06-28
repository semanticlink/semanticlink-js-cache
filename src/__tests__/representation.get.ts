import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { get } from '../representation/get';
import { TrackedRepresentationFactory } from '../representation/trackedRepresentationFactory';
import { NamedRepresentationFactory } from '../representation/namedRepresentationFactory';
import { RepresentationUtil } from '../utils/representationUtil';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';

jest.mock('../representation/trackedRepresentationFactory');
const trackedRepresentationFactory = TrackedRepresentationFactory as jest.Mocked<typeof TrackedRepresentationFactory>;

jest.mock('../representation/namedRepresentationFactory');
const namedRepresentationFactory = NamedRepresentationFactory as jest.Mocked<typeof NamedRepresentationFactory>;

describe('resource, get', () => {

    const href = 'https://api.example.com';

    test.each([
        [
            'singleton (default path)',
            { uri: href, sparseType: 'singleton' } as ResourceFactoryOptions,
            trackedRepresentationFactory.load,
            1,
            0,
        ],
        [
            'collection (default path)',
            { uri: href, sparseType: 'collection' } as ResourceFactoryOptions,
            trackedRepresentationFactory.load,
            1,
            0,
        ],
        [
            'named collection (rel)',
            { uri: href, sparseType: 'collection', rel: 'todo' } as ResourceFactoryOptions,
            namedRepresentationFactory.load,
            1,
            0,
        ],
        [
            'named collection (rel)',
            { uri: href, sparseType: 'singleton', rel: 'todo' } as ResourceFactoryOptions,
            namedRepresentationFactory.load,
            1,
            0,
        ],
        [
            'where collection, no items',
            {
                uri: href,
                sparseType: 'collection',
                where: SparseRepresentationFactory.make({ uri: '1' }),
            } as ResourceFactoryOptions,
            trackedRepresentationFactory.load,
            2,
            0,
        ],
        [
            'where collection, one item',
            {
                uri: href,
                sparseType: 'collection',
                defaultItems: ['1'],
                where: SparseRepresentationFactory.make({ uri: '1' }),
            } as ResourceFactoryOptions,
            trackedRepresentationFactory.load,
            2,
            1,
        ],
        [
            'where collection, two items',
            {
                uri: href,
                sparseType: 'collection',
                defaultItems: ['1', '2'],
                where: SparseRepresentationFactory.make({ uri: '1' }),
            } as ResourceFactoryOptions,
            trackedRepresentationFactory.load,
            2,
            1,
        ],
    ])('%s', async (title: string, options: ResourceFactoryOptions, factory: any, calledTimes: number, whereItems: number) => {

        const findResourceInCollectionMock = jest.spyOn(RepresentationUtil, 'findInCollection');
        // Implementation always returns non-undefined result to trigger loading an item
        findResourceInCollectionMock.mockImplementation(() => ({ links: [] }));


        await get(SparseRepresentationFactory.make(options), options);
        expect(factory).toBeCalledTimes(calledTimes);

        if (whereItems > 0) {
            expect(findResourceInCollectionMock).toHaveBeenCalledTimes(whereItems);
        }

        findResourceInCollectionMock.mockRestore();
    });

});


