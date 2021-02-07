import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { state, TrackedRepresentation } from '../types/types';
import { EditFormMergeStrategy } from '../interfaces/editFormMergeStrategy';
import { IanaLinkRelation } from '../ianaLinkRelation';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { DocumentRepresentation } from '../interfaces/document';

// "domain" classes
interface TestRepresentation extends LinkedRepresentation {
    version: string;
}

type TestCollection = CollectionRepresentation<TestRepresentation>;

describe('Resource', () => {
    it('should run!', async () => {

        const singleton = {
            links: [
                { rel: IanaLinkRelation.self, href: '' },
            ],
            version: 'value',
        } as TestRepresentation;

        const trackedSingleton = {
            [state]: {},
            ...singleton,
        } as TrackedRepresentation<TestRepresentation>;

        const f = trackedSingleton as LinkedRepresentation;
        const g = trackedSingleton as TestRepresentation;

        f.links;
        g.version;

        const collection = {
            ...{
                links: [
                    { rel: IanaLinkRelation.self, href: '' },
                ],
            },
            items: [],
        } as TestCollection;

        const trackedCollection = {
            [state]: {},
            ...collection,
        } as TrackedRepresentation<TestCollection>;

        const s = trackedCollection as LinkedRepresentation;
        const t = trackedCollection as TestCollection;

        s.links;
        t.items;

        const z = trackedCollection[state];

        z.status;


        // attempts to see what we need for typings

        const yy: EditFormMergeStrategy = function(representation, doc, form) {
            const j = representation.links;
            const x = doc.links;
            const z = form.items[0].name;
            // return representation;
            console.log(j, x, z);
            return Promise.resolve(representation);
        };
        const form: FormRepresentation = {
            links: [],
            items: [{
                name: 'version',
                type: '//types/text',
            }],
        };

        const doc = {
            version: 'fred',
        } as DocumentRepresentation<TestRepresentation>;

        await yy(singleton, doc, form);
        await yy(
            singleton,
            { version: 'fred' },
            form);
        const j = await yy(singleton, { version: 'fred' }, form);

        if (j) {
            j.version;
        }

        await yy(collection, doc, form);

    });
});

