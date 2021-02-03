import { Representation } from '../../types/types';
import { UriList } from '../../types/mediaTypes';

/**
 * A resolver on {@link UriList}
 */
export interface UriListResolver {
    (resource: Representation): UriList;
}
