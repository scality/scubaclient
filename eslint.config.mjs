import { defineConfig } from 'eslint/config';
import scality from '@scality/eslint-config-scality';
import { jest } from '@scality/eslint-config-scality/testing';
import tseslint from 'typescript-eslint';

export default defineConfig(
    ...scality,
    {
        files: ['**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
        },
    },
    {
        files: [tseslint.globs.ts],
        extends: [tseslint.configs.recommended],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    jest(['tests/**/*.ts']),
);
