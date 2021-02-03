import { FormItem } from './formItem';
import { LinkedRepresentation } from 'semantic-link';

export interface FormRepresentation extends LinkedRepresentation {
    items: FormItem[];
}
