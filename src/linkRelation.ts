import { RelationshipType } from 'semantic-link';

export default class LinkRelation {
    static readonly Self: RelationshipType = 'self';
    static readonly Canonical: RelationshipType = 'canonical';
    static readonly Up: RelationshipType = 'up';
    static readonly Alternate: RelationshipType = 'alternate';
    static readonly EditForm: RelationshipType = 'edit-form';
    static readonly CreateForm: RelationshipType = 'create-form';
    static readonly SearchForm: RelationshipType = 'search-form';
    static readonly Submit: RelationshipType = 'submit';
}
