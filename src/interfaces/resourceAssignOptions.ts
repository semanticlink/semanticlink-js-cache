/**
 * This interface is a direct copy from Vue such that we can bind directly to Vue.set
 */

type VueConstructor = {
    set?<T>(object: unknown, key: string | number, value: T): T;
    set?<T>(array: T[], key: number, value: T): T;
    set?<T, U>(object: T, key: keyof T, value: U): T;
}
export type ResourceAssignOptions = VueConstructor;

export type ResourceMergeOptions = ResourceAssignOptions
