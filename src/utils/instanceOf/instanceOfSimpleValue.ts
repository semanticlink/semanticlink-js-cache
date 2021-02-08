export function instanceOfSimpleValue(obj: any): obj is string | number {
    return typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'undefined';
}
