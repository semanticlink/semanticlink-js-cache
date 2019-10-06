import * as link from 'semantic-link';
import {CollectionRepresentation, LinkedRepresentation, RelationshipType, Uri} from 'semantic-link';
import * as SparseResource from '../cache/sparseResource';
import {log} from '..';

/**
 * Takes a resource and normalises it to a valid iterable. Particularly if you hand in a resource that isn't a
 * collection then it will return an empty iterable (array).
 * @param {*|LinkedRepresentation[]|CollectionRepresentation|undefined} itemsOrCollection takes a collection and returns the items if available
 * @return {LinkedRepresentation[]}
 */
export const normalise = (itemsOrCollection?: any | LinkedRepresentation[] | CollectionRepresentation):
    LinkedRepresentation[] => {
    if (!itemsOrCollection) {
        return [];
    } else if (Array.isArray(itemsOrCollection)) {
        return itemsOrCollection;
    } else if (itemsOrCollection.items) {
        return itemsOrCollection.items;
    } else {
        return [];
    }
};

const isLinkedRepresentation = (resource: any) => {
    return resource && resource.links;
};


/**
 * Finds (by MATCH) a resource item in a collection by taking in the item itself and then search on a URI
 *
 * @param {CollectionRepresentation|LinkedRepresentation[]} collection
 * @param {string} uri
 * @param {string|RegExp=} rel=/self|canonical/
 */
export const findResourceInCollectionByUri = (
    collection: CollectionRepresentation | LinkedRepresentation[],
    uri: Uri,
    rel: RelationshipType): LinkedRepresentation | undefined=>
    normalise(collection).find(item => link.getUri(item, rel || /self|canonical/) === uri);


/**
 * Finds (by OR) a resource item in a collection by taking in the item itself and then search on either:
 *
 *   (a) a URI; or
 *   (b) a string value in 'mappedTitle' attribute (ie 'name').
 *
 * Note: this is a specific match of both compared with either in {@link findResourceInCollectionByRelAndAttribute}
 * @param {CollectionRepresentation|LinkedRepresentation[]} collection
 * @param {LinkedRepresentation} representation
 * @param {string=} attributeNameOrLinkRelation
 * @return {LinkedRepresentation}
 */
export const findResourceInCollection = (
    collection: CollectionRepresentation | LinkedRepresentation[],
    representation: LinkedRepresentation,
    attributeNameOrLinkRelation: string): LinkedRepresentation | undefined => {

    const itemByUri = findResourceInCollectionByRel(collection, representation, attributeNameOrLinkRelation);
    if (itemByUri) {
        return itemByUri;
    } else {
        log.debug(`No match on collection ${link.getUri(collection, /self/)} no match against on rel '${attributeNameOrLinkRelation}'`);
    }

    const name:string|undefined = representation[SparseResource.mappedTitle];
    if (name) {
        const itemByName = findResourceInCollectionByRelOrAttribute(collection, name, SparseResource.mappedTitle);
        if (itemByName) {
            return itemByName;
        } else {
            log.debug(`No match on collection ${link.getUri(collection, /self/)} on attribute '${SparseResource.mappedTitle}'`);
        }
    } else {
        log.debug(`No match on collection ${link.getUri(collection, /self/)} no attribute '${SparseResource.mappedTitle}'`);
    }

};

/**
 * Finds (by ONLY) a resource item in a collection by taking in the item itself and then search on a URI
 *
 * Note: in practice use {@link findResourceInCollection}
 * @param {CollectionRepresentation|LinkedRepresentation[]} collection
 * @param {LinkedRepresentation} representation
 * @param {string=} attributeNameOrLinkRelation
 * @return {LinkedRepresentation}
 */
