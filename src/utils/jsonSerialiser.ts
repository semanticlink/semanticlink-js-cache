export default class JsonSerialiser {

    /**
     * A replacer function to strip the state from a model
     * see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
     */
    static ToJsonReplacer<T>(key: string, value: T): T | undefined {
        return key !== 'createForm' && key !== 'editForm' ? value : undefined;
    }

    /**
     * Returns a representation from a model that is already hydrated and looks close as possible to what
     * it looked like when it came over the wire. In this case, it removes the state attribute.
     *
     * @param  resource
     * @param  space number of spaces in the pretty print JSON
     */
    static toJson<T>(resource: T, space?: number | string): string {
        return JSON.stringify(resource, JsonSerialiser.ToJsonReplacer, space);
    }
}
