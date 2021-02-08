import { ApiOptions } from './apiOptions';
import { LinkedRepresentation, Uri } from 'semantic-link';
import { DocumentRepresentation } from './document';

export interface FieldResolver {
    <T>(field: string, value: T, options?: ApiOptions): T;
}


/**
 * A single value of a field like text, string, date, password, url.
 */
export type SimpleValue = string | number | Uri | undefined;
/**
 * Multiple values that are contained in a field (and passed as an array) like a list of uris. Currently, only
 * uri lists are implemented.
 */
export type UriListValue = Uri[];
/**
 * A complex value that is stored as an object. In practice this is a linked representation or a nested objected
 */
export type ResourceValue = LinkedRepresentation | DocumentRepresentation | DocumentRepresentation[];

/**
 * All types of field values available for processing across a  form
 */
export type FieldValue = SimpleValue | UriListValue | ResourceValue | undefined;


