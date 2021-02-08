import { DocumentRepresentation } from '../../interfaces/document';

export function instanceOfDocumentRepresentation(obj: any): obj is DocumentRepresentation {
    return typeof obj === 'object';
}
