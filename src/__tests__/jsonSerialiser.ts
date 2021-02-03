import JsonSerialiser from '../utils/jsonSerialiser';
import { assertThat, match } from 'mismatched';
import { IanaLinkRelation } from '../ianaLinkRelation';
import TrackedRepresentationFactory from '../representation/sparseRepresentationFactory';

describe('Resource', () => {
    it('should be defined', () => {
        const resource = TrackedRepresentationFactory.make({ uri: 'https://example.com/1' });

        assertThat(JSON.parse(JsonSerialiser.toJson(resource)))
            .is({
                links: [
                    { rel: match.itIs(IanaLinkRelation.self), href: match.any() },
                ],
            });

    });
});
