import { Uri } from 'semantic-link';
import { Resolver } from '../interfaces/resolver';

/**
 * A resolving cache of key/value mapping to/from a network of data (NOD) URI to/from a document URI.
 *
 * We use this to resolve transitive references in a network of data when creating, updating and deleting.
 * For example, we are cloning a resource that is linked to another resource. In the new resource, it is not
 * linked to the original other resource but to the equivalent other. We need to be to map these going forward.
 *
 * @example
 *
 * Document: A exists, B references A
 * NOD: Create A` (hold reference A` through A), Create B` (but now B` references A, replace A with A`)
 *
 */
class UriMappingResolver implements Resolver {
    private readonly resolutions: Map<Uri, Uri>;

    constructor() {
        /**
         * A simple 'document' uri map to a 'network of data' URI map.
         */
        this.resolutions = new Map<Uri, Uri>();
    }

    /**
     * Update a mapping to/from a network of data (NOD) URI to/from a document URI.
     */
    update(documentUri: Uri, nodUri: Uri) {
        this.resolutions.set(documentUri, nodUri);
    }

    /**
     * Add a mapping to/from a network of data (NOD) URI to/from a document URI.
     */
    add(documentUri: Uri, nodUri: Uri) {
        this.resolutions.set(documentUri, nodUri);
    }

    /**
     * Signal to the resolver that a mapping is no longer relevant.
     * Remove based on the document URI a mapping to/from a network of data (NOD) URI to/from a document URI.
     */
    remove(documentUri: Uri) {
        for (const entry of this.resolutions.entries()) {
            if (entry[1] === documentUri) {
                this.resolutions.delete(entry[0]);
            }
        }
    }

    /**
     * Returns the network of data (NOD) URI based on a document URI or if not found itself
     */
    resolve(documentUri: Uri): Uri {
        if (this.resolutions.has(documentUri)) {
            return this.resolutions.get(documentUri) || documentUri;
        } else {
            return documentUri;
        }
    }

    /**
     * Helper to print out the resolutions map
     * @returns stringified JSON version of the resolutions map
     */
    out(): string {
        return JSON.stringify(this.resolutions.entries());
    }
}

export const uriMappingResolver = new UriMappingResolver();
