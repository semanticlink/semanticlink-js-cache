module.exports = {
    root: true,

    env: {
        browser: true,
        es6: true,
        // mocha: true,
        node: false,
    },

    'extends': [
        // see https://github.com/standard/eslint-config-standard/blob/master/eslintrc.json
        'plugin:@typescript-eslint/recommended',
    ],

    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'semi': ['error', 'always'],
        'linebreak-style': 'off',

        'import/no-extraneous-dependencies': [2, {devDependencies: ['**/test.ts']}],
        '@typescript-eslint/indent': [2, 2],

        // All strings should be single quotes, however:
        //   - string templates are allowed
        //   - if there is a double quoted string to allow less escaping, allow double quotes.
        //
        // see
        // - https://eslint.org/docs/rules/quotes.html
        'quotes': ["error", "single", {"avoidEscape": true, "allowTemplateLiterals": true}],

        //
        // Code should be all indented with 4 spaces (not tabs), and the switch/case statements
        // should also be indented.
        //
        // see
        // - https://eslint.org/docs/rules/indent
        'indent': ['error', 4, {'SwitchCase': 1}],

        //
        //  Add a trailing comma on multi-line elements, so that additional items can be added to
        //  without causing a change in ownership of the original source lines (by having to add
        //  the comma)
        //
        'comma-dangle': ['error', {
            'arrays': 'always-multiline',
            'objects': 'always-multiline',
            'imports': 'always-multiline',
            'exports': 'always-multiline',
            'functions': 'never'
        }],

        // With function calls it is helpful to have the function call parenthesis bound/close to
        // the name.
        //
        // see
        //   - https://eslint.org/docs/rules/space-before-function-paren
        'space-before-function-paren': ['error', {
            'anonymous': 'never',
            'named': 'never',
            'asyncArrow': 'always'
        }],

        // Ternary operators are treated the same as all other operators. Binary OR operator
        // is treated as special (not sure why).
        //
        // see
        // - https://eslint.org/docs/rules/operator-linebreak
        'operator-linebreak': ['error', 'after', {
            'overrides': {
                // "?": "before",
                // ":": "before",
                '|>': 'before'
            }
        }],

        // This is a performance optimisation. It isn't clear if this would be removed by the typescript
        // compiler. The await would have to be re-added if the method is extended.
        //
        // see
        //  - https://eslint.org/docs/rules/no-return-await
        'no-return-await': 'off',
        // This setting defaults to having spaces on the inside of object (dictionary) declarations.
        // The JetBrains settings need to be changed so this this is consistent.
        //
        // However the following have to be checked (not the default):
        //   Editor -> CodeStyle -> Typescript-> 'Spaces' -> Within -> 'Object Literal braces'
        //   Editor -> CodeStyle -> Typescript-> 'Spaces' -> Within -> 'ES6 import/export braces'
        //
        //  see
        //    - https://eslint.org/docs/rules/object-curly-spacing
        //
        // 'object-curly-spacing': ['error', 'always']
    },
    'overrides': [
        {
            'files': ['*.vue'],
            'rules': {
                'indent': 'off',

                // The standard setup for Vue has changed so that the code inside a <script> tag is no
                // longer indented. However for compatibility for now leave it indented by '1' at the
                // base level (this means the no indent option is not required).
                //
                // If you are using webstorm, you can File => Setting => Editor => Code Style => HTML[tab==other]
                // add to the 'Do not indent children' field a value of 'script'
                //
                // see
                //  - https://eslint.vuejs.org/rules/script-indent.html
                //  - https://github.com/vuejs/eslint-plugin-vue/issues/362
                //  - https://github.com/vuejs/eslint-plugin-vue/issues/399
                //  - https://intellij-support.jetbrains.com/hc/en-us/community/posts/360000058150/comments/360000051759
                'vue/script-indent': ['error', 4, {
                    'baseIndent': 1,
                    'switchCase': 1
                }],

                // see
                //  - https://eslint.vuejs.org/rules/html-indent.html
                'vue/html-indent': ['error', 4, {
                    'baseIndent': 1,
                    'attribute': 2,
                }],

                // No extra white space (new line) at the end of each element
                //
                // see
                //  - https://eslint.vuejs.org/rules/html-closing-bracket-newline.html
                'vue/html-closing-bracket-newline': ['error', {
                    'singleline': 'never',
                    'multiline': 'never'
                }],

                // see
                //  - https://eslint.vuejs.org/rules/max-attributes-per-line.html
                'vue/max-attributes-per-line': ['error', {
                    'singleline': 10,
                    'multiline': {
                        'max': 1,
                        'allowFirstLine': false
                    }
                }],

                // Allow having content inside elements
                //
                // We have included v-icon in the ignores list, because while there be may be some attributes,
                // the inside content is assumed to be always a single string identifier
                //
                // see
                //  - https://eslint.vuejs.org/rules/singleline-html-element-content-newline.html
                'vue/singleline-html-element-content-newline': ['error', {
                    'ignoreWhenNoAttributes': true,
                    'ignoreWhenEmpty': true,
                    'ignores': ['pre', 'textarea', 'v-icon']
                }]
            }
        },
        {
            'files': ['*.ts'],
            'rules': {
                // These two rules are to compensation for eslint crashing when parsing typescript files
                // with a constructor with no body. This is valid typescript, but not valid javascript.
                //
                // This issue seems to be well documented in various bug trackers, and seems to have
                // benn addressed in early 2019.
                //
                // see
                // - https://github.com/eslint/eslint/issues/11440
                // - https://github.com/typescript-eslint/typescript-eslint/pull/167
                'no-useless-constructor': 'off',
                '@typescript-eslint/no-useless-constructor': 'error',
            }
        },
        {
            'files': ['*.Spec.js', '*.spec.js'],
            'rules': {
                // Disable this warning for chai expressions (that have side effects).
                // e.g.
                //    expect(obj).to.not.be.null;
                //
                // see
                //   - https://stackoverflow.com/questions/45079454/no-unused-expressions-in-mocha-chai-unit-test-using-standardjs
                //   - https://github.com/cypress-io/eslint-plugin-cypress/issues/3
                'no-unused-expressions': 'off'
            }
        },
    ],

    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts'],
        },
        'import/resolver': {
            typescript: {},
        },
    },

    plugins: [
        '@typescript-eslint',
        'prettier'
    ],

    parserOptions: {
        parser: '@typescript-eslint/parser'
    }
};
