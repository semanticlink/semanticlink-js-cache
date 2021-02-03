import { LinkedRepresentation } from 'semantic-link';
import { IanaLinkRelation } from '../ianaLinkRelation';
import { assertThat } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import TrackedRepresentationUtil from '../utils/trackedRepresentationUtil';
import { singletonRepresentation } from '../representationMatcher';
import { Status } from '../models/status';
import { TrackedRepresentation } from '../types/types';
import SparseRepresentationFactory from '../representation/sparseRepresentationFactory';
import TrackedRepresentationFactory from '../representation/trackedRepresentationFactory';

describe('Tracked Representation Factory', () => {

    const post = jest.fn();
    const get = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

    HttpRequestFactory.Instance(
        { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del }, true);

    function verifyMocks(getCount: number, postCount: number, putCount: number, deleteCount: number): void {
        assertThat({
            get: get.mock.calls.length,
            post: post.mock.calls.length,
            put: put.mock.calls.length,
            del: del.mock.calls.length,
        }).is({
            get: getCount,
            post: postCount,
            put: putCount,
            del: deleteCount,
        });
    }

    afterEach(() => {
        post.mockReset();
    });

    describe('delete', () => {

        const document = jest.fn();

        afterEach(() => {
            del.mockReset();
            document.mockRestore();
        });

        interface ApiRepresentation extends LinkedRepresentation {
            version: string;
        }

        const uri = 'https://api.example.com';

        test.each([
            [{} as TrackedRepresentation<ApiRepresentation>, 'No state on \'undefined\''],
            [{
                links: [{
                    rel: IanaLinkRelation.self,
                    href: uri,
                }],
            } as TrackedRepresentation<ApiRepresentation>, `No state on '${uri}'`],
        ])('no state', async (representation: TrackedRepresentation<ApiRepresentation>, err: string) => {
            await expect(async () => await TrackedRepresentationFactory.del(representation)).rejects.toEqual(err);
            expect(del).not.toHaveBeenCalled();
        });

        describe('state values', () => {

            it('success (200), via http', async () => {
                const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });

                del.mockResolvedValue(
                    {
                        data: undefined,
                        headers: [{ x: 'test' }],
                        status: 200,
                        statusText: '',
                        config: {},
                    }
                );

                const api = await TrackedRepresentationFactory.del($api);
                expect(del).toHaveBeenCalled();

                const {
                    status,
                    previousStatus,
                    headers,
                    collection,
                    retrieved,
                    singleton,
                } = TrackedRepresentationUtil.getState(api);
                assertThat(api).is(singletonRepresentation);
                assertThat(api).is($api);
                assertThat(status).is(Status.deleted);
                assertThat(previousStatus).is(Status.locationOnly);
                assertThat(headers).is([{ x: 'test' }]);
                assertThat(collection).is(new Set<string>());
                assertThat(singleton).is(new Set<string>());
                assertThat(retrieved).is(Date);
            });

            test.each([
                ['success', 200, Status.deleted, 0, 0, 0, 1],
                ['error, client', 400, Status.unknown, 0, 0, 0, 1],
                ['error, client', 403, Status.forbidden, 0, 0, 0, 1],
                // TODO: this returns object and need a better matcher
                // ['error, client (returns object)', 404, match.obj.has({ status: 5 })],
                ['error, server', 500, Status.unknown, 0, 0, 0, 1],
            ])('%s, %s', async (
                title: string,
                statusCode: number,
                currentStatus: Status,
                getCount: number,
                postCount: number,
                putCount: number,
                deleteCount: number) => {
                const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });

                del.mockImplementation(async () => {
                    if (statusCode >= 400) {
                        return Promise.reject({ response: { status: statusCode } });
                    } else {
                        return {
                            data: undefined,
                            headers: [],
                            status: statusCode,
                            statusText: '',
                            config: {},
                        };
                    }
                });
                const api = await TrackedRepresentationFactory.del($api);
                verifyMocks(getCount, postCount, putCount, deleteCount);

                const { status } = TrackedRepresentationUtil.getState(api);
                assertThat(status).is(currentStatus);
            });

        });

    });

});


