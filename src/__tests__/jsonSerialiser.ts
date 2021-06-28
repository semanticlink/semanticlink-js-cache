import { JsonSerialiser } from '../utils/jsonSerialiser';
import { assertThat, match } from 'mismatched';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { LinkRelation } from '../linkRelation';

describe('Resource', () => {
    it('should be defined', () => {
        const resource = SparseRepresentationFactory.make({ uri: 'https://example.com/1' });

        assertThat(JSON.parse(JsonSerialiser.toJson(resource)))
            .is({
                links: [
                    { rel: match.itIs(LinkRelation.Self), href: match.any() },
                ],
            });

    });
});
