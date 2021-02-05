import { instanceOfLinkedRepresentation, LinkedRepresentation, LinkUtil, Uri } from 'semantic-link';
import { DocumentRepresentation } from '../interfaces/document';
import { FormItem } from '../interfaces/formItem';
import { MergeOptions } from '../interfaces/mergeOptions';
import { FieldType } from '../types/formTypes';
import LinkRelation from '../linkRelation';
import anylogger from 'anylogger';
import { FormUtil } from './formUtil';
import { instanceOfCollection } from './instanceOf';
import { FormRepresentation } from '../interfaces/formRepresentation';

const log = anylogger('FieldResolverUtil');

/**
 * A single value of a field like text, string, date, password, url.
 */
type SimpleValue = string | number | Uri | undefined;
/**
 * Multiple values that are contained in a field (and passed as an array) like a list of uris. Currently, only
 * uri lists are implemented.
 */
type UriListValue = Uri[];
/**
 * A complex value that is stored as an object. In practice this is a linked representation or a nested objected
 */
type ResourceValue = LinkedRepresentation | DocumentRepresentation | DocumentRepresentation[];

/**
 * All types of field values available for processing across a  form
 */
export type FieldValue = SimpleValue | UriListValue | ResourceValue | undefined;

/**
 * An enumeration across the return type from a form field
 */
enum FieldValueType {
    /**
     * The value is single
     */
    single,
    /**
     * The value is contained in an array
     *
     * Note: this closely aligns with the {@link FormItem.multiple} flag when set of the {@link FieldType.Select}
     */
    multiple,
    /**
     * The value is contained in an object
     */
    group
}

/**
 * Mapping strategy between the across-the-wire field types and internal types
 *
 * TODO: this needs to be injectable/extendable
 */
function formType(formItem: FormItem): FieldValueType {
    switch (formItem.type) {
        case FieldType.Select:
            return FieldValueType.multiple;
        case FieldType.Group:
        case FieldType.Collection:
            return FieldValueType.group;
        case FieldType.Text:
        case FieldType.TextArea:
        case FieldType.Password:
        case FieldType.Address:
        case FieldType.Email:
        case FieldType.EmailList:
        case FieldType.Uri:
        case FieldType.Currency:
        case FieldType.Number:
        case FieldType.Height:
        case FieldType.Checkbox:
        case FieldType.Date:
        case FieldType.DateTime:
        case FieldType.Tel:
        case FieldType.Signature:
        default:
            return FieldValueType.single;
    }
}

function instanceOfSimpleValue(obj: any): obj is string | number {
    return typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'undefined';
}

function instanceOfUriListValue(obj: any): obj is Uri[] {
    return Array.isArray(obj) && obj[0] && typeof obj[0] === 'string';
}

function instanceOfDocumentRepresentation(obj: any): obj is DocumentRepresentation {
    return typeof obj === 'object';
}

function instanceOfDocumentRepresentationGroup(obj: any): obj is DocumentRepresentation[] {
    return Array.isArray(obj) && obj[0] && typeof obj[0] === 'object';
}

export default class FieldResolverUtil {

    /**
     * Recursive, resolving merger that adds fields to a document based on a (create or edit) form
     * and the allowed fields with their type.
     *
     * Note: field names are converted to tracked names
     */
    public static async resolveFields(document: DocumentRepresentation, form: FormRepresentation, options?: MergeOptions): Promise<DocumentRepresentation> {

        const { defaultFields } = { ...options };

        // pick all the fields as specified from the form
        const fieldsToResolve = FormUtil.fieldsToResolve(document, form, defaultFields);

        for (const field of fieldsToResolve) {
            // find out whether there is a matching field in the form to the link relation
            const formItem = FormUtil.findByField(form, field);
            if (formItem) {
                const fieldValue = await this.resolve(document[field] as FieldValue, formItem, options);
                if (fieldValue) {
                    const { fieldResolver } = { ...options };
                    log.debug('resolving field %s', field);
                    (document)[field] = fieldResolver ?
                        fieldResolver(field, fieldValue, options) :
                        fieldValue;
                } else {
                    // an undefined result adds 'undefined' to field rather than remove
                    document[field] = fieldValue;
                    log.warn('Field \'%s\' is not resolved', field);
                }
            } else {
                log.info('Field \'%s\' is not matched in form', field);
            }
        }
        return document;
    }

