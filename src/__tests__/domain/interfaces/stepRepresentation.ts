import { LinkedRepresentation, Uri } from 'semantic-link';
import StepType from './stepType';
import StepCollection from './stepCollection';
import { FormRepresentation } from '../../../interfaces/formRepresentation';

export default interface StepRepresentation extends LinkedRepresentation {
    name: string;
    description: string | Uri;
    order: number;
    type: StepType;
    /**
     * Workflows are currently implemented as a specific polymorphism:
     *   - level 1: workflow (has pages as steps)
     *   - level 2: page (has items inside each page as steps)
     *   - level 3: step (question, information, etc and has NO steps)
     */
    steps?: StepCollection;
    // available only for some step types
    // field?: QuestionRepresentation | TemplateRepresentation | InformationRepresentation;
    //
    editForm?: FormRepresentation;
}
