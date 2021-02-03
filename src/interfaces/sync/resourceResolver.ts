import { Representation } from '../../types/types';

export interface ResourceResolver {
    (resource: string | any): Representation;
}
