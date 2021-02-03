import { RelationshipType } from 'semantic-link';

export default class LinkRelation {
    static Self: RelationshipType = 'self' as const;
    static Canonical: RelationshipType = 'canonical' as const;
    static Up: RelationshipType = 'up' as const;
    static Alternate: RelationshipType = 'alternate' as const;
    static EditForm: RelationshipType = 'edit-form' as const;
    static CreateForm: RelationshipType = 'create-form' as const;
    static SearchForm: RelationshipType = 'search-form' as const;
    static Submit: RelationshipType = 'submit' as const;
}
