import { LinkedRepresentation } from 'semantic-link';
import { ApiOptions } from './apiOptions';

export interface ResourceResolver {
    (type: string): <T extends LinkedRepresentation>(resource: T, options?: ApiOptions) => Promise<T | undefined>;
}
