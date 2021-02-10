import { DocumentRepresentation } from '../../interfaces/document';
import { instanceOfDocumentCollection } from './instanceOfDocumentCollection';

export function instanceOfDocumentSingleton(obj: any): obj is DocumentRepresentation {
    return !instanceOfDocumentCollection(obj);
}
