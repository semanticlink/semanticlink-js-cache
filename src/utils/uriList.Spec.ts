import {expect} from 'chai';
import {makeUriList, mapUriList} from './uri-list';
import {LinkedRepresentation} from "semantic-link";


describe('makeUriList', () => {

    it('should keep string as uri', () => {
        expect(makeUriList('http://example.com/role/1')).to.deep.equal(['http://example.com/role/1']);
    });
    it('should keep an array string as uri', () => {
        const uriList = ['http://example.com/role/1', 'http://example.com/role/2'];
        expect(makeUriList(uriList)).to.deep.equal(uriList);
    });
    it('should transform representation to string', () => {
        const resource = {
            links: [{
                rel: 'self',
                href: 'http://example.com/role/1'
            }],
            name: 'Administrator'
        };
        expect(makeUriList(resource)).to.deep.equal(['http://example.com/role/1']);
    });
});

describe('mapUriList', () => {

    it('should convert items', () => {
        const values = [
            {links: [{rel: 'self', href: 'http://localhost:1080/role/50'}],},
            {links: [{rel: 'self', href: 'http://localhost:1080/role/49'}],}
        ];
        expect(mapUriList(values)).to.deep.equal(['http://localhost:1080/role/50', 'http://localhost:1080/role/49']);
    });

    it('should not return undefined in the list', () => {
        const values = [
            {links: [{rel: 'self', href: 'http://localhost:1080/role/50'}],},
            {links: [{rel: 'up', href: 'http://localhost:1080/role/49'}],}
        ];
        expect(mapUriList(values)).to.deep.equal(['http://localhost:1080/role/50']);
    });

    it('should empty list on empty list', () => {
        const values:LinkedRepresentation[] = [];
        expect(mapUriList(values)).to.deep.equal([]);
    });

    it('should empty list on empty list on none found', () => {
        const values = [
            {links: [{rel: 'up', href: 'http://localhost:1080/role/49'}],}
        ];
        expect(mapUriList(values)).to.deep.equal([]);
    });

    it('should empty list on empty list on undefined', () => {
        expect(mapUriList(undefined)).to.deep.equal([]);
    });

});

