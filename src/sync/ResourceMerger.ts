import _ from 'underscore';
import * as SparseResource from '../cache/sparseResource';
import * as link from 'semantic-link';
import {CacheOptions, FieldType, FormRepresentation} from '../interfaces';
import {defaultResolver} from './syncResolver';
import {dashToCamel, filterCamelToDash, camelToDash} from '../utils/linkRel';
import {compactObject} from '../utils/representation';
import {mapWaitAll, sequentialWaitAll, mapAttributeWaitAll} from '../utils/asyncCollection';
import {Link, LinkedRepresentation} from "semantic-link";
import {CreateMergeOptions, EditMergeOptions, MergeOptions} from "../cache/interfaces";
import {log} from "semantic-link/lib/logger";

/**
 * Processes difference sets (created, update, delete) for between two client-side collections {@Link CollectionRepresentation}
 *
 * @constructor
 */
export default class ResourceMerger {

    /**
     *
     * @param {Link} link
     * @return {function(link:Link):{links: *[]}}
     * @private
     */
    static get defaultSparseResourceFactory()  {
        return (link:Link) => SparseResource.makeFromFeedItem(link);
    }

    /**
     * Returns the fields that the server is willing to accept. Current it defaults to finding
     * 'name'.
     *
     * Note: the formResource is of the format - the `items` list the fields that the server will accept
     * <pre>
     * {
     *  links: [],
     *  items:
     *    [
     *      {
     *          type: "",
     *          name: "",
     *          description: ""
     *      }
     *    ]
     * }
     * </pre>
     * @param {FormRepresentation} formResource
     * @param {string[]=} defaultFields
     * @return {string[]}
     */
    fields(formResource, defaultFields = []) {
        return _(formResource.items)
            .chain()
            .map(item => item.name)
            .union(defaultFields)
            .value();
    }

    /**
     * Recursive, resolving merger that adds fields to a document based on a (create or edit) form
     * and the allowed fields with their type.
     *
     * @param {*} doc
     * @param {FormRepresentation} form
     * @param {CacheOptions} options
     * @return {Promise} containing the merged document
     * @private
     */
    resolveFields<T>(doc:T, form:FormRepresentation, options:CacheOptions) :Promise<T>{
        return mapAttributeWaitAll(
            doc,
            (textUriOrResource, field) => {

                const resolveFieldToFieldByType = (textUriOrResource, formItem, options) => {

                    if (formItem.type === FieldType.Text
                        || formItem.type === FieldType.Date
                        || formItem.type === FieldType.DateTime
                        || formItem.type === FieldType.Email
                    ) {
                        if (formItem.multiple) {
                            return mapWaitAll(textUriOrResource, text => Promise.resolve(text));
                        } else {
                            return Promise.resolve(textUriOrResource);
                        }

                    } else if (formItem.type === FieldType.Select) {

                        /**
                         * When returning https://types/select, you can return:
                         *
                         *    key: 'url'    <-- resolved via a resolver
                         *    key: ['url']  <-- resolved via a resolver  (note: array of n 'url')
                         *    key: 'value'   <-- resolved via items enumeration
                         *    key: ['value'] NOT IMPLEMENTED - no current use case
                         *
                         */

                        // check the value returned needs to be an enumeration.
                        if (formItem.multiple) {

                            if (options.resolver.resolve) {

                                // normalise to an array so we can map across it (and return an array of resolved urls)
                                textUriOrResource = _(textUriOrResource).isString() ? [textUriOrResource] : textUriOrResource;
                                const uris = _(textUriOrResource).map(uri => options.resolver.resolve(uri, formItem));
                                return Promise.resolve(uris);

                            } else {

                                log.error(`No uri resolver setup for a multiple select on '${field}`);
                                return Promise.resolve(undefined);
                            }

                            // check that the value is part of the provided items enumeration in the form
                        } else if (formItem.items) {

                            const validValue = _(formItem.items).any(item => item.value === textUriOrResource);

                            // at this stage, just log an error if the value doesn't match
                            if (!validValue) {
                                log.error(`Value '${textUriOrResource}' is not found on '${field}' - still allowing value`);
                            }
                            // but hand back the value regardless - we may wish to change this to error
                            return Promise.resolve(textUriOrResource);

                        } else if (options.resolver.resolve) {

                            return (options.resourceResolver(formItem.name) || Promise.resolve)(textUriOrResource, options)
                                .then(resource => {
                                    if (resource) {
                                        // resource was found in a pooled collection and return uri (resolved)
                                        const uri = link.getUri(resource, /self|canonical/);
                                        const resolved = options.resolver.resolve(uri);
                                        log.info(`Resolved field '${field}' '${uri} --> ${resolved}`, options);
                                        return resolved;
                                    } else {
                                        const resolved = options.resolver.resolve(textUriOrResource);
                                        log.warn(`Form upgrade required: no uri resolution for '${field}'`);
                                        log.info(`Resolved field '${field}' ${textUriOrResource} --> ${resolved}`, options);
                                        return resolved;
                                    }
                                });

                        } else {
                            log.info(`No uri resolver setup for '${field}' using value: ${textUriOrResource}`);
                            return Promise.resolve(textUriOrResource);

                        }

                        /**
                         * Type: http://types/group, recursively moves through the structure
                         *
                         * note: groups have a items (but unlike http://types/select) it is dealt with as part
                         *       of the recursion structure of a form item
                         */
                    } else if (formItem.type === FieldType.Group) {

                        if (formItem.multiple) {
                            // multiple is an array of group structures
                            return mapWaitAll(textUriOrResource, resource => this.resolveFields(resource, formItem, options));
                        } else {
                            // otherwise it is a single group
                            return this.resolveFields(textUriOrResource, formItem, options);
                        }

                    } else {
                        log.warn(`Unknown form type '${formItem.type}' on '${field}'`);
                        return Promise.resolve(undefined);
                    }
                };

                // attributes are camel case, so let's ensure we have the normalised form to be added as a field to resource
                field = dashToCamel(field);

                // find out whether there is a matching field in the create form to the link relation
                let formItem = _(form.items).find(item => item.name === field);

                if (formItem) {
                    return resolveFieldToFieldByType(textUriOrResource, formItem, options);

                } else {
                    log.info(`Field '${field}' is not matched in create form`);
                    return Promise.resolve(textUriOrResource);
                }

            },
            dashToCamel);
    }

