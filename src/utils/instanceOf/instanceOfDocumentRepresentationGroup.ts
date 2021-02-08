import { DocumentRepresentation } from '../../interfaces/document';

export function instanceOfDocumentRepresentationGroup(obj: any): obj is DocumentRepresentation[] {
    return Array.isArray(obj) && obj[0] && typeof obj[0] === 'object';
}
