import { HttpUtil, LinkType, RelationshipType } from 'semantic-link';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { DocumentRepresentation } from '../interfaces/document';

export async function defaultPutFactory<T>(
    link: LinkType,
    rel: RelationshipType,
    document: T | DocumentRepresentation<T>,
    options?: AxiosRequestConfig): Promise<AxiosResponse<void>> {

    const { contentType = undefined } = { ...options };
    return await HttpUtil.put(link, rel, document as T, contentType, options);
}

