import { instanceOfForm } from '../utils/instanceOf/instanceOfForm';
import { assertThat } from 'mismatched';
import LinkRelation from '../linkRelation';

describe('instance of form', () => {

    test.each([
        ['nothing', {}, false],
        ['empty', { links: [], items: [] }, false],
        ['valid link, no item', { links: [{ rel: LinkRelation.Self, href: 'create-form' }], items: [] }, false],
        ['valid item, no link', { links: [], items: [{ type: 'text' }] }, false],
        ['requires link and valid item', {
            links: [{ rel: LinkRelation.Self, href: 'create-form' }],
            items: [{ type: 'text' }],
        }, true],
        ['requires form in self link href', {
            links: [{ rel: LinkRelation.Self, href: 'create' }],
            items: [{ type: 'text' }],
        }, false],
    ])('%s', (title: string, obj: any, expected: boolean) => {
        assertThat(instanceOfForm(obj)).is(expected);
    });


});
