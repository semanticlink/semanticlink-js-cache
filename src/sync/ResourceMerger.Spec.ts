import {expect} from 'chai';
import sinon from 'sinon';
import _ from 'underscore';
import {resourceMerger} from './ResourceMerger';

global.Element = () => {
};

let stubbedResource = {
    isTracked: () => {
    }
};

describe('Resource Merger:', () => {

    describe('acceptance', () => {
        let resource = {
            'links': [
                {
                    'rel': 'self',
                    'href': 'http://api.example.com/filter/user/113194'
                },
                {
                    'rel': 'user',
                    'href': 'http://api.example.com/user/97cde947-9edb-4c1a-9c27-5ae3cfb092b4'
                },
            ],
            'name': 'Age Group',
            'order': 3,
            'questionItems': [
                'http://api.example.com/question/item/627800'
            ]
        };
        let document = {
            'links': [
                {
                    'rel': 'self',
                    'href': 'http://api.example.com/filter/user/113194'
                },
                {
                    'rel': 'user',
                    'href': 'http://api.example.com/user/97cde947-9edb-4c1a-9c27-5ae3cfb092b4'
                },
            ],
            'name': 'Age Group',
            'order': 3,
            'questionItems': [
                'http://api.example.com/question/item/627801',
                'http://api.example.com/question/item/627802',
                'http://api.example.com/question/item/627803',
            ]
        };
        let form = {
            'links': [
                {
                    'rel': 'self',
                    'href': 'http://api.example.com/filter/user/form/edit'
                }
            ],
            'items': [
                {
                    'type': 'http://types/select',
                    'multiple': true,
                    'name': 'questionItems',
                    'description': 'The question items (QOptions)'
                }
            ]

        };

        /*
         * @type {CacheOptions}
         */
        const options = {
            resourceResolver: () => u => Promise.resolve(u),
            resolver: {resolve: u => u + 'XX'} // resolve with changes checked below
        };

        let result;

        beforeEach(() => {
            return resourceMerger.editMerge(resource, document, form, options)
                .then(doc => {
                    result = doc;

                });
        });

        it('should retain links', () => {
            expect(result.links).to.be.an('array');
        });
        it('should retain fields that are not part of the form - title', () => {
            expect(result.name).to.be.a('string');
        });
        it('should retain fields that are not part of the form - order', () => {
            expect(result.order).to.equal(3);
        });
        it('should have new form elements - questionItems', () => {
            expect(result.questionItems.length).to.equal(3);
        });
        it('should update to new form elements with resolved values', () => {
            expect(_(result.questionItems).contains('http://api.example.com/question/item/627801XX')).to.be.true;
            expect(_(result.questionItems).contains('http://api.example.com/question/item/627802XX')).to.be.true;
            expect(_(result.questionItems).contains('http://api.example.com/question/item/627803XX')).to.be.true;
        });
    });

    describe('fields', () => {

        it('should return empty array if object is empty', () => {
            expect(resourceMerger.fields({}, [])).to.deep.equal([]);
        });

        it('should return empty array if items is empty', () => {
            expect(resourceMerger.fields({items: []}, [])).to.deep.equal([]);
        });

        it('should return array of  items', () => {
            const form = {
                'items': [
                    {
                        'type': 'http://types/text',
                        'name': 'title',
                        'description': 'The name of the survey'
                    },
                    {
                        'type': 'http://types/select',
                        'name': 'type',
                        'description': 'The type of the resource'
                    }
                ]
            };
            expect(resourceMerger.fields(form)).to.deep.equal(['title', 'type']);
        });

        it('should return array of items with defaults', () => {
            expect(resourceMerger.fields({}, ['test'])).to.deep.equal(['test']);
        });

    });

    describe('merge', () => {

        let resource = {
            links: [{
                rel: 'self', href: 'http://example.com'
            }],
            name: 'a name'
        };

        describe('editMerge', () => {

            const form = {
                'items': [
                    {
                        'type': 'http://types/text',
                        'name': 'name',
                        'description': 'The name of the survey'
                    }
                ]
            };

            let document = {
                links: [],
                name: 'Simplest Survey',
                ignored: {}
            };

            it('should always return document', () => {
                return resourceMerger.editMerge(resource, document, form)
                    .then(doc => {
                        expect(doc).to.not.be.null;

                    });

            });

            it('should have the default keys specified', () => {
                return resourceMerger.editMerge(resource, document, form)
                    .then(doc => {
                        expect(_(doc).keys()).to.deep.equal(['links', 'name']);

                    });

            });

            it('should not find type because it is a link', () => {
                return resourceMerger.editMerge(resource, document, form)
                    .then(doc => {
                        expect(_(_(doc).keys()).contains()).to.be.false;

                    });
            });

            describe('fields only', () => {

                it('should rewrite a field which is a resource using resourceResolver and uri mapping resolver', () => {

                    const resource = {
                        'links': [
                            {'rel': 'self', 'href': 'http://example.com/user/4199'},
                            {'rel': 'self', 'href': 'http://example.com/role/1'},
                        ],
                        'name': 'Simplest Survey',
                    };

                    const document = {
                        'links': [
                            {'rel': 'self', 'href': 'http://example.com/user/4199'},
                        ],
                        'name': 'Simplest Survey',
                        'role': {bla: 1},
                    };

                    const form = {
                        'items': [
                            {
                                'type': 'http://types/text',
                                'name': 'name',
                                'description': 'The name of the survey'
                            },
                            {
                                'type': 'http://types/select',
                                'name': 'role',
                                'description': 'The type of the resource'
                            }
                        ]
                    };

                    /*
                     * @type {CacheOptions}
                     */
                    const options = {
                        resourceResolver: () => resource => {
                            expect(resource).to.include.any.keys('bla');
                            // need to return a resource
                            return Promise.resolve({links: [{rel: 'self', href: 'http://example.com/role/2'}]});
                        },
                        resolver: {
                            resolve: u => u + 'XX'
                        } // resolve with changes checked below
                    };

                    return resourceMerger.editMerge(resource, document, form, options)
                        .then(result => {
                            expect(result.role).to.equal('http://example.com/role/2XX');

                        });

                })
                ;
            });

            describe('undefined on no update required', () => {

                it('should return undefined', () => {
                    /*
                     * @type {CacheOptions}
                     */
                    const options = {
                        undefinedWhenNoUpdateRequired: true,
                        resourceResolver: () => u => Promise.resolve(u),
                        resolver: {resolve: u => u + 'XX'} // resolve with changes checked below
                    };
                    return resourceMerger.editMerge(resource, resource, form, options)
                        .then(result => {
                            expect(result).to.be.undefined;

                        });
                });

                xit('should return defined', () => {
                    /*
                     * @type {CacheOptions}
                     */
                    const options = {
                        undefinedWhenNoUpdateRequired: true,
                        resourceResolver: () => u => Promise.resolve(u),
                        resolver: {resolve: u => u + 'XX'} // resolve with changes checked below
                    };
                    return resourceMerger.editMerge(resource, document, form, options)
                        .then(result => {
                            expect(result).to.not.be.null;

                        });
                });
            });

            describe('recursive group', () => {

                it('should return arrays on the top-level', () => {

                    let form = {
                        'links': [{'rel': 'self', 'href': 'http://api.example.com/question/logic/item/form/edit'}],
                        'items': [
                            {
                                'type': 'http://types/text',
                                'name': 'order',
                                'description': ''
                            },
                            {
                                'type': 'http://types/text',
                                'name': 'type',
                                'description': 'The rule type'
                            },
                            {
                                'type': 'http://types/group',
                                'name': 'expression',
                                'items': [
                                    {
                                        'type': 'http://types/text',
                                        'name': 'type',
                                        'description': 'The expression type (not, and, or)'
                                    }, {
                                        'type': 'http://types/group',
                                        'multiple': true,
                                        'name': 'items',
                                        'description': 'The expressions - this is recursive back to the \'expression\' group form'
                                    }, {
                                        'type': 'http://types/select',
                                        'name': 'question',
                                        'description': 'The expression type (not, and, or)'
                                    }, {
                                        'type': 'http://types/select',
                                        'multiple': true,
                                        'name': 'questionItem',
                                        'description': 'The question items'
                                    }],
                                'description': 'The logic rule as an expression (c.f. a \'##\' style string)'
                            },
                            {
                                'type': 'http://types/select',
                                'name': 'waitQuestion',
                                'description': 'An optional question'
                            }]
                    };

                    var resource = {
                        'expression': {
                            'type': 'http://types.example.com/survey/logic/operator/and',
                            'items': [
                                {
                                    'question': 'http://api.example.com/question/104646',
                                    'questionItem': [
                                        'http://api.example.com/question/item/695493'
                                    ]
                                },
                                {
                                    'question': 'http://api.example.com/question/104652',
                                    'questionItem': [
                                        'http://api.example.com/question/item/695508',
                                        'http://api.example.com/question/item/695509',
                                        'http://api.example.com/question/item/695510'
                                    ]
                                }
                            ]
                        }

                    };

                    /*
                     * @type {CacheOptions}
                     */
                    const options = {
                        undefinedWhenNoUpdateRequired: true,
                        resourceResolver: () => u => Promise.resolve(u),
                        resolver: {resolve: u => u + 'XX'} // resolve with changes checked below
                    };
                    return resourceMerger.editMerge(resource, resource, form, options)
                        .then(result => {

                            /**
                             *
                             * We don't want this type of response
                             {
                                 "expression": {
                                     "type": "http://types.example.com/survey/logic/operator/and",
                                     "items": {
                           here ------>  "0": {
                                             "question": "http://api.example.com/question/104646",
                                             "questionItem": ["http://api.example.com/question/item/695493"]
                                         },
                                         "1": {
                                             "question": "http://api.example.com/question/104652",
                                             "questionItem": ["http://api.example.com/question/item/695508", "http://api.example.com/question/item/695509", "http://api.example.com/question/item/695510"]
                                         }
                                     }
                                 },
                             };

                             */

                            expect(_(result.expression.items).isArray()).to.be.true;

                        });

                });
            });

        });

        describe('createMerge', () => {

            describe('fields only', () => {
                it('should look for field in link relations returning undfined in http://types/select returns original value', () => {

                    const options = {
                        undefinedWhenNoUpdateRequired: true,
                        resourceResolver: () => () => Promise.resolve(undefined),
                        resolver: {resolve: u => u + 'XX'} // resolve with changes checked below
                    };

                    var document = {
                        'links': [
                            {'rel': 'self', 'href': 'http://example.com/survey/4199'}
                        ],
                        'name': 'Simplest Survey',
                        'title': 'Simplest Survey',
                        'state': 'http://types.example.com/survey/state/new',
                        'reference': '',
                    };

                    const form = {
                        'items': [
                            {
                                'type': 'http://types/text',
                                'name': 'title',
                                'description': 'The name of the survey'
                            },
                            {
                                'type': 'http://types/select',
                                'name': 'state',
                                'description': 'The type of the resource'
                            }
                        ]
                    };

                    return resourceMerger.createMerge(document, form, options)
                        .then(doc => {
                            expect(_(doc).keys()).to.deep.equal(['title', 'state']);
                            expect(doc.state).to.equal('http://types.example.com/survey/state/newXX');

                        });
                });
            });

            describe('fields http://types/group', () => {

                const document = {
                    'expression': {
                        'type': 'not',
                        'question': 'http://api.example.com/question/87869',
                        'question-item': [
                            'http://api.example.com/question/item/572444',
                            'http://api.example.com/question/item/572445'],
                        'single-multiple': 'http://api.example.com/question/item/55555'
                    },
                };

                const form = {
                    'items': [
                        {
                            'type': 'http://types/group',
                            'name': 'expression',
                            'items': [
                                {
                                    'type': 'http://types/text',
                                    'name': 'type',
                                    'description': 'The expression type (not, and, or)'
                                }, {
                                    'type': 'http://types/select',
                                    'name': 'question',
                                    'description': 'The expression type (not, and, or)'
                                }, {
                                    'type': 'http://types/select',
                                    'multiple': true,
                                    'name': 'questionItem',
                                    'description': 'The question items'
                                }, {
                                    'type': 'http://types/select',
                                    'multiple': true,
                                    'name': 'singleMultiple',
                                    'description': 'The question items'
                                }],
                            'description': 'The logic rule as an expression (c.f. a \'##\' style string)'
                        },
                    ]
                };

                it('should return correct keys', () => {

                    return resourceMerger.createMerge(document, form)
                        .then(doc => {
                            expect(_(doc).keys()).to.deep.equal(['expression']);

                        });
                });

                describe('match match http://types/group', () => {

                    /*
                     * @type {CacheOptions}
                     */
                    const options = {
                        // TODO: needs upgrade for keys on
                        resourceResolver: () => () => Promise.resolve(undefined),
                        resolver: {resolve: u => u + 'XX'} // resolve with changes checked below
                    };

                    var expression;
                    beforeEach(() => {
                        return resourceMerger.createMerge(document, form, options)
                            .then(doc => {
                                expect(_(doc).keys()).to.deep.equal(['expression']);
                                expression = doc.expression;

                            });
                    });

                    it('should have three keys', () => {
                        expect(_(expression).keys()).to.deep.equal(['type', 'questionItem', 'singleMultiple', 'question']);
                    });

                    it('should match http://types/text: text as entered', () => {
                        expect(expression.type).to.equal('not');
                    });

                    it('should  match http://types/select single: question with uri rewrite', () => {
                        expect(expression.question).to.equal('http://api.example.com/question/87869XX');
                    });

                    it('should match http://types/select multiple: questionItem with array or rewritten uris', () => {
                        expect(expression.questionItem).to.deep.equal([
                            'http://api.example.com/question/item/572444XX',
                            'http://api.example.com/question/item/572445XX']);
                    });

                    it('should match http://types/select multiple: string returned as array', () => {

                        expect(expression.singleMultiple).to.deep.equal(['http://api.example.com/question/item/55555XX']);
                    });

                });

            });

            describe('link relations', () => {

                /*
                 * @type {CacheOptions}
                 */
                let options = {
                    resourceResolver: () => () => Promise.resolve({}),
                    resolver: {resolve: u => u}
                };

                it('should look for field in link relations using "http://types/select single"', () => {

                    var document = {
                        'links': [
                            {'rel': 'role', 'href': 'http://example.com/role/1'}
                        ]
                    };

                    const form = {
                        'items': [
                            {
                                'type': 'http://types/select',
                                'name': 'role',
                                'description': 'An optional list of roles to be granted access to the page'
                            }
                        ]
                    };

                    return resourceMerger.createMerge(document, form, options)
                        .then(doc => {
                            expect(_(doc).keys()).to.deep.equal(['role']);
                            expect(doc.role).to.equal('http://example.com/role/1');

                        });
                });

                it('should look for field in link relations using "http://types/select multiple returns array"', () => {

                    var document = {
                        'links': [
                            {'rel': 'role', 'href': 'http://example.com/role/1'}
                        ]
                    };

                    const form = {
                        'items': [
                            {
                                'type': 'http://types/select',
                                'multiple': true,
                                'name': 'role',
                                'description': 'An optional list of roles to be granted access to the page'
                            }
                        ]
                    };

                    return resourceMerger.createMerge(document, form, options)
                        .then(doc => {
                            expect(_(doc).keys()).to.deep.equal(['role']);
                            expect(doc.role).to.deep.equal(['http://example.com/role/1']);

                        });
                });

                /**
                 * Not implemented - currently not needed but test is here when needed
                 */
                xit('should look for field in link relations using "http://types/select multiple returns array" from named collection', () => {

                    var document = {
                        links: [
                            {rel: 'roles', href: 'http://example.com/page/1/role/'}
                        ],
                        roles: {
                            items: {
                                links: [{rel: 'self', href: 'http:example/com/role/1'}]
                            }

                        }
                    };

                    const form = {
                        'items': [
                            {
                                'type': 'http://types/select',
                                'multiple': true,
                                'name': 'roles',
                                'description': 'An optional list of roles to be granted access to the page'
                            }
                        ]
                    };

                    return resourceMerger.createMerge(document, form, options)
                        .then(doc => {
                            expect(_(doc).keys()).to.deep.equal(['roles']);
                            expect(doc.roles).to.deep.equal(['http://example.com/role/1']);

                        });
                });

                it('should look for field in link relations using "http://types/collection"', () => {

                    var document = {
                        'links': [
                            {'rel': 'role', 'href': 'http://example.com/role/1'},
                            {'rel': 'role', 'href': 'http://example.com/role/2'}
                        ]
                    };

                    const form = {
                        'items': [
                            {
                                'type': 'http://types/collection',
                                'name': 'role',
                                'description': 'An optional list of roles to be granted access to the page'
                            }
                        ]
                    };

                    return resourceMerger.createMerge(document, form, options)
                        .then(doc => {
                            expect(_(doc).keys()).to.deep.equal(['role']);
                            expect(doc.role).to.deep.equal(['http://example.com/role/1', 'http://example.com/role/2']);

                        });
                });

                it('should be able to deal with camel case attributes to hyphenated link relations', () => {

                    var document = {
                        'links': [
                            {'rel': 'question-item', 'href': 'http://example.com/question-item/1'}
                        ]
                    };

                    const form = {
                        'items': [
                            {
                                'type': 'http://types/select',
                                'name': 'questionItem',
                            }
                        ]
                    };

                    return resourceMerger.createMerge(document, form, options)
                        .then(doc => {
                            expect(_(doc).keys()).to.deep.equal(['questionItem']);
                            expect(doc.questionItem).to.equal('http://example.com/question-item/1');
                        });

                });
            });
        });

        describe('transformAndCleanTrackedResources', () => {

            const stub = sinon.stub(stubbedResource, 'isTracked');

            describe('remove editform', () => {

                const document = {
                    'links': [
                        {'rel': 'self', 'href': 'http://example.com/user/4199'},
                    ],
                    'name': 'Simplest Survey',
                    'role': {bla: 1},
                };

                it('should black list tracked resources', () => {
                    const resource = {
                        'links': [
                            {'rel': 'self', 'href': 'http://example.com/user/4199'},
                            {'rel': 'edit-form', 'href': 'http://example.com/user/form/edit'},
                        ],
                        'editForm': {}
                    };

                    stub.withArgs('name').returns(false)
                        .withArgs('links').returns(false)
                        .withArgs('editForm').returns(true);

                    const result = resourceMerger.transformAndCleanTrackedResources(resource, document, stubbedResource.isTracked);
                    expect(stub.called).to.be.true;
                    expect(result.editForm).to.be.undefined;
                    expect(result.links).to.not.be.null;
                });
            });

            describe('transform field to link relation', () => {

                it('should black list tracked resources', () => {
                    const resource = {
                        'links': [
                            {'rel': 'role', 'href': 'http://example.com/role/1'},
                        ],
                        role: {not: 'empty'}
                    };

                    const document = {
                        'role': 'http://example.com/role/2',
                    };

                    stub.withArgs(resource, 'role').returns(true);

                    const result = resourceMerger.transformAndCleanTrackedResources(resource, document, stubbedResource.isTracked);

                    expect(stub.called).to.be.true;
                    expect(result.links[0].href).to.equal('http://example.com/role/2');
                    expect(result.role).to.be.undefined;
                });
            });

            it('should be able ', () => {

                let resource = {
                    'links': [
                        {
                            'rel': 'self',
                            'href': 'http://api.example.com/filter/user/113194'
                        },
                        {
                            'rel': 'user',
                            'href': 'http://api.example.com/user/97cde947-9edb-4c1a-9c27-5ae3cfb092b4'
                        },
                    ],
                    'name': 'Age Group',
                    'order': 3,
                    'questionItems': [
                        'http://api.example.com/question/item/627800'
                    ]
                };
                let document = {
                    'links': [
                        {
                            'rel': 'self',
                            'href': 'http://api.example.com/filter/user/113194'
                        },
                        {
                            'rel': 'user',
                            'href': 'http://api.example.com/user/97cde947-9edb-4c1a-9c27-5ae3cfb092b4'
                        },
                    ],
                    'name': 'Age Group',
                    'order': 3,
                    'questionItems': [
                        'http://api.example.com/question/item/627801',
                        'http://api.example.com/question/item/627802',
                        'http://api.example.com/question/item/627803',
                    ]
                };

                stub.withArgs('role').returns(true);
                const result = resourceMerger.transformAndCleanTrackedResources(resource, document, stubbedResource.isTracked);

                expect(stub.called).to.be.true;
                expect(result.links[0].href).to.equal('http://api.example.com/filter/user/113194');
                expect(result.name).to.not.be.null;
                expect(result.questionItems).to.not.be.null;
                expect(result.questionItems.length).to.equal(3);
                expect(result.order).to.not.be.null;

            });
        });

        describe('deep recursion on http://types/group', () => {

            it('should resolve all enumerations on http://types/select', () => {

                const form = {
                    'items': [
                        {
                            'type': 'http://types/group',
                            'multiple': true,
                            'name': 'dataSources',
                            'items': [
                                {
                                    'type': 'http://types/text',
                                    'name': 'id',
                                    'description': 'A unique identifier for this resource'

                                },
                                {
                                    'type': 'http://types/group',
                                    'multiple': true,
                                    'name': 'items',
                                    'items': [
                                        {
                                            'type': 'http://types/select',
                                            'name': 'question',
                                            'description': 'The mandatory question'
                                        },
                                        {
                                            'type': 'http://types/select',
                                            'multiple': true,
                                            'name': 'includeQuestionItems',
                                            'description': 'The mandatory question'
                                        },
                                        {
                                            'type': 'http://types/text',
                                            'name': 'offset',
                                            'description': 'A optional numberic offset to be applied to the the question item value'
                                        }
                                    ],
                                    'description': 'The collection of questions used to query the data source'
                                }
                            ],
                            'description': ''
                        }
                    ]
                };

                const document = {
                    'dataSources': [
                        {
                            'id': 'http://types.example.com/chart/identifier/4',
                            'items': [
                                {
                                    'question': 'http://api.example.com/question/96905'
                                },
                                {
                                    'question': 'http://api.example.com/question/969010'
                                }
                            ]
                        }
                    ],
                };

                /*
                 * @type {CacheOptions}
                 */
                let options = {
                    resourceResolver: () => () => Promise.resolve(undefined),
                    resolver: {resolve: u => u + 'XX'}
                };

                return resourceMerger.createMerge(document, form, options)
                    .then(doc => {
                        expect(_(doc).keys()).to.deep.equal(['dataSources']);
                        expect(doc.dataSources.length).to.equal(1);

                        const dataSource = doc.dataSources[0];

                        expect(dataSource.items.length).to.equal(2);
                        expect(dataSource.items[0].question).to.equal('http://api.example.com/question/96905XX');
                        expect(dataSource.items[1].question).to.equal('http://api.example.com/question/969010XX');

                    });

            });

        });
    });
});