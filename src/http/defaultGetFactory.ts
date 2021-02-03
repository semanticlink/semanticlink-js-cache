import { HttpUtil, LinkType, RelationshipType } from 'semantic-link';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

export async function defaultGetFactory<T>(link: LinkType, rel: RelationshipType, options?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await HttpUtil.get(link, rel, options);
}

