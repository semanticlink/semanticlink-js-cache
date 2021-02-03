import { RelationshipType } from 'semantic-link';
import anylogger from 'anylogger';

const log = anylogger('RelationshipTypeUtil');

export default class RelationshipTypeUtil {

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
    public static toCamel(rel: RelationshipType): string | undefined | never {
        if (!rel) {
            return;
        }

        // at this stage
        if (Array.isArray(rel)) {
            log.debug('using first rel type from list');
            [rel] = rel;
        }

        if (typeof rel === 'string') {
            return rel;
        }


        if (rel instanceof RegExp) {
            return (
                rel
                    .toString()
                    // remove the regexp aspects eg /test/gi -> test
                    .replace(/\/[gi]*/g, '')
                    // remove all other non aplha and hyphen chars
                    .replace(/[^-a-zA-Z]*/g, '')
                    // replace create-form --> createForm
                    .replace(/(-[a-z])/g, $1 => $1.toUpperCase().replace('-', ''))
            );
        }

        throw new Error(`Rel type of array not parsable to be converted: '${typeof rel}'`);
    }

}
