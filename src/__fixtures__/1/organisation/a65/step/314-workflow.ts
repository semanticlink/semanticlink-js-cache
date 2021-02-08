import { self as parentStepsUri } from './314-workflow/step-pages-feed';
import { self as editUri } from './form/edit';
import { self as stepsUri } from './ac5-page-1/step-page-1-feed';
import CustomLinkRelation from '../../../../domain/CustomLinkRelation';
import LinkRelation from '../../../../../linkRelation';

export const selfUri = 'https://api.example.com/organisation/a656927b0f/step/314ee4fc57';
export const resource = {
    links: [
        {
            rel: LinkRelation.Self,
            href: selfUri,
        },
        {
            rel: 'up',
            href: stepsUri,
        },
        {
            rel: CustomLinkRelation.Steps,
            href: parentStepsUri,
        },
        {
            rel: LinkRelation.EditForm,
            href: editUri,
        },
    ],
    name: 'Picker',
    description: 'Onboarding a picker in the winter season',
    order: 2,
    type: '//enum/step/section/page',
};
