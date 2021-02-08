import {
    CollectionRepresentation,
    instanceOfLinkedRepresentation,
    LinkedRepresentation,
    LinkType,
    LinkUtil,
    RelationshipType,
} from 'semantic-link';
import { TrackedRepresentation } from '../types/types';
import TrackedRepresentationFactory from './trackedRepresentationFactory';
import { ResourceQueryOptions } from '../interfaces/resourceQueryOptions';
import { ResourceLinkOptions } from '../interfaces/resourceLinkOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import anylogger from 'anylogger';
import RepresentationUtil from '../utils/representationUtil';
import SparseRepresentationFactory from './sparseRepresentationFactory';
import LinkRelation from '../linkRelation';
import { DocumentRepresentation } from '../interfaces/document';
import ResourceUpdateOptions from '../interfaces/resourceUpdateOptions';
import { ResourceMergeOptions } from '../interfaces/resourceAssignOptions';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { defaultCreateFormStrategy } from './createFormMergeStrategy';
import ApiUtil from '../apiUtil';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';

const log = anylogger('create');

/**
 *
 * TODO: accept but don't require TrackedRepresentation interface
 */
export default async function create<U extends LinkedRepresentation = LinkedRepresentation,
    T extends LinkedRepresentation = TrackedRepresentation<U>>(
    document: DocumentRepresentation | LinkType,
    options?: ResourceFactoryOptions &
        ResourceQueryOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceFetchOptions): Promise<T | undefined> {

    if (!document) {
        log.debug('No document provided to create');
        return;
    }

    const {
        on,
        rel = LinkRelation.Self,
    } = { ...options };


    if (on) {
        if (instanceOfCollection(on)) {
            return await createCollectionItem(on, document as DocumentRepresentation, options) as unknown as T;
        } else {
            log.warn('option \'on\' options cannot be used outside of a collection, skipping');
            // fall through and keep processing
        }
    }

    if (!instanceOfLinkedRepresentation(document)) {
        const uri = LinkUtil.getUri(document as LinkType, rel);
        if (!uri) {
            log.warn('no uri found on rel \'%s\' on resource create', rel);
        }
        return SparseRepresentationFactory.make({ uri }) as T;
    }


    throw new Error('create options not satisfied');
}

async function createCollectionItem<T extends LinkedRepresentation>(
    resource: CollectionRepresentation<T>,
    document: DocumentRepresentation<T>,
    options?: ResourceUpdateOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceMergeOptions &
        ResourceFetchOptions): Promise<TrackedRepresentation<T> | undefined> {

    const {
        mergeStrategy = defaultCreateFormStrategy,
        formRel = [LinkRelation.CreateForm, LinkRelation.SearchForm] as RelationshipType,
    } = { ...options };

    const form = await ApiUtil.get(resource as unknown as TrackedRepresentation<T>, {
        ...options,
        rel: formRel,
    }) as FormRepresentation;

    if (form) {
        try {
            const merged = await mergeStrategy(document, form, options);

            if (merged) {

                /*
                 * Choose where to get the uri from in cascading order:
                 *  - form with submit, use submit href on the form
                 *  - otherwise, Self link on the collection itself
                 */
                const hasSubmitRel = LinkUtil.matches(form, LinkRelation.Submit);
                const contextResource = hasSubmitRel ? form : resource;
                const rel = hasSubmitRel ? LinkRelation.Submit : LinkRelation.Self;

                const item = await TrackedRepresentationFactory.create(
                    contextResource,
                    merged,
                    { ...options, rel }) as TrackedRepresentation<T>;

                // 201 will return an item compared with 200, 202
                if (item) {
                    RepresentationUtil.addItemToCollection(resource, item as LinkedRepresentation);
                    return item;
                } // drop through and return undefined

            } else {
                log.info('No create required %s', LinkUtil.getUri(resource, LinkRelation.Self));
            }
        } catch (e) {
            log.error('Merge error %s', e.message);
        }
    } else {
        log.info('Create not possible - resource has no form %s', LinkUtil.getUri(resource, LinkRelation.Self));
    }
}

