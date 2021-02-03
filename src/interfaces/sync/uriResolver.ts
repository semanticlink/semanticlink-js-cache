import { Uri } from 'semantic-link';

/**
 * Used for provisioning the resources (network of data) based on providing new document (resources). Based
 * on a difference set this class synchronises between the client version and the api
 * @private
 */
export interface UriResolver {
    /**
     * Based on a known {@link Uri} what should it now be resolved to
     * @param key
     */
    resolve: (key: Uri) => Uri;
    /**
     * Add a new {@link Uri} into the resolver for later resolution
     * @param key
     * @param value
     */
    add: (key: Uri, value: Uri) => void;
    /**
     * Update (or add new) an existing {@link Uri} value for a known resolver key
     * @param key
     * @param value
     */
    update: (key: Uri, value: Uri) => void;
    /**
     * Remove the know {@link Uri} entry so that it is no longer resolved
     * @param key
     */
    remove: (key: Uri) => void;
}
