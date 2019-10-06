import _ from 'underscore';
import {log} from '..';
import {defaultEqualityOperators} from './Comparator';
import * as link from 'semantic-link';
import {mapWaitAll, sequentialWaitAll} from '../utils/asyncCollection';
import {pushAll} from '../utils/collection';

/**
 * TODO: this is probably two classes inheriting the Differencer interface
 */
export default class Differencer {

    /**
     * A default set of comparisons made to check if two resource
     * representation refer to the same resource in a collection.
     *
     * The most specific and robust equality check is first, with the most vague and
     * optimistic last.
     *
     * @type {Comparator[]}
     */
    static get defaultEqualityOperators() {
        return defaultEqualityOperators;
    }

    /**
     *  Processes difference sets (create, update, delete) for between two client-side collections {@Link CollectionRepresentation}
     *
     * **NOTE** this is a differencing set and update can be misleading. What is means is that we have 'matched' these
     * two resource as both 'existing' and thus may or may not require some form of update on them. The decision on
     * whether there is an actual difference is up to some other decision that know about the internals of the resource
     * (such as an edit form merger).
     *
     *     set one - current collection
     *     set two - new collection

     *     add/create    - not in set one but in set two
     *     match/update  - intersection of both sets
     *     remove/delete - in set one and not in set two
     *
     *                       set one: current
     *                 +-----------------------------+
     *     +-----------------------------------------+
     *     |           |              |              |
     *     |   add     |    match     |   remove     |
     *     |           |              |              |
     *     +-----------------------------------------+
     *     +--------------------------+
     *           set two: new
     *
     *
     * @param {CollectionRepresentation} collectionResource an existing resource collection that is
     * synchronised with the server (network of data).
     *
     * @param {CollectionRepresentation} collectionDocument a document with a collection CollectionRepresentation
     * format that describes the state of the resources.
     *
     * @param {SyncOptions} options a document with a collection CollectionRepresentation
     * format that describes the state of the resources.
     *
     * @return {SyncInfoResult}
     */
    static diffCollection(collectionResource, collectionDocument = {items: []}, options = {}) {

        const createStrategy = options.createStrategy || (item => Promise.resolve(item));
        const updateStrategy = options.updateStrategy ||
            ((itemResource, itemDocument, options) => Promise.resolve([itemResource, itemDocument, options]));
        const deleteStrategy = options.deleteStrategy || (item => Promise.resolve(item));

        // provide a default comparator and normalise a single comparator to an array of comparators
        let comparators = options.comparators || Differencer.defaultEqualityOperators;
        if (_(comparators).isFunction()) {
            comparators = [comparators];
        }

        /**
         * tuple of collection item and and document item
         * @type {Array.<LinkedRepresentation, LinkedRepresentation>}
         */
        let updateItems = [];

        if (!collectionResource.items) {
            throw new Error(`[Differencer] collection resource '${link.getUri(collectionResource, /self/)}' has no items`);
        }
        if (!collectionDocument.items) {
            throw new Error(`[Differencer] collection document '${link.getUri(collectionDocument, /self/)}' has no items`);
        }

        // clone the items
        /** @type {LinkedRepresentation[]} items from the collectionResource */
        let deleteItems = [...collectionResource.items];

        /* @type {LinkedRepresentation[]} items from the document } */
        let createItems = [...collectionDocument.items];

        _(comparators).each(comparator => {

            // Get a list of items that need to be updated.
            // create an array of indexes, eg
            // if the first two match return [[0,0]]
            let itemsToMove = _(deleteItems)
                .chain()
                .map((collectionItem, collectionIndex) => {
                    const docIndex = _(createItems).findIndex(createItem => comparator(collectionItem, createItem));
                    return docIndex >= 0 ? [collectionIndex, docIndex] : undefined;
                })
                .filter(item => !!item)
                .value();

            // Remove those items that are to be updated from the 'delete' list
            // on any that are removed, add reference for later processing onto the pair
            // if there is a match return [0,0,{item}]
            _(itemsToMove)
                .chain()
                .sortBy(pair => pair[0])
                .reverse()
                .each(pair => {
                    const index = pair[0];
                    pushAll(pair, deleteItems.splice(index, 1));
                });

            // Remove those items that are to be updated from the 'create' list
            // on any that are removed, add reference for later processing onto the pair
            _(itemsToMove)
                .chain()
                .sortBy(pair => pair[1])
                .reverse()
                .each(pair => {
                    const index = pair[1];
                    pushAll(pair, createItems.splice(index, 1));
                });

            // Append to the 'update' list the items removed from the 'delete' and 'create' lists
            pushAll(updateItems, _(itemsToMove).map(item => [item[2], item[3]]));

        });

        //
        // 1. Delete all resource first
        //
        return mapWaitAll(deleteItems, item => {
            log.debug(`[Diff] Calling delete strategy: ${link.getUri(item, /self/)}`);
            return deleteStrategy(item);
        })

        //
        //  2. Then update the existing resources
        //
            .then(() => {
                if (options.batchSize === 0 || _(options.batchSize).isUndefined()) {
                    return mapWaitAll(updateItems, item => updateStrategy(item[0], item[1]));
                } else {
                    return sequentialWaitAll(updateItems, (memo, item) => updateStrategy(item[0], item[1]));
                }
            })
            //
            // 3. Then create the new resources
            //
            .then(() => {
                const createResults = [];
                if (options.batchSize === 0 || _(options.batchSize).isUndefined()) {
                    // TODO - this should return an array rather than use push
                    return mapWaitAll(createItems, createItem => createStrategy(createItem)
                        .then(newItem => {
                            createResults.push([newItem, createItem]);
                        }))
                        .then(() => createResults);
                } else {
                    // TODO - this should return an array rather than use push
                    return sequentialWaitAll(createItems, (memo, createItem) => createStrategy(createItem)
                        .then(newItem => {
                            createResults.push([newItem, createItem]);
                        }))
                        .then(() => createResults);
                }
            })
            .then(createResults => {

                /**
                 * The synchronise info describes the new state, that is the state of the
                 * updated and created items. (.c.f the old state, c.f. the changes made).
                 *
                 * @return {SyncInfo[]}
                 */
                const makeSynchronisationInfos = (createResults, updateItems) => {
                    return _(createResults)
                        .chain()
                        .map(([resource, document]) => ({
                            resource,
                            document,
                            action: 'create'
                        }))
                        .union(_(updateItems)
                            .map(([resource, document]) => ({
                                resource,
                                document,
                                action: 'update'
                            })))
                        .value();
                };

                const infos = makeSynchronisationInfos(createResults, updateItems);

                log.debug(`[Diff] '${link.getUri(collectionResource, /self/)}' - [add, matched, remove] (${createResults.length} ${updateItems.length} ${deleteItems.length} )`);
                return [infos, createResults, updateItems, deleteItems];
            });
    }

