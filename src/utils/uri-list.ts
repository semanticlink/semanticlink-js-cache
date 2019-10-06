import {makeUri} from './uri';
import {normalise} from './collection';
import * as link from 'semantic-link/lib/index';
import {LinkedRepresentation} from 'semantic-link';

/**
 * Returns an array of uris (aka uri-list)
 * @param {LinkedRepresentation[]|LinkedRepresentation|string|string[]} resourcesOrUris
 * @return {string[]} uriList
 * */
export const makeUriList = (resourcesOrUris: LinkedRepresentation[] | LinkedRepresentation | string | string[]):
    string[] => {

    if (typeof resourcesOrUris === 'string') {
        return [resourcesOrUris];
    } else if (Array.isArray(resourcesOrUris)) {
        return resourcesOrUris.map((resource) => makeUri(resource));
    } else {
        return [makeUri(resourcesOrUris)];
    }
};


/**
 * Covert an array of linked representations (collection items) and returns their self relation uri-list
 * @param {LinkedRepresentation[]} collectionOrItems
 * @return {string[]} uri-list form of an array
 */
export const mapUriList = (collectionOrItems: LinkedRepresentation[]): string[] => {
    return normalise(collectionOrItems)
        .map((item) => link.getUri(item, /self|canonical/), undefined)
        .filter((item) => !!item);
};


/**
 * see https://tools.ietf.org/html/rfc2483#section-5
 *
 * TODO: refactor out into underscore and put tests around
 * @param {string[]} uriList
 * @return {string}
 */
export const toUriListMimeTypeFormat = uriList => {
    uriList.join('\n');
};
