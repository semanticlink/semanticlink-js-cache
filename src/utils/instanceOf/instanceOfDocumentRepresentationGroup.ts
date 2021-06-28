import { DocumentRepresentation } from '../../interfaces/document';

export function instanceOfDocumentRepresentationGroup(obj: unknown): obj is DocumentRepresentation[] {
    return Array.isArray(obj) && obj[0] && typeof obj[0] === 'object';
}
