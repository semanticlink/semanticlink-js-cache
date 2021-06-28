import { ResourceSync } from '../../interfaces/sync/resourceSync';
import { LinkedRepresentation } from 'semantic-link';

export function instanceOfResourceSync< T extends LinkedRepresentation>(obj: unknown): obj is ResourceSync<T> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return obj.resource !== 'undefined' && !obj.rel;
}
