import {NormalisableType, normalise} from './collection';
import {LinkedRepresentation} from "semantic-link";

/**
 * Concurrent support for waiting for one or more promises. It is likely that you will inline using Promise.all.
 * This was originally created for underscore chaining
 *
 * Note:
 *
 * The `Promise.all` underlying method returns a single Promise that resolves when all
 * of the promises in the iterable argument have resolved or when the iterable argument contains no promises.
 *
 * It rejects with the reason of the first promise that rejects.
 *
 * @example
 *
 *   return _(aSeries.items)
 *        .chain()
 *        .spliceAll(_(response.data.items).map(function(seriesValueFeedItem) {
 *              return makeBaseResourceFromFeedItem(seriesValueFeedItem);
 *        }))
 *        .map(function(aSeriesValue) {
 *              return link
 *                  .get(aSeriesValue, 'self')
 *                  .then(function(seriesValueResponse) {
 *                      var seriesValues = seriesValueResponse.data;
 *
 *                      highchart.updateSeries(
 *                          aSeries,
 *                          chartRepresentation.config.series,
 *                          seriesValues,
 *                          chartRepresentation.xAxes
 *                      );
 *
 *                      return updateResourceFromRepresentation(aSeriesValue, seriesValueResponse.data);
 *                  });
 *          })
 *        .waitAll()
 *        .value();
 *
 * @alias concurrentWait
 * @param {Promise[]|Promise} [promises]
 * @return {Promise}
 */
export const waitAll = <T>(promises: Promise<T>[] | Promise<T>): Promise<T[]> => Promise.all<T>(normalise(promises));


/**
 * Concurrent support performing an action on a collection and waiting for them to complete.
 *
 * Note:
 *
 * The `Promise.all` underlying method returns a single Promise that resolves when all
 * of the promises in the iterable argument have resolved or when the iterable argument contains no promises.
 *
 * It rejects with the reason of the first promise that rejects.
 *
 * @param {T|T[]|*} collection
 * @param {function(value: T, index: number, array: T[]):Promise} iterator
 * @param {T|T[]|*} context?
 * @return {Promise<T[]>}
 */
export const mapWaitAll = <T extends LinkedRepresentation>(
    collection: NormalisableType,
    iterator: (item: T) => Promise<T>,
    context = {}) => Promise
    .all(normalise(collection).map(iterator, context));


/**
 * Concurrent support performing an action on a resource attribute and waiting for them to complete. Optionally,
 * the attribute can be morphed at the same time.

 * Note:
 *
 * The `Promise.all` underlying method returns a single Promise that resolves when all
 * of the promises in the iterable argument have resolved or when the iterable argument contains no promises.
 *
 * It rejects with the reason of the first promise that rejects.
 *
 * @example
 *
 *  const doc = mapAttributeWaitAll(
 *      resource,
 *      (field, fieldname) =>  // some promise call,
 *      dashToCamel
 *    );
 *
 * @param resource
 * @param callbackFunction
 * @param keyReplacer
 * @return {Promise<any>}
 */
export const mapAttributeWaitAll = (resource, callbackFunction, keyReplacer) => {

    keyReplacer = keyReplacer || (val => val);

    let document = {};

    return mapWaitAll(
        Object.keys(resource),
        key => callbackFunction(resource[key], key)
            .then(value => {
                document[keyReplacer(key)] = value;
                return resource;
            }))
        .then(() => document);

};

/**
 * Sequential support for waiting for one or more promises based on collections items iterator
 * that returns a Promise. This is like Promise.all(), however, this implementation
 * will execute (call) the items sequentially.  The result of the last item is available
 * to the next item.
 *
 * In practice, this is used in return Promise<void> situations because you are just processing
 * an item one at a time.
 *
 * @remarks
 *
 * This is not a sequential version of {@link mapWaitAll} because it does not return an array.
 * It could be implemented this way but hasn't yet been necessary because where map is required (rather
 * than a sequential map) order is unlike to matter. Places where this is used is to sequentially process
 * requests back to the server that mutate state (eg POST, PUT) and order needs to be ensured to avoid
 * unnecessary conflicts (or more complex error checking on the server)
 *
 * @alias reduceWaitAll
 * @param {T|T[]} collection
 * @param {function(T|*, T):Promise} promise
 * @param {T|*} context
 * @return {Promise<T|undefined|*>}
 */
export const sequentialWaitAll = (collection: NormalisableType, promise, context = {}) =>
    normalise(collection)
        .reduce(
            (acc, item) => acc.then(result => promise(result, item)),
            Promise.resolve(context || null));
