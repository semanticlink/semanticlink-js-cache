import { EditFormMergeStrategy } from '../interfaces/editFormMergeStrategy';
import { ResourceMergeFactory } from './resourceMergeFactory';
import { MergeOptions } from '../interfaces/mergeOptions';
import anylogger from 'anylogger';

const log = anylogger('defaultEditFormStrategy');

export const defaultEditFormStrategy: EditFormMergeStrategy = async (resource, documentResource, form, options?: MergeOptions) => {

    try {
        return await ResourceMergeFactory.editMerge(resource, documentResource, form, options);
    } catch (e) {
        log.error('[Merge] unknown merge error: %s' + e.message);
    }

};
