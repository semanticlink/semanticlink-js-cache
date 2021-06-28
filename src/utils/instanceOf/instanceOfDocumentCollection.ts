import { DocumentRepresentation } from '../../interfaces/document';
import { CollectionRepresentation } from 'semantic-link';
import { instanceOfDocumentRepresentation } from './instanceOfDocumentRepresentation';

export function instanceOfDocumentCollection(obj: unknown): obj is DocumentRepresentation {
    if (instanceOfDocumentRepresentation(obj)) {
        const asObject = obj as unknown as CollectionRepresentation;
        return !!(asObject && Array.isArray(asObject.items));
    } else {
        return false;
    }
}