export const findResourceInCollectionByRel = (
    collection:CollectionRepresentation|LinkedRepresentation[],
    representation:LinkedRepresentation,
    attributeNameOrLinkRelation:string):LinkedRepresentation|undefined => {
    const uri = link.getUri(representation, /canonical|self/, undefined);

    if (uri) {
        // we need to add self on the end because in the case of an attribute name it won't match against self
        const itemByUri = findResourceInCollectionByRelOrAttribute(
            collection, uri, [attributeNameOrLinkRelation, /self|canonical/]);
        if (itemByUri) {
            return itemByUri;
        } else {
            log.debug(`Try search representation for collection ${link.getUri(collection, /self/)}`);
        }
    } else {
        log.debug(`No match on collection ${link.getUri(collection, /self/)} on what looks like a Document`);
    }
};


/**
 * Finds (by AND) a resource item in a collection identified through a found link relation and resource attribute
 * that matches an item in the collection items.
 *
 * It looks for items with BOTH:
 *
 *   1. matching link relation (default: canonical or self) by uri
 *   2. field attribute (default: title) on a resource by string
 *
 * Note: this is a specific match of both compared with either in {@link findResourceInCollection}
 * @param {CollectionRepresentation|LinkedRepresentation[]} collection
 * @param {LinkedRepresentation} resource
 * @param {string|RegExp|string[]|RegExp[]} rel
 * @param {string} attributeName
 * @return {LinkedRepresentation|undefined}
 */
export const findResourceInCollectionByRelAndAttribute = (
    collection:CollectionRepresentation|LinkedRepresentation[],
    resource:LinkedRepresentation,
    rel: RelationshipType = /canonical|self/,
    attributeName:string = 'name') :LinkedRepresentation | undefined=> {

    // if its not a resource return
    if (!isLinkedRepresentation(resource)) {
        log.debug(`No match on collection ${link.getUri(collection, /self/)} no resource to match against`);
        // this is not a resource
        return undefined;
    }

    const uri = link.getUri(resource, /self|canonical/);

    // if we can't find values to match against return
    if (!uri || !resource[attributeName]) {
        log.debug(`No match on collection ${link.getUri(collection, /self/)} no match against on self '${uri}' or attribute '${attributeName}'`);
        return undefined;
    }

    // go through the collection and match the URI against either a link relation and attribute
    const result = normalise(collection)
        .find(item => item[attributeName] === resource[attributeName] && link.getUri(item, rel) === uri);

    if (!result) {
        log.debug(`No match on collection ${link.getUri(collection, /self/)} on BOTH self '${uri}' AND attribute '${attributeName}'`);
    }

    return result;
};

/**
 * Finds (by OR) a resource item in a collection identified through a found link relation or resource attribute
 * that matches an item in the collection items.
 *
 * It looks for items:
 *
 *   1. matching link relation (default: canonical or self) by uri
 *   2. field attribute (default: name ({@link SparseResource.mappedTitle}) on a resource by string
 *
 * @param {CollectionRepresentation|LinkedRepresentation[]} collection
 * @param {string|LinkedRepresentation} resourceIdentifier
 * @param {string|string[]} attributeNameOrLinkRelation
 * @return {LinkedRepresentation}
 * @private
 */
export const findResourceInCollectionByRelOrAttribute = (
    collection:CollectionRepresentation|LinkedRepresentation[],
    resourceIdentifier:LinkedRepresentation|string,
    attributeNameOrLinkRelation:string|string[]):LinkedRepresentation | undefined => {

    // if a linked representation is handed in (instead of a string) find its self link
    if (isLinkedRepresentation(resourceIdentifier)) {
        resourceIdentifier = link.getUri(
            resourceIdentifier,
            attributeNameOrLinkRelation || /self|canonical/);

        if (resourceIdentifier) {
            log.debug(`Using ${resourceIdentifier}`);
        }
    }

    // go through the collection and match the URI against either a link relation or attribute
    const result = normalise(collection).find(item =>
        link.getUri(item, attributeNameOrLinkRelation || /canonical|self/) === resourceIdentifier
        || item[attributeNameOrLinkRelation || SparseResource.mappedTitle] === resourceIdentifier);

    if (!result) {
        log.debug(`No resource '${resourceIdentifier}' found in collection '${link.getUri(collection, /self/)}'`);
    }

    return result;
};

