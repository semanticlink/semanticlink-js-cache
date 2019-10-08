import _ from 'underscore';
import {UriResolver} from "./interfaces";


/**
 * @return {UriResolver}
 */
export const defaultResolver: UriResolver = {
    resolve: u => u,
    remove: _.noop,
    add: _.noop,
    update: _.noop
};


