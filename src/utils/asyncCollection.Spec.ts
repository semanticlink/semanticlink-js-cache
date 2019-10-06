import 'underscore';
import {expect} from 'chai';
import {sequentialWaitAll, mapAttributeWaitAll} from './asyncCollection';
import {dashToCamel} from './linkRel';

describe('Async collection mixins', () => {

    describe('sequentialWait()', () => {

        it('should total up a list', () => {
            return sequentialWaitAll([1, 2], (memo, i) => {
                return Promise.resolve(memo + i);
            }, 0)
                .then(result => {
                    expect(result).to.equal(3);

                });

        });

        it('should total up using nested promises', () => {
            return sequentialWaitAll([1, 2], (memo, i) => {

                if (i === 2) {
                    return Promise.resolve(memo + i * i)
                        .then(m => m + 5);
                }
                return Promise.resolve(memo + i);
            }, 0)
                .then(result => {
                    expect(result).to.equal(1 + 2 * 2 + 5);

                });

        });

        it('should map across an object synchronise', () => {
            return mapAttributeWaitAll({state: 'this', title: 'that'}, (value, key) => {
                if (key === 'state') {
                    return Promise.resolve('that');
                }
                return Promise.resolve(value);
            })
                .then(result => {
                    expect(result).to.deep.equal({state: 'that', title: 'that'});

                });
        });

        it('should map across an object aysnc', () => {
            const resource = {state: 'this', title: 'that'};
            return mapAttributeWaitAll(resource, (value, key) => {
                if (key === 'state') {
                    return Promise.resolve()
                        .then(() => 'that');
                }
                return Promise.resolve(value);
            })
                .then(result => {
                    expect(result).to.deep.equal({state: 'that', title: 'that'});
                    expect(result).not.to.equal(resource);

                });
        });

        it('should map across an object and replace keys', () => {
            const resource = {'question-item': 'this', title: 'that'};
            return mapAttributeWaitAll(resource, value => Promise.resolve(value), dashToCamel)
                .then(result => {
                    expect(result).to.deep.equal({questionItem: 'this', title: 'that'});
                    expect(result).not.to.equal(resource);

                });
        });
    });
});