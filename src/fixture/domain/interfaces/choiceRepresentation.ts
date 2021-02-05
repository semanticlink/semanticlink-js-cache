import { LinkedRepresentation } from 'semantic-link';
import { FormRepresentation } from '../../../interfaces/formRepresentation';

export default interface ChoiceRepresentation extends LinkedRepresentation {
    name: string;
    //
    // answers: AnswerCollection;
    editForm?: FormRepresentation;
}
