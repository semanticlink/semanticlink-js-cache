import { assertThat } from 'mismatched';
import each from 'jest-each';
import { RelationshipType } from 'semantic-link';
import { RelationshipTypeUtil } from '../utils/relationshipTypeUtil';


describe('RelationshipType Util', () => {

    each([
        ['null', null, undefined],
        ['undefined', undefined, undefined],
        ['string (empty)', '', undefined],
        ['string', 'test', 'test'],
        ['regex', /test/, 'test'],
        ['regex (global)', /test/g, 'test'],
        ['regex (insensitive)', /test/i, 'test'],
        ['regex (global/insensitive)', /test/gi, 'test'],
        ['regex (hyphen)', /create-form/, 'createForm'],
        ['regex (non-alpha)', /^create-form$/, 'createForm'],
        ['string (kebab case)', 'createForm', 'createForm'],
        ['string', 'createform', 'createform'],
        ['array (single)', ['createform'], 'createform'],
        ['array (first)', ['test', 'createform'], 'test'],
        ['array (first as regex)', [/create-form/, 'createform'], 'createForm'],
    ])
        .it(
            'to camel: %s',
            (title: string, rel: RelationshipType, name: string) => {

                assertThat(RelationshipTypeUtil.toCamel(rel)).is(name);

            });
});

