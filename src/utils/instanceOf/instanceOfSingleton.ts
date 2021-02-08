import { instanceOfLinkedRepresentation, LinkedRepresentation } from 'semantic-link';
import { SingletonRepresentation } from '../../types/types';
import { instanceOfCollection } from './instanceOfCollection';

export function instanceOfSingleton(object: unknown | LinkedRepresentation): object is SingletonRepresentation {
    return instanceOfLinkedRepresentation(object) && !instanceOfCollection(object);
}
