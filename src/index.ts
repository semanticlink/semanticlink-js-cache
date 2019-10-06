import * as link from 'semantic-link';
import * as cache from './cache';
import * as query from './query';
import Loader, {loader} from './loader/Loader';

export {uriMappingResolver} from './sync/UriMappingResolver';
export {LogLevel as LEVEL, setLogLevel, log} from 'semantic-link/lib/logger';
export {sync} from './sync';
export {get, update, del, create} from './query';

const LoaderEvent = Loader.event;

export {
    link,
    cache,
    query,
    loader,
    LoaderEvent,
};