import {mergeByFields, compactObject, extendResource} from './representation';
import {expect} from 'chai';

describe('Representation mixins', () => {

    describe('extendResource()', () => {

        const assertExtendResource = (resource, document) => {
            const result = extendResource({}, resource, document);
            expect(result).to.deep.equal(document);
        };

        it('should be able to shallow extend', () => {
            const resource = {name: 'i'};
            const document = {name: 'h'};
            assertExtendResource(resource, document);
        });

        it('should be able to deep extend', () => {
            const resource = {textBox: {width: 2, height: 6}};
            const document = {textBox: {width: 5, height: 7}};
            assertExtendResource(resource, document);
        });
        it('should be able to deep extend with mutiple at top level', () => {
            const resource = {textBox: {width: 2, height: 6}};
            const document = {name: 'h', textBox: {width: 5, height: 7}};
            assertExtendResource(resource, document);
        });

    });

    describe('mergeByFields()', () => {

        it('should be able to shallow extend overriding matched fields', () => {
            const resource = {name: 'i'};
            const document = {name: 'h'};

            const fields = ['name'];

            const result = mergeByFields(resource, document, fields);
            expect(result).to.deep.equal(document);
            expect(result.name).to.equal('h');
        });

        describe('deep extend', () => {

            it('should be able to override matching field sets', () => {
                const resource = {textBox: {width: 2, height: 6}};
                const document = {textBox: {width: 5, height: 7}};

                const fields = ['name', 'textBox'];

                const result = mergeByFields(resource, document, fields);
                expect(result).to.deep.equal(document);
            });

            it('should be able to add to the set', () => {
                const resource = {textBox: {width: 2, height: 6}};
                const document = {name: 'copied', textBox: {width: 5, height: 7}};

                const fields = ['name', 'textBox'];

                const result = mergeByFields(resource, document, fields);
                expect(result).to.deep.equal(document);
            });

            it('should be able to remove from field from set', () => {
                const resource = {textBox: {width: 2, height: 6}};
                const document = {name: 'not copied', textBox: {width: 5, height: 7}};

                const fields = ['textBox'];

                const result = mergeByFields(resource, document, fields);
                expect(result).to.deep.equal({textBox: {width: 5, height: 7}});
            });

            it('should be able to remove from field when in both and retain value of first not in fields', () => {
                const resource = {name: 'retain', textBox: {width: 2, height: 6}};
                const document = {name: 'no override', textBox: {width: 5, height: 7}};

                const fields = ['textBox'];

                const result = mergeByFields(resource, document, fields);
                expect(result).to.deep.equal({name: 'retain', textBox: {width: 5, height: 7}});
            });
        });

    });

    describe('compactObject', () => {

        it('should do everything at once', () => {
            expect(compactObject({
                keep: 99,
                takeaway: {},
                alsotake: undefined,
                alsoKeep: {o: 1}
            })).to.deep.equal({keep: 99, alsoKeep: {o: 1}});
        });
        it('should keep numerical fields', () => {
            expect(compactObject({keep: 99})).to.deep.equal({keep: 99});
        });
        it('should keep string fields', () => {
            expect(compactObject({keep: 'string'})).to.deep.equal({keep: 'string'});
        });
        it('should keep object fields', () => {
            expect(compactObject({alsoKeep: {o: 1}})).to.deep.equal({alsoKeep: {o: 1}});
        });
        it('should remove empty object fields', () => {
            expect(compactObject({takeaway: {}})).to.deep.equal({});
        });

        it('should remove undefined fields', () => {
            expect(compactObject({takeaway: undefined})).to.deep.equal({});
        });
    });

});