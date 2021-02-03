import { Representation } from '../../types/types';
import { SyncInfoAction } from './types';

/**
 * Internal data structure for working out which action to perform on documents when syncing.
 * @private
 */
export interface SyncInfo {
    readonly resource: Representation;
    readonly document: Representation;
    readonly action: SyncInfoAction;
}
