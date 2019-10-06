import {expect} from 'chai';
import {makeUri} from './uri';


describe('makeUri', () => {

    it('should keep string as uri', () => {
        expect(makeUri('http://example.com/role/1')).to.equal('http://example.com/role/1');
    });
    it('should transform representation to string', () => {
        const resource = {
            links: [{
                rel: 'self',
                href: 'http://example.com/role/1'
            }]
        };
        expect(makeUri(resource)).to.equal('http://example.com/role/1');
    });
});

