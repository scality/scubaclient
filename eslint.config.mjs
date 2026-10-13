import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

export default tseslint.config(
    ...compat.extends('@scality/scality'),
    {
        files: ['**/*.ts'],
    },
    {
        languageOptions: {
            parser: tseslint.parser,
            globals: globals.jest,
        },
    },
    eslintConfigPrettier,
);
