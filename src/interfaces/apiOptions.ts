import { ResourceQueryOptions } from './resourceQueryOptions';
import { ResourceFetchOptions } from './resourceFetchOptions';
import { ResourceLoaderOptions } from './resourceLoaderOptions';
import { ResourceLinkOptions } from './resourceLinkOptions';
import { ResourceAssignOptions } from './resourceAssignOptions';
import { ResourceFactoryOptions } from './resourceFactoryOptions';
import ResourceUpdateOptions from './resourceUpdateOptions';
import { MergeOptions } from './mergeOptions';
import { HttpRequestOptions } from './httpRequestOptions';

export type ApiOptions =
    ResourceQueryOptions &
    ResourceFetchOptions &
    ResourceLoaderOptions &
    ResourceLinkOptions &
    ResourceAssignOptions &
    ResourceFactoryOptions &
    ResourceUpdateOptions &
    HttpRequestOptions &
    MergeOptions;
