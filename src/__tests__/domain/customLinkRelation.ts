import { RelationshipType } from 'semantic-link';

export default class CustomLinkRelation {
    static readonly Steps: RelationshipType = 'steps';
    static readonly Field: RelationshipType = 'field';
    static readonly Information: RelationshipType = 'information';
    static readonly Question: RelationshipType = 'question';
    static readonly Questions: RelationshipType = 'questions';
    static readonly Choices: RelationshipType = 'choices';
}