    /**
     * A basic differencer based on two sets of uri-list (array of strings).
     *
     * No support for :
     *  - updates. You are either creating or deleting to get back the UriList
     *  - readonly (do you can't create or delete)
     *  - contribute (you can create and link)
     *
     * @param {UriList} resourceUriList
     * @param {UriList} documentUriList
     * @param {SyncOptions} options
     * @return {SyncInfoResult}
     */
    static diffUriList(resourceUriList, documentUriList, options = {}) {

        const createStrategy = options.createStrategy || (uriList => Promise.resolve(uriList));
        const deleteStrategy = options.deleteStrategy || (uriList => Promise.resolve(uriList));
        //const updateStrategy = options.updateStrategy || (uriList => Promise.resolve(uriList));

        const all = _(resourceUriList)
            .chain()
            .union(documentUriList)
            .uniq()
            .value();

        let deleteUriList = _(all).difference(documentUriList);
        let createUriList = _(documentUriList).difference(resourceUriList);

        // normalise the array of uris to an array of arrays to allow for easier async processing below
        deleteUriList = _(deleteUriList).isEmpty() ? deleteUriList : [deleteUriList];
        createUriList = _(createUriList).isEmpty() ? createUriList : [createUriList];

        return mapWaitAll(deleteUriList, uriList => {
            log.debug(`[Diff] Calling delete strategy: ${uriList}`);
            return deleteStrategy(uriList);
        })
            .then(deletedItems => {
                const createResults = [];

                return mapWaitAll(createUriList, createUriList => {
                    log.debug(`[Diff] Calling create strategy: ${createUriList}`);
                    return createStrategy(createUriList)
                        .then(newUriList => {
                            createResults.push([newUriList, createUriList]);
                        });
                })
                    .then(() => [createResults, [], deletedItems]);
            })
            .then(([createResults, updateItems, deleteItems]) => {

                /**
                 * The synchronise info describes the new state, that is the state of the
                 * updated and created items. (.c.f the old state, c.f. the changes made).
                 *
                 * @return {SyncInfo[]}
                 */
                const makeSynchronisationInfos = createResults => {
                    return _(createResults)
                        .map(([resource, document]) => ({
                            resource,
                            document,
                            action: 'create'
                        }));
                };

                const infos = makeSynchronisationInfos(createResults, deleteItems);
                return [infos, createResults, updateItems, deleteItems];

            });

    }

}
