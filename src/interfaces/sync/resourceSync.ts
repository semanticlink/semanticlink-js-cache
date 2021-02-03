import { StrategyType} from './types';
import { SyncOptions } from './syncOptions';
import { LinkedRepresentation } from 'semantic-link';

// TODO: this is wrong
export interface ResourceSync<T extends LinkedRepresentation> {
    readonly resource: T;
    readonly document: T;
    readonly strategies?: StrategyType[];
    readonly options?: SyncOptions;
}
