import ResourceMergeFactory from '../resourceMergeFactory';
import { MergeOptions } from '../../interfaces/mergeOptions';
import anylogger from 'anylogger';
import { CreateFormMergeStrategy } from '../../interfaces/createFormMergeStrategy';

const log = anylogger('defaultCreateFormStrategy');

export const defaultCreateFormStrategy: CreateFormMergeStrategy = async (documentResource, form, options?: MergeOptions) => {

    try {
        return await ResourceMergeFactory.createMerge(documentResource, form, options);
    } catch (e) {
        log.error('[Merge] unknown merge error: %s' + e.message);
    }

};
