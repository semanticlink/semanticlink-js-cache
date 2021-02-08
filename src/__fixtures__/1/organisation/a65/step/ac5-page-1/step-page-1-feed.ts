import { self as headingStepUri } from '../ec7-heading';
import { self as questionStepUri } from '../92c-question';
import { self as infoStepUri } from '../b36-info';
import { self as createFormUri } from '../form/create';

export const self = 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step';
export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'create-form',
                href: createFormUri,
            },
        ],
    items: [
        {
            id: headingStepUri,
            title: 'Heading',
        },
        {
            id: questionStepUri,
        },
        {
            id: infoStepUri,
        },
    ],
};
