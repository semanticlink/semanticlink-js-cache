import { HttpUtil, LinkType, RelationshipType } from 'semantic-link';
import { AxiosResponse } from 'axios';

export async function defaultDeleteFactory(link: LinkType, rel: RelationshipType): Promise<AxiosResponse<void>> {
    return await HttpUtil.del(link, rel);
}