    /**
     * Resolving merger that adds fields to a document based on link relations found on a (create or edit) form
     * @param doc
     * @param formResource
     * @param {Link} aLink
     * @param {CacheOptions} options
     * @return {*} document with matched fields
     * @private
     */
    resolveLinkRelationToFieldByType(doc, formResource, aLink, options) {

        const {rel, href} = aLink;

        // attributes are camel case, so let's ensure we have the normalised form to be added as a field to resource
        const field = dashToCamel(rel);

        // find out whether there is a matching field in the create form to the link relation
        const formItem = _(formResource.items).find(item => item.name === field);

        if (!formItem) {
            log.info(`Field '${field}' is not matched on create form for link relation`);
            return doc;
        }

        if (formItem.type === FieldType.Select) {

            if (formItem.multiple) {
                doc[field] = doc[field] || [];
                doc[field].push(options.resolver.resolve(href, formItem));
            } else {
                // this is a single string select that is put back into the attribute
                doc[field] = options.resolver.resolve(href, formItem);
            }

        } else if (formItem.type === FieldType.Collection) {
            // this should return back an array
            doc[field] = doc[field] || [];
            doc[field].push(options.resolver.resolve(href, formItem));

            // } else if (formItem.type === 'http://types/group') {
            // } else if (formItem.type === 'http://types/group') {
            //     // this should return back an object
            //     resource[field] = resource[field] || [];
            //     resource[field].push(resolver.resolver.resolve(aLink.href, formItem));
            //
        } else if (formItem.type === FieldType.Text) {
            log.warn(`Unexpected form type on link relation: ${rel}`);
            doc[field] = href;
        } else {
            log.warn(`Unknown form type '${formItem.type}' on link relation: ${rel}`);
        }
        return doc;
    }

