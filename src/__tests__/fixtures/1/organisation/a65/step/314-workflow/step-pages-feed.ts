import { self as itemUri } from '../ac5-page-1';
import { self as createFormUri } from '../form/create';
import { LinkRelation } from '../../../../../../../linkRelation';

export const self = 'https://api.example.com/organisation/a656927b0f/step/314ee4fc57/step';
export const resource =
    {
        links:
            [
                {
                    rel: LinkRelation.Self,
                    href: self,
                },
                {
                    rel: LinkRelation.CreateForm,
                    href: createFormUri,
                },
            ],
        items: [
            {
                id: itemUri,
                title: 'About you',
            },
        ],
    };
