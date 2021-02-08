import { self as stepFeedUri } from './a65/step-feed';
import { self as questionFeedUri } from './a65/question-feed';

export const self = 'https://api.example.com/organisation/a656927b0f';
export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'steps',
                href: stepFeedUri,
            },
            {
                rel: 'job-postings',
                href: 'https://api.example.com/organisation/a656927b0f/posting',
            },
            {
                rel: 'questions',
                href: questionFeedUri,
            },
            {
                rel: 'information',
                href: 'https://api.example.com/organisation/a656927b0f/information/template',
                title: 'template',
            },
            {
                rel: 'information',
                href: 'https://api.example.com/organisation/a656927b0f/information/organisation',
                title: 'organisation',
            },
            {
                rel: 'templates',
                href: 'https://api.example.com/organisation/a656927b0f/template',
            },
            {
                rel: 'edit-form',
                href: 'https://api.example.com/organisation/form/edit',
            },
        ],
    name: "T's Picking",
    description: 'Just a great place',
    email: 't@example.com',
    phone: '0274852872',
};
