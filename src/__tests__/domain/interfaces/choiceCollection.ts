import { CollectionRepresentation } from 'semantic-link';
import { ChoiceRepresentation } from './choiceRepresentation';
import { FormRepresentation } from '../../../interfaces/formRepresentation';

export interface ChoiceCollection extends CollectionRepresentation<ChoiceRepresentation> {
    createForm?: FormRepresentation;
}
