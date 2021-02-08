import { CollectionRepresentation, instanceOfLinkedRepresentation, LinkedRepresentation } from 'semantic-link';
import { instanceOfForm } from './instanceOfForm';

/**
 * A guard to detect whether the object is a {@link CollectionRepresentation<T extends LinkedRepresentation>}.
 * A linked representation must be an object with an array called 'links'.
 *
 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfCollection<T extends LinkedRepresentation = LinkedRepresentation>(object: unknown | CollectionRepresentation<T>): object is CollectionRepresentation<T> {

    if (instanceOfLinkedRepresentation(object)) {
        const asObject = object as CollectionRepresentation;
        return !!(asObject && Array.isArray(asObject.items) && !instanceOfForm(object));
    } else {
        return false;
    }
}
