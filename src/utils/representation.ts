import _ from 'underscore';
import {LinkedRepresentation} from "semantic-link";


export function extendResource<T extends any>(...obj: T[]): T[] {
    // stolen from https://gist.github.com/kurtmilam/1868955
    let source: T;

    const isAssign = (oProp: string, sProp: string): boolean =>
        (_.isUndefined(oProp) || _.isNull(oProp) || _.isNull(sProp) || _.isDate(sProp));

    const procAssign = (oProp: string, sProp: string, propName: string): any => {
        // Perform a straight assignment
        // Assign for object properties & return for array members
        obj[propName] = _(sProp).clone();
        return obj[propName];
    };

    const hasObject = (oProp: string, sProp: string): boolean => (_.isObject(oProp) || _.isObject(sProp));

    const procObject = (oProp: string, sProp: string, propName: string): any => {
        // extend oProp if both properties are objects
        if (!_.isObject(oProp) || !_.isObject(sProp)) {
            throw new Error('Trying to combine an object with a non-object (' + propName + ')');
        }
        // Assign for object properties & return for array members
        obj[propName] = extendResource<T>(oProp, sProp);
        return obj[propName];
    };

    const procMain = (propName: string): void => {
        const oProp = obj[propName];
        const sProp = source[propName];

        // The order of the 'if' statements is critical

        // Cases in which we want to perform a straight assignment
        if (isAssign(oProp, sProp)) {
            procAssign(oProp, sProp, propName);
        }
        // At least one property is an object
        else if (hasObject(oProp, sProp)) {
            procObject(oProp, sProp, propName);
        }
        // Everything else
        else {
            // Let's be optimistic and perform a straight assignment
            procAssign(oProp, sProp, propName);
        }
    };

    const procAll = (src: T): void => {
        source = src;
        Object.keys(source).forEach(procMain);
    };

    _.each(Array.prototype.slice.call(arguments, 1), procAll);

    return obj;
}

/**
 * Merge a resource with a new document returning the existing resource with only fields updated in the
 * fields (whitelist) from the document.
 *
 * @param {LinkedRepresentation} resource
 * @param {LinkedRepresentation} document
 * @param {string[]} fields
 * @return {*} containing a document
 */
export const mergeByFields = (resource: LinkedRepresentation, document: LinkedRepresentation, fields: string[]) => {
    // TODO: WARNING: the pick predicate has the parameters named incorrectly.
    let documentToMerge = _(document)
        .pick((key:any, value:string) => _(fields).contains(value));
    // do a deep merge into a new document
    return extendResource<LinkedRepresentation>({} as LinkedRepresentation, resource, documentToMerge);
};

/**
 * Remove empty and undefined values from the object.
 */
export const compactObject = (resource: any) => _(resource)
    .omit((val:any) => {
        return !!(_.isObject(val) && _.isEmpty(val)) || _.isUndefined(val);
    });