    /**
     *
     * @param resource
     * @param fieldsToReturn
     * @param formResource
     * @param {CacheOptions} options
     * @return {*}
     * @private
     */
    resolveLinkRelations(resource, fieldsToReturn, formResource, options) {

        // link relations exist as a dashed form and fields/create forms use camel case
        let linkRelationsToReturn = filterCamelToDash(fieldsToReturn);

        if (!resource) {
            log.warn(`Document does not exist for form ${link.getUri(formResource, /self/)}`);
            return Promise.resolve({});
        }

        return sequentialWaitAll(
            resource.links,
            (memo, aLink) => {

                const containsLinkRel = (arr, doc, rel) => (_(arr).contains(rel) && !doc[rel]);

                // match first against raw rel against attributes
                // second try those that might be camel cased and we need to check against dashed form
                if (containsLinkRel(fieldsToReturn, resource, aLink.rel) ||
                    containsLinkRel(linkRelationsToReturn, resource, aLink.rel)) {

                    options = _({}).extend(options, {
                        resourceFactory: options.resourceFactory || ResourceMerger.defaultSparseResourceFactory,
                        mappedTitle: SparseResource.mappedTitle
                    });

                    let sparseResource = options.resourceFactory(aLink);

                    // match against a resolver which at this point is hardcoded as the name of the link relation
                    return (options.resourceResolver(aLink.rel) || Promise.resolve)(sparseResource, options)
                        .then(() => this.resolveLinkRelationToFieldByType(memo, formResource, aLink, options));
                }
                return Promise.resolve(memo);
            }
        );
    }

    /**
     * A basic dirty check type function comparing an original resource with a new document.
     * @param resource original document
     * @param mergedDocument updates to be made
     * @param {string[]} fields array of fields that require update
     * @private
     */
    fieldsRequiringUpdate(resource, mergedDocument, fields) {
        return _.reject(fields, field => {
            if (_(mergedDocument).has(field)) {
                // WARNING: This might have problems if the field is a 'multiple'    <<<<<<<<<<<<<<<< ---- please review
                return resource[field] === mergedDocument[field];
            } else {
                return true;
            }
        });
    }

    /**
     * Makes the new document with all links and fields resolved.
     * @param document
     * @param formResource
     * @param {MergeOptions} options
     * @return {Promise.<*>|Promise} containing the document updates to be merged
     * @private
     */
    mergeLinksAndFields<T>(document:T, formResource:FormRepresentation, options:MergeOptions):Promise<T> {
        options.resolver = options.resolver || defaultResolver;
        options.resourceResolver = options.resourceResolver || (() => () => Promise.resolve(undefined));

        // preparation: get all the fields to return back to the API
        const fieldsToReturn = this.fields(formResource, options.defaultFields);

        // step 1: pick all the fields as specified from the form
        const fieldsToResolve = _(document).pick((key, value) => _(fieldsToReturn).contains(value));

        // step 2: merge links relations into fields
        return this.resolveFields(fieldsToResolve, formResource, options)
            .then(resolvedFields =>
                this.resolveLinkRelations(document, fieldsToReturn, formResource, options)

                // step 3: merge all fields together as a document
                    .then(resolvedLinks => _(resolvedFields).extend(resolvedLinks)));
    }

    /**
     *
     * @param resource
     * @param document
     * @param isTracked
     */
    transformAndCleanTrackedResources(resource, document, isTracked) {

        const filterTrackedFieldsOnesource = resource => _(resource)
            .chain()
            .pick((value, key) => isTracked(resource, key))
            .keys()
            .value();

        const trackedFields = filterTrackedFieldsOnesource(resource);

        const fieldsToTransformToLinkRelations = (resource, trackedFields) =>
            _(trackedFields).filter(field => link.matches(resource, camelToDash(field)));

        const linkRelsToUpdate = fieldsToTransformToLinkRelations(resource, trackedFields);

        // now copy across the fields from the document into the link relations of the resource - we don't
        // do a deep merge on link relations
        _(resource.links).each(link => {
            if (_(linkRelsToUpdate).contains(link.rel)) {
                const field = dashToCamel(link.rel);
                link.href = document[field];
                delete document[field];
            }
        });

        // remove all tracked fields from the resource and merge with document
        // omit any empty fields (that were left with the `delete object[property]` above
        return compactObject({
            ..._(resource).omit(trackedFields),
            ...document
        });
    }