/**
 * Returns items from the first collection that are not in the second collection - matching is done via identity.
 *
 * Note: matches on handed in link rel and then 'canonical' and then 'self'
 *
 * @param {CollectionRepresentation|LinkedRepresentation[]} leftCollection
 * @param {CollectionRepresentation|LinkedRepresentation[]} rightCollection
 * @param {string=} attributeNameOrLinkRelation
 * @return {LinkedRepresentation[]}
 */
export const differenceCollection = (
    leftCollection:CollectionRepresentation|LinkedRepresentation[],
    rightCollection:CollectionRepresentation|LinkedRepresentation[],
    attributeNameOrLinkRelation?:string) :LinkedRepresentation[]=> {

    // guard for the reject
    leftCollection = leftCollection || [];

    // now iterate either through: collection, an array or guard of empty array
    return normalise(leftCollection).filter(item => {
        const uri = link.getUri(item, ['canonical', 'self']);
        return !findResourceInCollectionByRelOrAttribute(
            rightCollection,
            uri,
            [attributeNameOrLinkRelation, 'canonical', 'self']);
    });
};

/**
 * Replaces an original array with the values of another array while returning
 * the reference of the original array.
 *
 * a = (a-a) + b
 *
 * @param {*[]} array
 * @param {*[]?} values
 * @return {*[]}
 */
export const spliceAll = <T>(array: T[], values?: T[]): T[] => {
    if (array) {
        array.splice.apply(array, [0, array.length].concat(values));
    } else {
        log.error('Array cannot be undefined');
    }
    return array;
};

/**
 * Adds to the end of the original array the values of another array.
 *
 * a = a + b
 *
 * @param array
 * @param values
 */
export const pushAll = <T>(array: T[], values: any[]): T[] => {
    if (array) {
        array.push.apply(array, values);
    } else {
        log.error('Array cannot be undefined');
    }
    return array;
};

/**
 * Adds to the end of an array if the element does not already exist
 *
 * @param array
 * @param resource
 * @param attributeNameOrLinkRelation
 */
export const pushResource = <T>(array: T[], resource:T, attributeNameOrLinkRelation: string): T[] => {

    array = array || [];

    const uri = link.getUri(resource, /self|canonical/);
    if (!findResourceInCollectionByUri(array, uri, attributeNameOrLinkRelation)) {
        array.push(resource);
    } else {
        log.error('[Collection] Array cannot be undefined');
    }
    return array;
};

/**
 *
 * @param {CollectionRepresentation|LinkedRepresentation[]} collection
 * @returns {boolean}
 */
export const isCollectionEmpty = (collection: CollectionRepresentation | LinkedRepresentation[]): boolean => {
    return normalise(collection).length === 0;
};

/**
 *
 * @param {CollectionRepresentation|LinkedRepresentation[]} collection
 * @returns {LinkedRepresentation}
 */
export const firstItem = (collection: CollectionRepresentation | LinkedRepresentation[]): LinkedRepresentation => {
    const [head,] = normalise(collection);
    return head;
};

/**
 * Clone (detach) items (as array) or collection.items and return as array
 *
 * TODO: may be obsolete-this is confusing as to purpose
 *
 * @param {*[]|LinkedRepresentation[]} arrayOrCollectionItems
 * @return {*[]} copy detached
 */
export const clone = (arrayOrCollectionItems: any[] | LinkedRepresentation[]) => {
    return normalise(arrayOrCollectionItems).map(item => Object.assign({}, item));
    /*    if (!resource) {
            return [];
        } else if (resource.items) {
            return resource.items.map(item => Object.assign({}, item));
        } else if (Array.isArray(resource)) {
            return resource.map(item => Object.assign({}, item));
        } else {
            return [];
        }*/
};
