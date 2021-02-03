import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { defaultGetFactory } from './defaultGetFactory';
import { defaultPutFactory } from './defaultPutFactory';
import { defaultDeleteFactory } from './defaultDeleteFactory';
import { defaultPostFactory } from './defaultPostFactory';

export const defaultOptions: Required<HttpRequestOptions> = {
    getFactory: defaultGetFactory,
    putFactory: defaultPutFactory,
    deleteFactory: defaultDeleteFactory,
    postFactory: defaultPostFactory,
};
