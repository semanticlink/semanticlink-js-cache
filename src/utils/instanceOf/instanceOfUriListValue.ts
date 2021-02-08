import { Uri } from 'semantic-link';

export function instanceOfUriListValue(obj: any): obj is Uri[] {
    return Array.isArray(obj) && obj[0] && typeof obj[0] === 'string';
}
