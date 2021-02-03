import { assertThat } from 'mismatched';
import { FormItem } from '../interfaces/formItem';
import FieldResolverUtil, { FieldValue } from '../utils/fieldResolverUtil';
import { FieldType } from '../types/formTypes';

describe('Form util, resolve', () => {

    describe('no resolvers', () => {

        test.each([
            ['undefined, empty form items', undefined as FieldValue, {} as FormItem, undefined as FieldValue],
            [
                'undefined, no match',
                undefined as FieldValue,
                { name: 'check', type: FieldType.Checkbox },
                undefined as FieldValue,
            ],
            [
                'single, string',
                'string value',
                { name: '', type: FieldType.Text } as FormItem,
                'string value',
            ],
            [
                'single, number',
                1,
                { name: '', type: FieldType.Text } as FormItem,
                1,
            ],
            [
                'single, multiple (form), number (logs errors and returns value)',
                1,
                { name: '', type: FieldType.Text, multiple: true } as FormItem,
                1,
            ],
            [
                'single, multiple (form), string (logs errors and returns value)',
                'a',
                { name: '', type: FieldType.Text, multiple: true } as FormItem,
                'a',
            ],
            [
                'multiple (select), single select (explicit single return result)',
                'a',
                { name: '', type: FieldType.Select, multiple: false, items: [{ value: 'a' }] } as FormItem,
                'a',
            ],
            [
                'multiple (select), single select (implicit single return result)',
                'a',
                { name: '', type: FieldType.Select, items: [{ value: 'a' }] } as FormItem,
                'a',
            ],
            [
                'multiple (select), multi select (convert single to array)',
                'a',
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a'],
            ],
            [
                'multiple (select), multi select (retain array)',
                ['a'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a'],
            ],
            [
                'multiple (select), multi select (multiple values in array)',
                ['a', 'b'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a', 'b'],
            ],
            [
                'multiple (select), multi select, no values in form returns empty array',
                ['a', 'b'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    // items: [],
                } as FormItem,
                [],
            ],
            [
                'multiple (select), multi select, no values in form returns empty array',
                'a',
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    // items: [],
                } as FormItem,
                [],
            ],
            [
                'multiple (select), multi select, no values in form returns empty array',
                'a',
                {
                    name: '',
                    type: FieldType.Select,
                    // multiple: false,
                    // items: [],
                } as FormItem,
                undefined,
            ],
            // resource
        ])('%s', async (title: string, fieldValue: FieldValue, formItem: FormItem, expected: FieldValue) => {
            const actual = await FieldResolverUtil.resolve(fieldValue, formItem);
            assertThat(actual).is(expected);
        });
    });

    xdescribe('throws error', () => {

        test.each([])
        ('%s', async (title: string, fieldValue: FieldValue, formItem: FormItem, message: string | RegExp) => {
            await expect(() => FieldResolverUtil.resolve(fieldValue, formItem)).rejects.toThrow(message);
        });

    });
});
