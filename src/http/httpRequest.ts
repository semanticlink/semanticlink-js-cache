import { LinkedRepresentation, LinkType, RelationshipType } from 'semantic-link';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { DocumentRepresentation } from '../interfaces/document';
import { LinkRelation } from '../linkRelation';

export class HttpRequest {
    private options: Required<HttpRequestOptions>;

    constructor(options: Required<HttpRequestOptions>) {
        this.options = options;
    }

    /**
     * TODO: should probably return T | undefined
     * @param link
     * @param rel
     * @param options
     */
    public async load<T extends LinkedRepresentation>(
        link: LinkType,
        rel: RelationshipType,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<T>> {

        const { getFactory = this.options.getFactory } = { ...options };

        return await getFactory<T>(link, rel, options);
    }

    public async update<T extends LinkedRepresentation>(
        resource: T,
        document: T | DocumentRepresentation<T>,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<void>> {

        const {
            rel = LinkRelation.Self,
            putFactory = this.options.putFactory,
        } = { ...options };

        return await putFactory(resource, rel, document, options);
    }

    public async create<T extends LinkedRepresentation>(
        resource: T,
        document: T | DocumentRepresentation<T>,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<T | undefined>> {

        const {
            rel = LinkRelation.Self,
            postFactory = this.options.postFactory,
        } = { ...options };

        return await postFactory(resource, rel, document, options);
    }

    public async del<T extends LinkedRepresentation>(
        resource: T,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<void>> {

        const {
            rel = LinkRelation.Self,
            deleteFactory = this.options.deleteFactory,
        } = { ...options };

        return await deleteFactory(resource, rel);
    }

}


