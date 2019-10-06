import {expect} from 'chai';
import sinon from 'sinon';
import * as sync from './syncLinkedRepresentation';
import {log} from '..';
import StateEnum from 'semantic-network/cache/StateEnum';
import * as SparseResource from '../cache/sparseResource';

// needed for semantic link library has a DOM dependency
global.Element = () => {
};

describe('Synchroniser', () => {

    /**
     * These are very broad tests that work through the library stack but
     * don't make calls across the wire. The purpose is to check that the sync
     * code works through the correct loading, differencing and merging based
     * on updates, creates, no changes and deletes.
     *
     * These tests are also important because they check that the 'options'
     * are passed all the way through the stack (eg the factories). The options
     * in this case also allow us to avoid using mock interceptors.
     *
     * These tests are written reasonably verbosely so that you can reason
     * about the order of calls and the values of the payload.
     *
     * Note also, use the test console output to reason about the order of actions
     * including the output from the stubs each of which log output for reasoning.
     *
     * Below are the stubs across-the-wire calls stubs that we return results and
     * check for calls. Currently, we don't check call ordering/dependency.
     */

    let get;
    let post;
    let put;
    let del;
    let options;

    beforeEach(() => {
        get = sinon.stub();
        post = sinon.stub();
        put = sinon.stub();
        del = sinon.stub();

        options = {
            getFactory: get,
            postFactory: post,
            putFactory: put,
            deleteFactory: del
        };
    });

    afterEach(() => {
        get.reset();
        post.reset();
        put.reset();
        del.reset();
    });

    it('should load sync', () => {
        expect(sync).to.not.be.null;
    });

    describe('getResource', () => {

        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/tenant/90a936d4a3'
                },
                {
                    rel: 'edit-form',
                    href: 'https://api.example.com/tenant/form/edit'
                }
            ],
            code: 'rewire.example.nz',
            name: 'Rewire NZ',
            description: 'A sample tenant (company/organisation)'
        };
        const editForm = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/tenant/form/edit'
                }
            ],
            items: [
                {
                    type: 'http://types/text',
                    name: 'code',
                    required: true,
                    description: 'The unique name in domain name format'
                },
                {
                    type: 'http://types/text',
                    name: 'name',
                    description: 'The name of the tenant to be shown on the screen'
                },
                {
                    type: 'http://types/text',
                    name: 'description',
                    description: 'Other details about the organisation'
                }
            ]
        };

        it('should not need updates when the same', () => {

            const document = resource;

            get.onCall(0).callsFake(() => {
                log.info('[Test] GET resource');
                return Promise.resolve({data: resource});
            });
            get.onCall(1).callsFake(() => {
                log.info('[Test] GET edit form');
                return Promise.resolve({data: editForm});
            });

            const sparseResource = SparseResource.makeSparseCollectionResourceFromUri('https://api.example.com/tenant/90a936d4a3');

            return sync.getResource(sparseResource, document, [], options)
                .then(result => {
                    expect(result).to.not.be.undefined;
                    expect(get.callCount).to.eq(2);
                    expect(post.callCount).to.eq(0);
                    expect(put.callCount).to.eq(0);
                    expect(del.callCount).to.eq(0);
                });
        });

        it('should make update when different attributes on the logically same resource', () => {
            const get = sinon.stub();
            const post = sinon.stub();
            const put = sinon.stub();
            const del = sinon.stub();

            const document = {
                links: [
                    {
                        rel: 'self',
                        href: 'https://api.example.com/tenant/90a936d4a3'
                    },
                    {
                        rel: 'edit-form',
                        href: 'https://api.example.com/tenant/form/edit'
                    }
                ],
                code: 'rewire.example.nz (updated)',
                name: 'Rewire NZ (updated)',
                description: 'A sample tenant (company/organisation)'
            };


            get.onCall(0).callsFake(() => {
                log.info('[Test] GET resource');
                return Promise.resolve({data: resource});
            });

            get.onCall(1).callsFake(() => {
                log.info('[Test] GET edit form');
                return Promise.resolve({data: editForm});
            });

            put.onFirstCall().callsFake(() => {
                log.info('[Test] PUT update');
                return Promise.resolve({headers: {location: 'https://api.example.com/tenant/90a936d4a3'}});
            });

            const sparseResource = SparseResource.makeSparseResourceFromUri('https://api.example.com/tenant/90a936d4a3');

            return sync.getResource(sparseResource, document, [], {
                getFactory: get,
                postFactory: post,
                putFactory: put,
                deleteFactory: del
            })
                .then(result => {
                    expect(result).to.not.be.undefined;
                    expect(get.callCount).to.eq(2);
                    expect(put.callCount).to.eq(1);
                    expect(post.callCount).to.eq(0);
                    expect(del.callCount).to.eq(0);
                });

        });

    });

    describe('getResourceInCollection', () => {

        it('should sync a document into a collection', () => {

            const document = {
                name: 'Rewire NZ (copy)',
                code: 'copy.rewire.example.nz',
                description: 'A sample tenant (company/organisation)',
            };
            const collection = {
                links: [
                    {
                        rel: 'self',
                        href: 'https://api.example.com/tenant'
                    },
                    {
                        rel: 'create-form',
                        href: 'https://api.example.com/tenant/form/create'
                    },
                ],
                items: []
            };
            const createForm = {
                links: [
                    {
                        rel: 'self',
                        href: 'https://api.example.com/tenant/form/create'
                    },
                    {
                        rel: 'submit',
                        href: 'https://api.example.com/tenant'
                    }
                ],
                items: [
                    {
                        type: 'http://types/text',
                        name: 'code',
                        required: true,
                        description: 'The unique name in domain name format'
                    },
                    {
                        type: 'http://types/text',
                        name: 'name',
                        description: 'The name of the tenant to be shown on the screen'
                    },
                    {
                        type: 'http://types/text',
                        name: 'description',
                        description: 'Other details about the organisation'
                    }
                ]
            };

            get.onCall(0).callsFake(() => {
                log.info('[Test] GET collection');
                return Promise.resolve({data: collection});
            });
            get.onCall(1).callsFake(() => {
                log.info('[Test] GET create form');
                return Promise.resolve({data: createForm});
            });
            post.onFirstCall().callsFake(() => {
                log.info('[Test] POST document');
                return Promise.resolve({headers: {location: 'https://api.example.com/tenant/XXXX'}});
            });
            get.onCall(2).callsFake(() => {
                log.info('[Test] GET created document');
                return Promise.resolve({data: document});
            });

            const coll = SparseResource.makeSparseCollectionResourceFromUri('https://api.example.com/tenant');

            return sync.getResourceInCollection(coll, document, [], options)
                .then(result => {
                    expect(result).to.not.be.undefined;
                    expect(get.callCount).to.eq(3);
                    expect(post.callCount).to.eq(1);
                    expect(put.callCount).to.eq(0);
                    expect(del.callCount).to.eq(0);
                });

        });

    });

    describe('Named Collection', function () {

        const parent = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/user/f58c6dd2a5'
                },
                {
                    rel: 'todos',
                    href: 'https://api.example.com/user/tenant/90a936d4a3/todo'
                },
            ],
            name: 'test',
            email: 'test@rewire.nz'
        };
        const namedCollection = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/user/tenant/90a936d4a3/todo'
                },
                {
                    rel: 'create-form',
                    href: 'https://api.example.com/todo/form/create'
                }
            ],
            items: [
                {
                    id: 'https://api.example.com/todo/4bf1d09bb0',
                    title: 'One Todo'
                },
                {
                    id: 'https://api.example.com/todo/a3e0ce2e0d',
                    title: 'Two Todo (tag)'
                }
            ]
        };
        const itemOne = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/todo/4bf1d09bb0'
                },
                {
                    rel: 'edit-form',
                    href: 'https://api.example.com/todo/form/edit'
                }
            ],
            name: 'One Todo',
            due: '0001-01-01T11:40:00+11:40'
        };
        const itemTwo = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/todo/a3e0ce2e0d'
                },
                {
                    rel: 'edit-form',
                    href: 'https://api.example.com/todo/form/edit'
                }
            ],
            name: 'Two Todo (tag)',
            state: 'http://example.com/todo/state/complete',
            due: '0001-01-01T11:40:00+11:40'
        };
        const editForm = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/todo/form/edit'
                }
            ],
            items: [
                {
                    type: 'http://types/text',
                    name: 'name',
                    required: true,
                    description: 'The title of the page'
                },
                {
                    type: 'http://types/select',
                    name: 'state',
                    description: 'A todo can only toggle between open and complete.',
                    items: [
                        {
                            type: 'http://types/enum',
                            value: 'http://example.com/todo/state/complete',
                            label: 'Completed',
                            name: 'completed',
                            description: 'The todo has been completed'
                        },
                        {
                            type: 'http://types/enum',
                            value: 'http://example.com/todo/state/open',
                            label: 'Open',
                            name: 'open',
                            description: 'The todo has been opened'
                        }
                    ]
                },
                {
                    type: 'http://types/datetime',
                    name: 'due',
                    description: 'The UTC date the todo is due'
                }
            ]
        };
        const createForm = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/todo/form/create'
                }
            ],
            items: [
                {
                    type: 'http://types/text',
                    name: 'name',
                    required: true,
                    description: 'The title of the page'
                },
                {
                    type: 'http://types/select',
                    name: 'state',
                    description: 'A todo can only toggle between open and complete.',
                    items: [
                        {
                            type: 'http://types/enum',
                            value: 'http://example.com/todo/state/complete',
                            label: 'Completed',
                            name: 'completed',
                            description: 'The todo has been completed'
                        },
                        {
                            type: 'http://types/enum',
                            value: 'http://example.com/todo/state/open',
                            label: 'Open',
                            name: 'open',
                            description: 'The todo has been opened'
                        }
                    ]
                },
                {
                    type: 'http://types/datetime',
                    name: 'due',
                    description: 'The UTC date the todo is due'
                }
            ]
        };

        describe('getResourceInNamedCollection', () => {

            it('should not update when the document is the same', () => {

                const matchedItem = {
                    links: [
                        {
                            rel: 'self',
                            href: 'https://api.example.com/todo/a3e0ce2e0d'
                        },
                        {
                            rel: 'edit-form',
                            href: 'https://api.example.com/todo/form/edit'
                        }
                    ],
                    name: 'Two Todo (tag)',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40'
                };
                const noChangeDocument = itemTwo;

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });
                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET item from collection');
                    return Promise.resolve({data: matchedItem});
                });

                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET edit form');
                    return Promise.resolve({data: editForm});
                });

                put.onCall(0).callsFake(() => {
                    log.info('[Test] PUT document');
                    return Promise.resolve({});
                });

                const sparseParent = SparseResource.makeSparseCollectionResourceFromUri('https://api.example.com/user/f58c6dd2a5', parent);

                return sync.getResourceInNamedCollection(sparseParent, 'todos', /todos/, noChangeDocument, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(3);
                        expect(put.callCount).to.eq(0);
                        expect(post.callCount).to.eq(0);
                        expect(del.callCount).to.eq(0);
                    });

            });

            it('should update when the document matches an item and an attribute is different', () => {

                const matchedItem = {
                    links: [
                        {
                            rel: 'self',
                            href: 'https://api.example.com/todo/a3e0ce2e0d'
                        },
                        {
                            rel: 'edit-form',
                            href: 'https://api.example.com/todo/form/edit'
                        }
                    ],
                    name: 'Two Todo (tag)',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40'
                };
                const changedDocument = {
                    links: [
                        {
                            rel: 'self',
                            href: 'https://api.example.com/todo/a3e0ce2e0d'
                        },
                        {
                            rel: 'edit-form',
                            href: 'https://api.example.com/todo/form/edit'
                        }
                    ],
                    name: 'Two Todo (tag) [Updated]',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40'
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });
                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET item from collection');
                    return Promise.resolve({data: matchedItem});
                });

                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET edit form');
                    return Promise.resolve({data: editForm});
                });

                put.onFirstCall().callsFake(() => {
                    log.info('[Test] PUT document');
                    return Promise.resolve({});
                });

                const sparseParent = SparseResource.makeSparseCollectionResourceFromUri('https://api.example.com/user/f58c6dd2a5', parent);

                return sync.getResourceInNamedCollection(sparseParent, 'todos', /todos/, changedDocument, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(3);
                        expect(put.callCount).to.eq(1);
                        expect(post.callCount).to.eq(0);
                        expect(del.callCount).to.eq(0);
                    });

            });

            it('should add when the document is not found in collection', () => {

                const newDocument = {
                    name: 'Brand new',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40'
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });

                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET create form');
                    return Promise.resolve({data: createForm});
                });

                post.onCall(0).callsFake(() => {
                    log.info('[Test] PUT document');
                    return Promise.resolve({headers: {location: 'https://api.example.com/todo/new'}});
                });

                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET edit form');
                    return Promise.resolve({data: createForm});
                });

                const sparseParent = SparseResource.makeSparseCollectionResourceFromUri('https://api.example.com/user/f58c6dd2a5', parent);

                return sync.getResourceInNamedCollection(sparseParent, 'todos', /todos/, newDocument, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(3);
                        expect(put.callCount).to.eq(0);
                        expect(post.callCount).to.eq(1);
                        expect(del.callCount).to.eq(0);
                    });
            });

        });

        describe('getCollectionInNamedCollection', () => {

            it('should not update when the collections (all items) are the same', () => {

                const noChangeCollection = {
                    ...namedCollection,
                    items: [itemOne, itemTwo]
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });
                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET item 1 from collection');
                    return Promise.resolve({data: itemOne});
                });
                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET item 2 from collection');
                    return Promise.resolve({data: itemTwo});
                });
                get.onCall(3).callsFake(() => {
                    log.info('[Test] GET edit form');
                    return Promise.resolve({data: editForm});
                });

                const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

                return sync.getCollectionInNamedCollection(hydratedParent, 'todos', /todos/, noChangeCollection, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(4);
                        expect(put.callCount).to.eq(0);
                        expect(post.callCount).to.eq(0);
                        expect(del.callCount).to.eq(0);
                    });

            });

            it('should update when the document matches an item and an attribute is different', () => {

                const oneItemChangedInCollection = {
                    ...namedCollection,
                    items: [
                        itemOne,
                        {
                            links: [
                                {
                                    rel: 'self',
                                    href: 'https://api.example.com/todo/a3e0ce2e0d'
                                },
                                {
                                    rel: 'edit-form',
                                    href: 'https://api.example.com/todo/form/edit'
                                }
                            ],
                            name: 'Two Todo (tag) [Updated]',
                            state: 'http://example.com/todo/state/complete',
                            due: '0001-01-01T11:40:00+11:40'
                        }]
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });
                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET item 1 from collection');
                    return Promise.resolve({data: itemOne});
                });
                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET item 2 from collection');
                    return Promise.resolve({data: itemTwo});
                });

                get.onCall(3).callsFake(() => {
                    log.info('[Test] GET edit form 1');
                    return Promise.resolve({data: editForm});
                });
                get.onCall(4).callsFake(() => {
                    log.info('[Test] GET edit form 2');
                    return Promise.resolve({data: editForm});
                });

                put.onCall(0).callsFake(() => {
                    log.info('[Test] PUT document');
                    return Promise.resolve({});
                });

                const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

                return sync.getCollectionInNamedCollection(hydratedParent, 'todos', /todos/, oneItemChangedInCollection, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(4);
                        expect(put.callCount).to.eq(1);
                        expect(post.callCount).to.eq(0);
                        expect(del.callCount).to.eq(0);
                    });
            });

            it('should add when the document is not found in collection', () => {

                const newItem = {
                    name: 'New One',
                    state: 'http://example.com/todo/state/open',
                    due: '0001-01-01T11:40:00+11:40'
                };

                const oneItemAddedInCollection = {
                    ...namedCollection,
                    items: [
                        itemOne,
                        itemTwo,
                        newItem]
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });
                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET item 1 from collection');
                    return Promise.resolve({data: itemOne});
                });
                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET item 2 from collection');
                    return Promise.resolve({data: itemTwo});
                });

                get.onCall(3).callsFake(() => {
                    log.info('[Test] GET edit form 1');
                    return Promise.resolve({data: editForm});
                });
                get.onCall(4).callsFake(() => {
                    log.info('[Test] GET edit form 2');
                    return Promise.resolve({data: editForm});
                });

                post.onCall(0).callsFake(() => {
                    log.info('[Test] POST document');
                    return Promise.resolve({headers: {location: 'https://api.example.com/todo/newOne934875'}});
                });
                get.onCall(5).callsFake(() => {
                    log.info('[Test] GET new item');
                    return Promise.resolve({data: newItem});
                });


                const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

                return sync.getCollectionInNamedCollection(hydratedParent, 'todos', /todos/, oneItemAddedInCollection, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(6);
                        expect(put.callCount).to.eq(0);
                        expect(post.callCount).to.eq(1);
                        expect(del.callCount).to.eq(0);
                    });
            });


            it('should delete when a document is not found in collection', () => {

                const oneItemRemovedInCollection = {
                    ...namedCollection,
                    items: [itemOne]
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });

                del.onCall(0).callsFake(() => {
                    log.info('[Test] Delete document');
                    return Promise.resolve({});
                });

                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET item 1 from collection');
                    return Promise.resolve({data: itemOne});
                });

                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET edit form');
                    return Promise.resolve({data: editForm});
                });

                const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

                return sync.getCollectionInNamedCollection(hydratedParent, 'todos', /todos/, oneItemRemovedInCollection, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(3);
                        expect(put.callCount).to.eq(0);
                        expect(post.callCount).to.eq(0);
                        expect(del.callCount).to.eq(1);
                    });
            });

        });

        describe('getNamedCollectionInNamedCollection', () => {

            /**
             * This method chains {@link sync.getCollectionInNamedCollection} so one test around it is good
             * enough to show that it parents correctly
             */

            it('should not update when the collections (all items) are the same', () => {

                const noChangeParentCollection = {
                    ...parent,
                    todos: {
                        ...namedCollection,
                        items: [itemOne, itemTwo]
                    }
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named collection');
                    return Promise.resolve({data: namedCollection});
                });
                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET item 1 from collection');
                    return Promise.resolve({data: itemOne});
                });
                get.onCall(2).callsFake(() => {
                    log.info('[Test] GET item 2 from collection');
                    return Promise.resolve({data: itemTwo});
                });
                get.onCall(3).callsFake(() => {
                    log.info('[Test] GET edit form');
                    return Promise.resolve({data: editForm});
                });

                const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

                return sync.getNamedCollectionInNamedCollection(hydratedParent, 'todos', /todos/, noChangeParentCollection, [], options)
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(4);
                        expect(put.callCount).to.eq(0);
                        expect(post.callCount).to.eq(0);
                        expect(del.callCount).to.eq(0);
                    });

            });
        });
    });

    describe('getSingleton', () => {

        const parent = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/tenant/90a936d4a3'
                },
                {
                    rel: 'user',
                    href: 'https://api.example.com/user/5'
                },
                {
                    rel: 'edit-form',
                    href: 'https://api.example.com/tenant/form/edit'
                }
            ],
            code: 'rewire.example.nz',
            name: 'Rewire NZ',
            description: 'A sample tenant (company/organisation)'
        };
        const editForm = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/user/form/edit'
                }
            ],
            items: [
                {
                    type: 'http://types/text/email',
                    name: 'email',
                    required: true,
                    description: 'The email address of the user'
                },
                {
                    type: 'http://types/text',
                    name: 'name',
                    required: true,
                    description: 'The name of the user to be shown on the screen'
                },
                {
                    type: 'http://types/select',
                    multiple: true,
                    name: 'externalId',
                    description: 'The third-party id fo the user (eg \'auth0|xxxxx\')',
                    items: null
                }
            ]
        };

        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/user/f58c6dd2a5'
                },
                {
                    rel: 'edit-form',
                    href: 'https://api.example.com/user/form/edit'
                },
            ],
            email: 'test@rewire.example.nz',
            name: 'test',
        };

        it('should not update when attributes on singleton are same', function () {


            const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

            const noChangeParent = {
                ...parent,
                user: resource
            };

            get.onCall(0).callsFake(() => {
                log.info('[Test] GET named resource (singleton)');
                return Promise.resolve({data: resource});
            });

            get.onCall(1).callsFake(() => {
                log.info('[Test] GET edit form');
                return Promise.resolve({data: editForm});
            });

            return sync.getSingleton(hydratedParent, 'user', /user/, noChangeParent, [], options)
                .then(result => {
                    expect(result).to.not.be.undefined;
                    expect(get.callCount).to.eq(2);
                    expect(put.callCount).to.eq(0);
                    expect(post.callCount).to.eq(0);
                    expect(del.callCount).to.eq(0);
                    expect(result).to.deep.eq(hydratedParent);
                });

        });

        it('should update when attributes on singleton are different', function () {

            const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

            const updatedUser = {
                ...resource,
                name: 'updated'
            };
            const changedSingletonOnParent = {
                ...parent,
                user: updatedUser
            };

            get.onCall(0).callsFake(() => {
                log.info('[Test] GET named resource (singleton)');
                return Promise.resolve({data: resource});
            });

            get.onCall(1).callsFake(() => {
                log.info('[Test] GET edit form');
                return Promise.resolve({data: editForm});
            });

            put.onCall(0).callsFake(() => {
                log.info('[Test] PUT updated resource');
                return Promise.resolve({});
            });

            return sync.getSingleton(hydratedParent, 'user', /user/, changedSingletonOnParent, [], options)
                .then(result => {
                    expect(result).to.not.be.undefined;
                    expect(get.callCount).to.eq(2);
                    expect(put.callCount).to.eq(1);
                    expect(post.callCount).to.eq(0);
                    expect(del.callCount).to.eq(0);
                    expect(result).to.deep.eq(hydratedParent);
                });

        });

        describe('strategies', () => {

            let strategy;

            it('should ', function () {

                const hydratedParent = SparseResource.makeLinkedRepresentation(SparseResource.makeSparseResourceOptions(StateEnum.hydrated), parent);

                const updatedUser = {
                    ...resource,
                    name: 'updated'
                };
                const changedSingletonOnParent = {
                    ...parent,
                    user: updatedUser
                };

                get.onCall(0).callsFake(() => {
                    log.info('[Test] GET named resource (singleton)');
                    return Promise.resolve({data: resource});
                });

                get.onCall(1).callsFake(() => {
                    log.info('[Test] GET edit form');
                    return Promise.resolve({data: editForm});
                });

                put.onCall(0).callsFake(() => {
                    log.info('[Test] PUT updated resource');
                    return Promise.resolve({});
                });

                strategy = sinon.stub().onCall(0).callsFake(({resource, document, options}) => {
                    expect(resource).to.not.be.undefined;
                    expect(document).to.not.be.undefined;
                    expect(options).to.not.be.undefined;
                    return Promise.resolve();
                });

                // strategy.resolves(undefined);

                return sync.getSingleton(
                    hydratedParent,
                    'user',
                    /user/,
                    changedSingletonOnParent,
                    [opts => strategy({...opts})],
                    options
                )
                    .then(result => {
                        expect(result).to.not.be.undefined;
                        expect(get.callCount).to.eq(2);
                        expect(put.callCount).to.eq(1);
                        expect(post.callCount).to.eq(0);
                        expect(del.callCount).to.eq(0);
                        expect(result).to.deep.eq(hydratedParent);

                        // expect(strategy.wasCalled).to.be.true;
                        expect(strategy.called).to.be.true;
                    });

            });
        });


    });

});