    /**
     * Takes an incoming polymorphic field ({@link SimpleValue}, {@link UriListValue} or {@link ResourceValue}) and
     * checks if its value is valid against the form. To do this, it will also resolve fields if necessary.
     *
     * Resolutions are performed via injected {@link MergeOptions.resolver} and {@link MergeOptions.resourceResolver}
     *
     * @param fieldValue
     * @param item
     * @param options?
     */
    public static async resolve<T extends FieldValue>(
        fieldValue: T,
        item: FormItem,
        options?: MergeOptions): Promise<T | undefined> {

        const field = await this.resolveByType(fieldValue, item, options);
        return await this.resolvePooled(field, options) as T;
    }

    /**
     * Matches a field value against the form items switching across {@link FieldValue} type.
     *
     *  - {@link SimpleValue} - look through the list by value
     *  - {@link UriListValue} - look across the list by value
     *  - {@link ResourceValue} - look into the resource's {@link LinkRelation.Canonical} to locate the 'title'
     *
     * @param formItem a form item (with items eager loaded)
     * @param fieldValue
     * @param options
     */
    private static async findValueInItems(formItem: FormItem, fieldValue: FieldValue, options?: MergeOptions): Promise<FieldValue | undefined> {

        // design here to load items outside of this function
        if (fieldValue && formItem?.items) {
            if (instanceOfSimpleValue(fieldValue)) {
                if (formItem.items.some(item => item.value === fieldValue)) {
                    return fieldValue;
                }
            } else if (instanceOfUriListValue(fieldValue)) {
                return await Promise.all(fieldValue.map(async val => await this.findValueInItems(formItem, val, options)) as unknown as UriListValue);
            } else if (instanceOfDocumentRepresentation(fieldValue)) {

                // a lazy-loaded set of items is currently loaded from a collection
                if (instanceOfCollection(formItem.items)) {
                    if (instanceOfLinkedRepresentation(fieldValue)) {
                        const uri = LinkUtil.getUri(fieldValue as LinkedRepresentation, LinkRelation.Self);
                        if (uri) {
                            if (formItem.items.items.some(item => LinkUtil.getUri(item, LinkRelation.Self) === uri)) {
                                return uri; // return type Uri
                            } // else fall through to return undefined
                        } else {
                            log.warn('Field value not a linked representation');
                        }
                    } // else fall through to return undefined
                } else {
                    throw new Error('Not implemented object to match against form items');
                    /*
                    if (formItem.items.some(item => item.value === fieldValue.name)) {
                        return fieldValue;
                    } // else fall through to return undefined
                    */
                }
            } else {
                log.error('Field value type not found \'%s\'', typeof fieldValue);
            }
        } else {
            log.warn('No items on form \'%s\'', formItem.name);
        }
        log.warn('Value \'%s\' is not found on \'%s\' - still allowing value', fieldValue, formItem.name);
        return undefined;
    }

    /**
     * If a {@link MergeOptions.resolver} has been provided then there is potentially a pooled resource available
     * requiring resolution
     *
     * @param fieldValue
     * @param options contains the resolver to be used
     */
    private static resolvePooled<T extends FieldValue>(fieldValue: T, options?: MergeOptions): FieldValue {
        const { resolver = undefined } = { ...options };

        if (resolver) {
            if (instanceOfSimpleValue(fieldValue)) {
                return resolver.resolve(fieldValue as Uri) as T;
            } else if (instanceOfUriListValue(fieldValue)) {
                return fieldValue.map(uri => resolver.resolve(uri)) as T;
            } else if (instanceOfLinkedRepresentation(fieldValue)) {
                // no resolution
                return fieldValue;
            } else {
                log.warn('Field type unknown - returning default');
            }
        } // else return itself
        return fieldValue;
    }

