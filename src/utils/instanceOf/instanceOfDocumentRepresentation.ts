import { DocumentRepresentation } from '../../interfaces/document';

export function instanceOfDocumentRepresentation(obj: unknown): obj is DocumentRepresentation {
    return typeof obj === 'object';
}
