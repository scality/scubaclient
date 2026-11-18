import scality from '@scality/eslint-config-scality';
import { jest } from '@scality/eslint-config-scality/testing';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    ...scality,
    {
        files: ['**/*.ts'],
    },
    {
        languageOptions: {
            parser: tseslint.parser,
        },
    },
    jest(['tests/**/*.ts']),
);
