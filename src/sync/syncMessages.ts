
const capitalise = (str) => {
    return str.charAt(0).toUpperCase() + this.slice(1);
};
const lowercase = (str) => {
    return str.charAt(0).toLowerCase() + this.slice(1);
};

/**
 * Make options fpr message that need to  be displayed to the user
 * @param {CacheOptions} options
 * @param {LinkedRepresentation} resource
 * @param {UserMessage} type - the stringly type of the resource that would make sense to a user
 * @param {SyncInfoAction} action the type of action [create, delete, update]
 * @returns {SyncOptions}
 */
export const makeOptionsWithSyncMessages = (options, resource, type, action) => {
    return {
        ...options,
        success: `${capitalise(type)} ${lowercase(action)}d: '${resource.name}'`,
        error: `Unable to ${lowercase(action)} ${lowercase(type)} '${resource.name}'`
    };
};
