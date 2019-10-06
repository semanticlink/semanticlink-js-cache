import * as link from 'semantic-link';


/**
 * Match on the canonical or self link relation on the resources
 *
 * @type {Comparator}
 * @param {LinkedRepresentation} lvalue
 * @param {LinkedRepresentation} rvalue
 * @return {boolean}
 */
export const canonicalOrSelf = (lvalue, rvalue) => {
    const lUri = link.getUri(lvalue, /self|canonical/);
    const rUri = link.getUri(rvalue, /self|canonical/);
    return !!lUri && lUri === rUri;
};

/**
 * Simple match on the name attribute on the resources
 *
 * @type {Comparator}
 * @param {Link} lvalue
 * @param {Link} rvalue
 * @return {boolean}
 */
export const name = (lvalue, rvalue) => !!lvalue.name && lvalue.name && lvalue.name === rvalue.name;

/**
 * A default set of comparisons made to check if two resource
 * representation refer to the same resource in a collection.
 *
 * The most specific and robust equality check is first, with the most vague and
 * optimistic last.
 *
 * @type {Comparator[]}
 */
export const defaultEqualityOperators = [
    canonicalOrSelf,
    name
];