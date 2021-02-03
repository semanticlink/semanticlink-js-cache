import { LinkedRepresentation, Uri } from 'semantic-link';
import StepType from './stepType';
import StepCollection from './stepCollection';

export default interface StepRepresentation extends LinkedRepresentation {
    name: string;
    description: string | Uri;
    order: number;
    type: StepType;
    //
    steps?: StepCollection;
}

// export interface WorkflowStepRepresentation extends StepRepresentation {
//     /**
//      * Workflows are currently implemented as a specific polymorphism:
//      *   - level 1: workflow (has pages as steps)
//      *   - level 2: page (has items inside each page as steps)
//      *   - level 3: step (question, information, etc and has NO steps)
//      */
//     steps?: StepCollection;
//     step?: StepRepresentation;
//     /**
//      * All workflows have answers but these are implemented differently
//      *  - {@link JobSeekerStepRepresentation} actual answers as a collection with create form
//      *  - {@link BusinessStepRepresentation} empty answers with a display form for laying out values (questions and information only)
//      */
//     answers?: AnswerCollection;
//     // available only for some step types
//     field?: QuestionRepresentation | TemplateRepresentation | InformationRepresentation;
// }
//
// /**
//  * Step representation as seen by the business
//  */
// export interface BusinessStepRepresentation extends WorkflowStepRepresentation {
//     //
//     editForm?: FormRepresentation;
// }
//
// export interface JobSeekerStepRepresentation extends WorkflowStepRepresentation {
//     //
//     // no longer used
//     canonical?: StepRepresentation;
//     questions?: QuestionRepresentation;
//     jobPosting?: JobPostingRepresentation;
//     //
//     // field uri will be the same as any of the three below and is the new design
//     // to deprecate them
//     //
//     information?: InformationRepresentation;
//     question?: QuestionRepresentation;
//     template?: TemplateRepresentation;
//     //
//     // TODO: this will change to consent (but hasn't yet)
//     disclosure?: ApplicationConsentFieldCollection;
// }
//
// export interface JobPostingStepRepresentation {
//     step: StepRepresentation;
// }
