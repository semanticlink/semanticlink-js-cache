import { self as editUri } from './form/edit';
import { self as upUri } from './ac5-page-1/step-page-1-feed';

export const self = 'https://api.example.com/organisation/a656927b0f/step/ec7a386294';

export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'up',
                href: upUri,
            },
            {
                rel: 'edit-form',
                href: editUri,
            },
        ],
    name: 'Heading',
    order: 1,
    type: '//enum/step/section/heading',
};
