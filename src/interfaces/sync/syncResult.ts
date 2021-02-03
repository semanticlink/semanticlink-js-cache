import { Representation } from '../../types/types';
import { SyncOptions } from './syncOptions';

export interface SyncResult<T extends Representation> {
    readonly resource: T;
    readonly document: T;
    readonly options?: SyncOptions;
}
