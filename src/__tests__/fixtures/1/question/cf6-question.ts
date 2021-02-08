import { self as choiceFeedUri } from './cf6/choice-feed';
import { self as editFormUri } from './form/edit';

export const self = 'https://api.example.com/question/cf6c4b9c7f';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
        {
            rel: 'canonical',
            href: self,
            title: 'question',
        },
        {
            rel: 'organisation',
            href: 'https://api.example.com/organisation/a656927b0f',
        },
        {
            rel: 'choices',
            href: choiceFeedUri,
        },
        {
            rel: 'edit-form',
            href: editFormUri,
        },
    ],
    name: 'Please tell me about yourself (AgainXXXXX)',
    type: '//enum/question/text',
};
