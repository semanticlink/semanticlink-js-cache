import {expect} from 'chai';
import sinon from 'sinon';
import * as link from 'semantic-link';
import * as sync from './syncLinkedRepresentation';
import * as cache from '../cache';
import Differencer from './Differencer';
import axios from 'axios';
import {log} from '..';

global.Element = () => {
};

describe('Synchroniser', () => {

    xdescribe('getUriListOnNamedCollection', () => {


        it('should return undefined on no singleton rel found', () => {
            const getResource = sinon.stub(cache, 'getResource');
            const tryGetNamedCollection = sinon.stub(cache, 'tryGetNamedCollection');

            let uriList = ['http://example.com/question/item/1'];
            let resource = {
                links: [{rel: 'notifications', href: ''}]
            };

            getResource.returns(Promise.resolve(resource));
            tryGetNamedCollection.returns(Promise.resolve(undefined));

            return sync.getUriListOnNamedCollection(resource, 'notifications', /notifications/, uriList, {})
                .then(result => {
                    expect(result).to.be.undefined;
                });
        });

        it('should be able to add a single url', () => {
            const getResource = sinon.stub(cache, 'getResource');
            const tryGetNamedCollection = sinon.stub(cache, 'tryGetNamedCollection');
            const getCollectionResourceAndItems = sinon.stub(cache, 'getCollectionResourceAndItems');


            let uriList = ['http://example.com/question/item/1'];

            let item = {

                'links': [
                    {
                        'rel': 'self',
                        'href': 'http://api.example.com/survey/question/notification/1504'
                    },
                    {
                        'rel': 'up',
                        'href': 'http://api.example.com/question/107214'
                    },
                    {
                        'rel': 'question-item',
                        'href': 'http://api.example.com/question/item/705233'
                    }
                ],
                'email': [
                    'http://api.example.com/user/02f46ed8-3b6e-4cef-ae47-e15cccf730eb'
                ]

            };

            let resource = {

                'links': [
                    {
                        'rel': 'self',
                        'href': 'http://api.example.com/user/02f46ed8-3b6e-4cef-ae47-e15cccf730eb/notification/'
                    }
                ],
                'items': [item]

            };

            let options = {
                uriListResolver: () => 'http://example.com/question/item/1'
            };

            getResource.returns(Promise.resolve(undefined));
            tryGetNamedCollection.returns(Promise.resolve(resource));
            getCollectionResourceAndItems.returns(Promise.resolve(resource));

            const diffUriList = sinon.stub(Differencer, 'diffUriList')
                .returns(Promise.resolve([]));

            return sync.getUriListOnNamedCollection(resource, 'notifications', /notifications/, uriList, options)
                .then(result => {
                    expect(getResource.called).to.be.true;
                    expect(tryGetNamedCollection.called).to.be.true;
                    expect(diffUriList.called).to.be.true;
                    expect(getCollectionResourceAndItems.called).to.be.true;
                    expect(result).to.equal(resource);
                    Differencer.diffUriList.restore();

                });
        });

        describe('resolvers', () => {

            beforeEach(() => {

                const getResource = sinon.stub(cache, 'getResource');
                const tryGetNamedCollection = sinon.stub(cache, 'tryGetNamedCollection');
                const getCollectionResourceAndItems = sinon.stub(cache, 'getCollectionResourceAndItems');

                getResource.returns(Promise.resolve());
                tryGetNamedCollection.returns(Promise.resolve({singleton: ''}));
                getCollectionResourceAndItems.returns(Promise.resolve());

            });

            it('should use default create resolver POSTs back and add to resolver', () => {

                let post = sinon.stub(link, 'post').returns(Promise.resolve({
                    status: 201,
                    headers: () => {
                        return {
                            location: ''
                        };
                    }
                }));

                let get = sinon.stub(axios, 'get')
                    .returns(Promise.resolve({
                        url: 'http://example.com/notification/',
                        status: 200,
                        data: {items: [{id: 'http://example.com/notification/1'}]},
                    }));

                const diffUriList = sinon.stub(Differencer, 'diffUriList')
                    .callsFake((x, y, options) => Promise.resolve(options.createStrategy([])));

                let options = {
                    resolver: {
                        add: sinon.stub(),
                    }
                };

                return sync.getUriListOnNamedCollection([], 'notifications', /notifications/, [], options)
                    .then(() => {
                        expect(options.resolver.add.called).to.be.true;
                        expect(post.called).to.be.true;
                        expect(get.called).to.be.true;
                        expect(diffUriList.called).to.be.true;
                    })
                    .catch()
                    .then(() => {
                        link.post.restore();
                        axios.get.restore();
                        Differencer.diffUriList.restore();
                    });
            });

            it('should use default delete resolver that DELETEs and removes Uri to resolver', () => {

                let del = sinon.stub(link, 'delete').returns(Promise.resolve({
                    status: 200
                }));

                const diffUriList = sinon.stub(Differencer, 'diffUriList')
                    .callsFake((x, y, options) => Promise.resolve(options.deleteStrategy(['item'])));

                let options = {
                    readonly: false,
                    resolver: {
                        remove: sinon.stub()
                    }
                };

                return sync.getUriListOnNamedCollection([], 'notifications', /notifications/, [], options)
                    .then(() => {
                        sinon.assert.callOrder(diffUriList, del, options.resolver.remove);
                        link.delete.restore();
                        Differencer.diffUriList.restore();

                    });
            });

            it('should correctly construct text/url-list mime type format', () => {

                let del = sinon.stub(link, 'delete')
                    .callsFake(
                        (/*resource, rel, mimeType, data */) => {
                            //expect(data).to.equal('item\r\nitem2\r\n');
                            return Promise.resolve({
                                status: 200
                            });
                        });

                sinon.stub(Differencer, 'diffUriList')
                    .callsFake((x, y, options) => Promise.resolve(options.deleteStrategy(['item', 'item2'])));

                let options = {
                    resolver: {
                        remove: sinon.stub()
                    }
                };

                return sync.getUriListOnNamedCollection({link: []}, 'notifications', /notifications/, [], options)
                    .then(() => {
                        expect(del.called).to.be.true;
                        Differencer.diffUriList.restore();
                        link.delete.restore();

                    });
            });

            describe('change the singleton resource', () => {

                const options = {
                    resolver: {
                        remove: sinon.stub(),
                        add: sinon.stub(),
                    }
                };

                it('should call resolver with singleton on POST', () => {

                    let post = sinon.stub(link, 'post')
                        .callsFake(resource => {
                            expect(resource).to.deep.equal({singleton: ''});
                            return Promise.resolve({
                                status: 201,
                                headers: () => {
                                    return {
                                        location: ''
                                    };
                                }
                            });
                        });

                    let get = sinon.stub(axios, 'get')
                        .returns(Promise.resolve({
                            url: 'http://example.com/notification/',
                            status: 200,
                            data: {items: [{id: 'http://example.com/notification/1'}]},
                        }));

                    const diffUriList = sinon.stub(Differencer, 'diffUriList')
                        .callsFake((x, y, options) => Promise.resolve(options.createStrategy([])));

                    return sync.getUriListOnNamedCollection([], 'notifications', /notifications/, [], options)
                        .then(() => {
                            expect(options.resolver.add.called).to.be.true;
                            expect(post.called).to.be.true;
                            expect(get.called).to.be.true;
                            expect(diffUriList.called).to.be.true;

                            Differencer.diffUriList.restore();
                            link.post.restore();
                            axios.get.restore();

                        });
                });

                it('should call resolver with singleton on DELETE', () => {

                    let del = sinon.stub(link, 'delete')
                        .callsFake(resource => {
                            expect(resource).to.deep.equal({singleton: ''});
                            return Promise.resolve({
                                status: 200
                            });
                        });

                    sinon.stub(Differencer, 'diffUriList')
                        .callsFake((x, y, options) => Promise.resolve(options.deleteStrategy(['item', 'item2'])));

                    return sync.getUriListOnNamedCollection({link: []}, 'notifications', /notifications/, [], options)
                        .then(() => {
                            expect(del.called).to.be.true;

                            link.delete.restore();
                            Differencer.diffUriList.restore();

                        });
                });
            });

        });

    });

})
;