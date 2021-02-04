import {
    resource as page1Feed,
    self as page1FeedUri,
} from '../../fixture/1/organisation/a65/step/ac5-page-1/step-page-1-feed';
import { resource as page1 } from '../../fixture/1/organisation/a65/step/ac5-page-1';
import { resource as questionStep, self as questionStepUri } from '../../fixture/1/organisation/a65/step/92c-question';
import { resource as question } from '../../fixture/1/question/cf6-question';
import { resource as organisation } from '../../fixture/1/organisation/a65';
import { resource as choiceFeed } from '../../fixture/1/question/cf6/choice-feed';
import { resource as choice } from '../../fixture/1/choice/881-name';
import { self as questionFeedUri } from '../../fixture/2/organisation/a65/question-feed';
import { self as newQuestionUri } from '../../fixture/2/question/1-question';
import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import anylogger from 'anylogger';
import { AxiosResponse } from 'axios';
import { fakeResponseFactory } from '../../fixture/2/fakeResponseFactory';
import { TrackedRepresentation } from '../../types/types';
import SparseRepresentationFactory from '../../representation/sparseRepresentationFactory';
import { ResourceQueryOptions } from '../../interfaces/resourceQueryOptions';
import LinkRelation from '../../linkRelation';
import Step from '../../fixture/domain/step';
import { MergeOptions } from 'src/interfaces/mergeOptions';
import { uriMappingResolver } from '../../representation/sync/uriMappingResolver';
import PooledOrganisation from '../../fixture/domain/pooledOrganisation';
import { sync } from '../../representation/sync';
import CustomLinkRelation from '../../fixture/domain/CustomLinkRelation';
import { HttpRequestFactory } from '../../http/httpRequestFactory';
import { assertThat } from 'mismatched';
import StepRepresentation from '../../fixture/domain/interfaces/stepRepresentation';

const log = anylogger('Steps Test');

/**
 * Helper to create a {@link LinkedRepresentation} with {@link State}
 */
const makeHydratedResource = <T extends LinkedRepresentation>(document: T): T | TrackedRepresentation<T> =>
    SparseRepresentationFactory.make({ on: <T>() => (document as unknown as T) });

describe('Steps with pooled (new) resources', () => {
    let options: ResourceQueryOptions;
    let resource: StepRepresentation;

    /**
     * Fake POST factory for responding to create requests
     */
    const fakeCreateResponseFactory = <T extends LinkedRepresentation>(resource: T, data: Partial<T>): Partial<AxiosResponse<T>> | never => {
        let location;
        const uri = LinkUtil.getUri(resource, LinkRelation.Self);
        log.debug('[Fake] POST %s %o', uri, data);
        switch (uri) {
            case page1FeedUri:
                location = questionStepUri;
                log.debug('[Fake] POST location %s', location);
                break;
            case questionFeedUri:
                location = newQuestionUri;
                log.debug('[Fake] POST location %s', location);
                break;
            default:
                throw new Error(`POST not found ${uri}`);
        }
        return {
            headers: {
                status: 201,
                location,
                statusText: '[Fake] created',
            },
        };
    };


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

    beforeEach(async () => {
        get.mockImplementation(fakeResponseFactory);
        post.mockImplementation(fakeCreateResponseFactory);

        /*
         * Load up a workflow, however, remove all the steps.
         *
         * Note: rather than less GET requests with a new data set, we'll remove the steps manually
         */
        resource = makeHydratedResource(page1);
        await Step.getSteps(resource, options);

        // clear out all steps so that we can practice adding a new one
        if (resource.steps) {
            resource.steps.items = [];
        }
    });


    describe('sync', () => {
        it('strategy with page and question, 1 created step with existing pooled question', async () => {
            /*
             * This structure:
             *
             *  - add a new page
             *  - the new page is a question ('field') that already exists in the pooled collection
             */
            const aDocument = {
                ...page1,
                steps: {
                    ...page1Feed,
                    items: [{
                        ...questionStep,
                        field: {
                            ...question,
                            choices: {
                                ...choiceFeed,
                                items: [choice],
                            },
                        },
                    }],
                },
            } as unknown as StepRepresentation;

            const mergeOptions: MergeOptions = {
                resolver: uriMappingResolver,
                /*
                  * Organisation is the 'tenanted' home of the questions that live outside the lifecycle
                  * of the application workflow
                  */
                resourceResolver: new PooledOrganisation(makeHydratedResource(organisation)).resourceResolver,
            };

            await sync({
                resource,
                document: aDocument,
                rel: CustomLinkRelation.Steps,
                options: { ...options, ...mergeOptions },
            });

            /*
             * Expect only that the 'step' is created (and not the 'question')
             */
            const postUris = [
                'https://api.example.com/organisation/a656927b0f/question',
                'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step',
            ];
            const actualPostUris = post.mock.calls.map(x => LinkUtil.getUri(x[0], LinkRelation.Self));

            /* list of out the requests to aid understanding (rather than overwhelm!) */
            const uris = [
                // load setup
                // ['steps', 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step'],
                // start action (outside step)
                ['self', 'https://api.example.com/organisation/a656927b0f/step/form/create'],
                // start action (inside question)
                // ['questions', 'https://api.example.com/organisation/a656927b0f'],
                // ['self', 'https://api.example.com/organisation/a656927b0f/question'],
                // ['self', 'https://api.example.com/question/form/create'],
                // start inside sync on question with choices
                // ['self', 'https://api.example.com/question/1'],
                // ['self', 'https://api.example.com/question/1/choice'],
                // ['self', 'https://api.example.com/choice/881e3ed135'],
                // ['self', 'https://api.example.com/choice/form/edit'],
                // end action (inside question)
                // end action (outside step)
                // ['self', 'https://api.example.com/organisation/a656927b0f/step/92c28454b7'],
            ];


            const actualUris = get.mock.calls.map(x => [x[1], LinkUtil.getUri(x[0], x[1])]);
            assertThat(actualUris).is(uris);
            // assertThat(actualPostUris).is(postUris);

            verifyMocks(3, 0, 0, 0);
            // verifyMocks(9, 2, 0, 0);

        }, 100000);
    });
});
