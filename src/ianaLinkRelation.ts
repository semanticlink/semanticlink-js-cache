import { RelationshipType } from 'semantic-link';

export class IanaLinkRelation {
    static readonly self = 'self' as const;
    static readonly canonical = 'canonical' as const;
    static readonly canonicalOrSelf: RelationshipType = [IanaLinkRelation.canonical, IanaLinkRelation.self];
    static readonly up = 'up' as const;
}
