import { ApiOptions } from '../apiOptions';

export interface FieldResolver {
    <T>(field: string, value: T, options?: ApiOptions): T;
}
