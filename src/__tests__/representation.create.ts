import SparseRepresentationFactory from '../representation/sparseRepresentationFactory';
import TrackedRepresentationFactory from '../representation/trackedRepresentationFactory';
import RepresentationUtil from '../utils/representationUtil';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import create from '../representation/create';
import { Status } from '../representation/status';
import { DocumentRepresentation } from '../interfaces/document';
import { CollectionRepresentation, LinkType } from 'semantic-link';
import TrackedRepresentationUtil from '../utils/trackedRepresentationUtil';
import { assertThat } from 'mismatched';
import LinkRelation from '../linkRelation';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { SingletonRepresentation } from '../types/types';
import ApiUtil from '../apiUtil';

jest.mock('../representation/trackedRepresentationFactory');
const trackedRepresentationFactory = TrackedRepresentationFactory as jest.Mocked<typeof TrackedRepresentationFactory>;

describe('resource, create', () => {

    const uri = 'https://api.example.com';

    test.each([
        ['DOM element, ', 'HEAD', Status.virtual],
        ['Link type, link rel, ', { rel: LinkRelation.Self, href: uri }, Status.virtual],
    ])('singleton, %s', async (title: string, document: DocumentRepresentation | LinkType, expectedStatus: Status) => {
        const actual = await create(document);
        if (actual) {
            const { status } = TrackedRepresentationUtil.getState(actual);
            assertThat(status).is(expectedStatus);
        }
    });

    test.each([
        [
            'collection, on creates',
            {
                on: SparseRepresentationFactory.make({ uri, sparseType: 'collection' }),
            } as ResourceFactoryOptions,
            trackedRepresentationFactory.create,
            1,
            1,
        ],
    ])('%s', async (title: string, options: ResourceFactoryOptions, factory: any, calledTimes: number, addItems: number) => {

        const addItemToCollectionMock = jest.spyOn(RepresentationUtil, 'addItemToCollection');
        addItemToCollectionMock.mockImplementation(() => ({ links: [], items: [] } as CollectionRepresentation));

        const getMock = jest.spyOn(ApiUtil, 'get');
        getMock.mockImplementation(async () => ({ links: [], items: [] }) as FormRepresentation);

        trackedRepresentationFactory.create.mockImplementation(async () => ({ links: [] } as SingletonRepresentation));

        await create(SparseRepresentationFactory.make({ uri }), options);

        expect(factory).toBeCalledTimes(calledTimes);

        if (addItems > 0) {
            expect(addItemToCollectionMock).toHaveBeenCalledTimes(addItems);
        }

        addItemToCollectionMock.mockRestore();
        getMock.mockRestore();
        trackedRepresentationFactory.create.mockRestore();
    });

});
