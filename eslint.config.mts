// @ts-check

import eslint from '@eslint/js'
import sveltePlugin from 'eslint-plugin-svelte'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: ['**/assets/**/*', '**/dist/**/*'],
	},
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	...sveltePlugin.configs['flat/recommended'],
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.mts', 'packages/ui/*.js', 'packages/ui/*.cjs', 'packages/ui/*.ts'],
				},
				tsconfigRootDir: process.cwd(),
				extraFileExtensions: ['.svelte'],
			},
		},
	},
	{
		files: ['packages/**/src/**/*.ts', 'packages/**/src/**/*.svelte', 'packages/**/tests/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{ allowNumber: true, allowBoolean: true },
			],
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			globals: {
				console: 'readonly',
				window: 'readonly',
				document: 'readonly',
				fetch: 'readonly',
			},
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.svelte'],
			},
		},
	},
	{
		files: ['**/postcss.config.cjs'],
		languageOptions: {
			globals: {
				require: 'readonly',
				module: 'readonly',
				exports: 'readonly',
				process: 'readonly',
				console: 'readonly',
			},
		},
	},
)
