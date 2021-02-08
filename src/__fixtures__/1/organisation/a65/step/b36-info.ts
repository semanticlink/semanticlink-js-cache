import { self as infoUri } from '../information/101';

export const self = 'https://api.example.com/organisation/a656927b0f/step/b3666ee92c';
export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'field',
                href: infoUri,
            },
            {
                rel: 'edit-form',
                href: 'https://api.example.com/organisation/a656927b0f/step/form/edit',
            },
        ],
    order: 1,
    type: '//enum/step/information',
    value: 'https://api.example.com/organisation/a656927b0f/information/101',
    createdAt: '2020-11-27T18:29:31.634337Z',
    updatedAt: '2020-11-27T18:29:31.634337Z',
};
