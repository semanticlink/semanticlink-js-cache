import _ from 'underscore';


/**
 * @return {UriResolver}
 */
export const defaultResolver = {
    resolve: u => u,
    remove: _.noop,
    add: _.noop,
    update: _.noop
};


