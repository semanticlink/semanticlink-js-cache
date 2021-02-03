import { RelationshipType } from 'semantic-link';

export default class CustomLinkRelation {
    static Steps: RelationshipType = 'steps' as const;
    static Field: RelationshipType = 'field' as const;
    static Fields: RelationshipType = 'fields' as const;
    static Choices: RelationshipType = 'choices' as const;
    static Question: RelationshipType = 'question' as const;
    static Questions: RelationshipType = 'questions' as const;
    static Information: RelationshipType = 'information' as const;
    static Template: RelationshipType = 'template' as const;
    static Templates: RelationshipType = 'templates' as const;
    static Content: RelationshipType = 'content' as const;
}
