import StepCollection from './interfaces/stepCollection';
import CustomLinkRelation from './CustomLinkRelation';
import anylogger from 'anylogger';
import ApiUtil from '../../apiUtil';
import { ResourceQueryOptions } from '../../interfaces/resourceQueryOptions';
import StepType from './interfaces/stepType';
import StepRepresentation from './interfaces/stepRepresentation';
import { TrackedRepresentation } from '../../types/types';

const log = anylogger('Step');

export default class Step {

    /**
     * Return steps collection with items hydrated
     */
    public static async getSteps(step: StepRepresentation, options?: ResourceQueryOptions): Promise<StepCollection | undefined> {
        return await ApiUtil.get<StepRepresentation, StepCollection>(
            step as TrackedRepresentation<StepRepresentation>,
            { ...options, includeItems: true, rel: CustomLinkRelation.Steps });
    }


    /**
     * Takes all steps (level: workflow, page or item), recursively hydrates each type (simple types and complex types)
     */
    public static async loadStep(step: StepRepresentation, options?: ResourceQueryOptions): Promise<void> {
        log.debug('loading page: %s', step.name);
        const steps = await Step.getSteps(step, options);
        if (steps?.items) {
            for (const item of steps.items) {
                await this.loadType(item, options);
            }
        }
    }

    private static async loadType(step: StepRepresentation, options?: ResourceQueryOptions): Promise<void> {
        log.debug('loading type \'%s\': \'%s\'', step.type, step.name || '');
        switch (step.type) {
            case StepType.information:
                // await Information.getByStep(step, options);
                return;
            case StepType.question:
                //await this.loadQuestionWithChoices(step, options);
                return;
            case StepType.template:
                //await this.loadTemplateWithContentAndFields(step, options);
                return;
            case StepType.page:
                await this.loadStep(step, options);
                return;
            case StepType.image:
            case StepType.video:
            case StepType.heading:
                return;
            default:
                log.warn('Not implemented %s', step.type);
        }
    }


}
