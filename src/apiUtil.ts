import { get } from './representation/get';
import { create } from './representation/create';
import { update } from './representation/update';
import { del } from './representation/delete';

export class ApiUtil {
    public static get = get;
    public static create = create;
    public static update = update;
    public static delete = del;
}