    /**
     * A merge between the a form (create) resource and an existing resource. It merges based on
     * both attributes and link relations in a resource
     *
     * Example One:
     *
     * formResource fields:
     *   'name', 'job', 'relates'
     *
     * resource:
     * {
     *    links: [
     *      { rel: 'self', href: 'http://example.com/item/1' },
     *      { rel: 'relates', href: 'http://example.com/job/1' },
     *    ],
     *    name: 'this',
     *    job: 'that'
     *    type: '1'
     *  }
     *
     *  result:
     *  {
     *      relates: 'http://example.com/job/1',
     *      name: 'this',
     *      job: 'that'
     *  }
     *
     *
     * The resolver will match against fields and return a value. This is used
     * for example with the 'relates' attribute to return a href reference to the parent resource
     *
     * Example Two: 'http://types/collection'
     *
     * formResource fields:
     *   {
     *
     *    "links": [
     *        {
     *            "rel": "self",
     *            "href": "http://localhost:1080/page/form/edit"
     *        }
     *    ],
     *    "items": [
     *        {
     *            "type": "http://types/text",
     *            "name": "title",
     *            "description": "The title of the survey"
     *        },
     *        {
     *            "type": "http://types/collection",
     *            "name": "role",
     *            "description": "An optional list of roles to be granted access to the page"
     *        }
     *    ]
     *}
     *
     * resource:
     * {
     *    links: [
     *      { rel: 'self', href: 'http://example.com/item/1' },
     *      { rel: 'role', href: 'http://example.com/role/1' },
     *      { rel: 'role', href: 'http://example.com/role/2' },
     *    ],
     *    title: 'this',
     *  }
     *
     *  result:
     *  {
     *      role: ['http://example.com/role/1', 'http://example.com/role2']
     *      name: 'this',
     *  }
     * Example Three: 'http://types/group'
     *
     * formResource fields:
     *   {
     *
     *    "links": [
     *        {
     *            "rel": "self",
     *            "href": "http://localhost:1080/page/form/edit"
     *        }
     *    ],
     *    "items": [
     *        {
     *            "type": "http://types/text",
     *            "name": "title",
     *            "description": "The title of the survey"
     *        },
     *        {
     *
     *           "type": "http://types/group",
     *           "name": "textBox",
     *           "items": [
     *               {
     *                   "type": "http://types/text",
     *                   "name": "height",
     *                   "description": "The height of the text box in lines"
     *               },
     *               {
     *                   "type": "http://types/text",
     *                   "name": "width",
     *                   "description": "The width of the text box in characters"
     *               }
     *           ],
     *           "description": "Dimensions for a text box"
     *        }
     *    ]
     *}
     * resource:
     * {
     *    links: [
     *      { rel: 'self', href: 'http://example.com/item/1' },
     *    ],
     *    textBox: {
     *      height: 5,
     *      width: 20
     *    }
     *  }
     *
     *  result:
     *  {
     *    textBox: {
     *      height: 5,
     *      width: 20
     *    }
     *  }
     * @type {CreateFormMergeStrategy}
     * @param {*} resource
     * @param {FormRepresentation} formResource
     * @param {CreateMergeOptions=} options
     * @return {Promise} containing the resource to be created as a resource
     */
    createMerge<T>(resource:T, formResource:FormRepresentation, options:CreateMergeOptions = {}):Promise<T> {
        return this.mergeLinksAndFields(resource, formResource, options);
    }

    /**
     * A three-way merge between a form (edit or create) resource and existing {@link LinkedRepresentation}
     * client-side representation within the api network of data and a new {@Link LinkedRepresentation} document.
     *
     * Use option {@link EditMergeOptions.undefinedWhenNoUpdateRequired} to return undefined
     * when no update is required
     *
     * The basic merge is:
     *      1. remove any fields document representation that are not field items in the form
     *      2. merge the document into the client-side representation
     * @type {EditFormMergeStrategy}
     * @param {LinkedRepresentation} resource a clean over wire version
     * @param {*} document
     * @param {FormRepresentation} formResource
     * @param {EditMergeOptions=} options
     * @return {*|undefined}
     */
    editMerge<T extends LinkedRepresentation>(
        resource:T,
        document,
        formResource:FormRepresentation,
        options:EditMergeOptions = {}) {

        const isTracked = options.isTracked || (() => false);

        return this.mergeLinksAndFields(document, formResource, options)
            .then(resolvedDocument => {

                // step 4: include the original resource and overwrite all fields
                const mergedDocument = this.transformAndCleanTrackedResources(resource, resolvedDocument, isTracked);

                // return undefined if the flag is on and there are no updates
                if (options.undefinedWhenNoUpdateRequired) {

                    // now check if the two resources are actually different based on matching only fields that need to be returned
                    const fieldsToUpdate = this.fieldsRequiringUpdate(
                        resource,
                        mergedDocument,
                        this.fields(formResource, options.defaultFields));

                    if (!_(fieldsToUpdate).isEmpty()) {
                        log.info(`Update required on '${mergedDocument.name || link.getUri(mergedDocument, /self/)}': different fields ${fieldsToUpdate.join(',')}`);
                        return mergedDocument;
                    } else {
                        return undefined;
                    }
                } else {
                    return mergedDocument;
                }

            });

    }

}

export let resourceMerger = new ResourceMerger();
