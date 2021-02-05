import { LinkedRepresentation } from 'semantic-link';
import { FormRepresentation } from '../../../interfaces/formRepresentation';
import QuestionType from './questionType';
import ChoiceCollection from './choiceCollection';


export default interface QuestionRepresentation extends LinkedRepresentation {
    name: string;
    description: string;
    instructions: string;
    headers: string;
    type: QuestionType;
    //
    editForm?: FormRepresentation;
    choices: ChoiceCollection;
}
