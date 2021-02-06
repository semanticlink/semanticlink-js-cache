import { self as questionUri } from '../../../question/cf6-question';
import { self as editFormUri } from './form/edit';

export const self = 'https://api.example.com/organisation/a656927b0f/step/92c28454b7';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
        {
            rel: 'field',
            href: questionUri,
        },
        {
            rel: 'edit-form',
            href: editFormUri,
        },
    ],
    name: 'Question One',
    description: 'Instructions',
    order: 2,
    type: '//enum/step/question',
    // field: questionUri,
};
