import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import LinkRelation from '../../linkRelation';

/**
 * Match on the Canonical or Self link relation on the resources
 */
export function canonicalOrSelf(lvalue: LinkedRepresentation, rvalue: LinkedRepresentation): boolean {
    const lUri = LinkUtil.getUri(lvalue, [LinkRelation.Canonical, LinkRelation.Self] as RelationshipType);
    const rUri = LinkUtil.getUri(rvalue, [LinkRelation.Canonical, LinkRelation.Self] as RelationshipType);
    if (lUri && rUri) {
        return lUri === rUri;
    }
    return false;
}
