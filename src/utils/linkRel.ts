/**
 * Takes an array of potentially camel-cased strings and only returns those that have a dash in
 * the form
 *
 * @example
 *   [questionType, type] --> [question-type, type]
 *
 * @param {string[]} array
 * @return {string[]}
 */
import {RelationshipType} from "semantic-link";

export const filterCamelToDash = (array:string[]) =>
    (array || [])
        .filter(item => (/[A-Z]/).test(item))
        .map(item => item.replace(/([A-Z])/g, $1 => '-' + $1.toLowerCase()));

export const camelToDash = (array:string|string[]) => {
    if (typeof array === 'string') {
        return array.replace(/([A-Z])/g, $1 => '-' + $1.toLowerCase());
    }
    return array.map((item) => item.replace(/([A-Z])/g, ($1:string) => '-' + $1.toLowerCase()));
};

/**
 * Takes a string and returns any dash string as camel-cased string
 *
 * @example
 *   question-type --> questionType
 *   type          --> type
 *
 * TODO: just check that the dash '-' doesn't need escaping (webstorm says it doesn't)
 *
 * @param {string} str
 * @return {string}
 */
export const dashToCamel = (str:string) => str.replace(
    /(-[a-z])/g,
    ($1:string) => $1.toUpperCase().replace('-', ''));

/**
 * Takes a string or a Regexp and makes camel cased strings.
 *
 * @example
 *
 *      test -> test
 *      /test/ -> test
 *      /test/g -> test
 *      /create-form/ -> createForm
 *
 * @param {RelationshipType} rel
 * @returns {string}
 */
export function relTypeToCamel(rel:RelationshipType) {

    if (!rel) {
        return;
    }

    if (typeof rel === 'string') {
        return rel;
    }

    if (rel instanceof RegExp) {
        return rel.toString()
        // remove the regexp aspects eg /test/gi -> test
            .replace(/\/[gi]*/g, '')
            // replace create-form --> createForm
            .replace(/(-[a-z])/g, $1 => $1.toUpperCase()
                .replace('-', ''));

    }

    throw new Error(`Rel type of array not parsable to be converted: '${typeof rel}'`);
}
