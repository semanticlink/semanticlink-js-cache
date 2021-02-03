import { ResourceSync } from '../../interfaces/sync/resourceSync';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore resolve conflict on T
export function instanceOfResourceSync<T>(obj: any): obj is ResourceSync<T> {
    return obj.resource !== 'undefined' && !obj.rel;
}
