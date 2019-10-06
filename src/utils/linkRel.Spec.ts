import {relTypeToCamel, camelToDash, filterCamelToDash, dashToCamel} from './linkRel';
import {expect} from 'chai';

describe('dashToCamel', () => {
    it('should match dashed', () => {
        expect(dashToCamel('question-item')).to.equal('questionItem');
    });
    it('should leave non-dashed alone', () => {
        expect(dashToCamel('questionitem')).to.equal('questionitem');
    });
});

describe('filterCamelToDash', () => {
    it('should match camel', () => {
        expect(filterCamelToDash(['questionItem'])).to.deep.equal(['question-item']);
    });
    it('should match camel and all lower', () => {
        expect(filterCamelToDash(['questionItem', 'question'])).to.deep.equal(['question-item']);
    });
    it('should match just all lower', () => {
        expect(filterCamelToDash(['question'])).to.deep.equal([]);
    });
});

describe('camelToDash', () => {

    it('should match camel on string and returns string', () => {
        expect(camelToDash('questionItem')).to.equal('question-item');
    });

    it('should match all lower on string and returns string', () => {
        expect(camelToDash('question')).to.equal('question');
    });

    it('should match camel', () => {
        expect(camelToDash(['questionItem'])).to.deep.equal(['question-item']);
    });

    it('should match camel and all lower', () => {
        expect(camelToDash(['questionItem', 'question'])).to.deep.equal(['question-item', 'question']);
    });

    it('should match just all lower', () => {
        expect(camelToDash(['question'])).to.deep.equal(['question']);
    });
});

describe('rel type to camel', function () {
    it('should match string', function () {
        expect(relTypeToCamel('test')).to.equal('test');
    });
    it('should match regex', function () {
        expect(relTypeToCamel(/test/)).to.equal('test');
    });
    it('should match global regex', function () {
        expect(relTypeToCamel(/test/g)).to.equal('test');
    });
    it('should match case insensitive regex', function () {
        expect(relTypeToCamel(/test/i)).to.equal('test');
    });
    it('should match global case insensitive regex', function () {
        expect(relTypeToCamel(/test/gi)).to.equal('test');
    });
    it('should match camel case regex', function () {
        expect(relTypeToCamel(/create-form/)).to.equal('createForm');
    });
});