    /**
     * Resolves any {@link FormItem.id} as a {@link LinkedRepresentation} when there is a {@link MergeOptions.resourceResolver}.
     *
     * Note:
     *  - current strategy to resolve on the title of the canonical on the field value.
     *  - there is no placement of the resolution onto the item
     *
     * @param item form item to process for resolution
     * @param fieldValue
     * @param options
     */
    private static async resolveResource<T extends ResourceValue>(item: FormItem, fieldValue: T, options?: MergeOptions): Promise<T> {

        if (item?.id) {
            //
            const { resourceResolver = undefined } = { ...options };
            if (resourceResolver) {
                /*
                 * Current strategy is to default looking up a title on canonical
                 *
                 * TODO: make injectable
                 */
                const type = LinkUtil.getTitle(fieldValue as LinkedRepresentation, LinkRelation.Canonical);

                log.debug('matching items collection with resolver type \'%s\' on %s', type, item.id);
                const resource = await resourceResolver(type)(fieldValue as LinkedRepresentation, options);
                return resource as T;
            } // else no resolver
        }
        return fieldValue as T;
    }


    /**
     *
     * @param fieldValue
     * @param formItem
     * @param options
     */
    private static async resolveByType<T extends FieldValue>(
        fieldValue: T,
        formItem: FormItem,
        options?: MergeOptions): Promise<T | undefined> {

        switch (formType(formItem)) {
            case FieldValueType.single: // could have checks to ensure this is a 'text' or 'uri' only
                if (fieldValue && !instanceOfSimpleValue(fieldValue)) {
                    log.error('Unexpected type \'%s\' on form type %s with \'%s\'', typeof fieldValue, formItem.type, formItem.name);
                    return undefined;
                    // throw new Error('Not implemented. Resource on simple field');
                }
                if (formItem.multiple) {
                    log.error('Unexpected attribute \'multiple\' on form type %s with \'%s\'', formItem.type, formItem.name);
                }    /**/  // return await sequentialMapWaitAll(fieldValue as CollectionRepresentation, (text: string) => text);

                return fieldValue;

            /**
             * Type: http://types/select, moves through the structure
             */
            case FieldValueType.multiple:

                await FormUtil.resolveItemsFromCollection(formItem, options);
                // TODO: all resolutions must be on the outside
                let value = await this.findValueInItems(formItem, fieldValue, options);

                if (!value && instanceOfDocumentRepresentation(fieldValue)) {
                    const { resourceResolver } = { ...options };
                    if (resourceResolver) {
                        value = await resourceResolver(formItem.name)(fieldValue as LinkedRepresentation, options);
                    }
                }

                // check the value returned needs to be an enumeration.
                if (formItem.multiple) {
                    // return back an Uri[] removing all undefined to meet {@link UriListValue}
                    return ((instanceOfSimpleValue(value) ? [value] : value) as Uri[])
                        .filter(x => !!x) as unknown as T;
                    // check that the value is part of the provided items enumeration in the form
                } else {
                    // undefined is acceptable as it is {@link SimpleValue}
                    return value as unknown as T;
                }

            /**
             * Type: http://types/group, recursively moves through the structure
             *
             * note: groups have an items (but unlike http://types/select) it is dealt with as part
             *       of the recursion structure of a form item
             */
            case FieldValueType.group:
                if (formItem.multiple) {
                    if (instanceOfDocumentRepresentationGroup(fieldValue)) {
                        return (await Promise.all(
                            fieldValue.map(async value => {
                                if (value) {
                                    return await this.resolveFields(value, formItem as unknown as FormRepresentation, options);
                                } // else return undefined
                            })))
                            // remove any undefined
                            .filter(x => !!x) as T;
                    } else {
                        log.error('Group with multiple must be implemented as an array of Document Representation');
                    }
                } else {
                    if (!instanceOfDocumentRepresentation(fieldValue)) {
                        log.warn('Group must be implemented a DocumentRepresentation');
                    }
                    // otherwise it is a single group and resolve treating the object as a LinkedRepresentation
                    // throw new Error('Group not implemented');
                    return await this.resolveFields(fieldValue as DocumentRepresentation, formItem as unknown as FormRepresentation, options) as T;
                }
            default:
                log.warn('Unknown form type \'%s\' on \'%s\'', formItem.type, formItem.name);
                return undefined;
        }
    }

}
