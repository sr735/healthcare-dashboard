import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  // Ignore build output, deps, and files not covered by a tsconfig project
  {
    ignores: [
      'dist',
      'node_modules',
      'e2e/**',
      'playwright.config.ts',
      'vite.config.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, prettierConfig],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript-specific
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── Strict-mode overrides ───────────────────────────────────────────────
      // These rules from strictTypeChecked produce excessive noise for the
      // patterns this codebase intentionally uses (navigate in onClick,
      // numbers in template literals, axios interceptors, import.meta.env).

      // navigate('/path') in onClick returns void — fine for event handlers
      '@typescript-eslint/no-confusing-void-expression': 'off',

      // Numbers, booleans etc. in template literals are fine
      '@typescript-eslint/restrict-template-expressions': 'off',

      // Async handlers used only as fire-and-forget in React props
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],

      // import.meta.env values are typed as `any` by Vite's type definitions;
      // flagging every env access as unsafe adds noise without value here.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',

      // Axios interceptor error parameter is `unknown` — Promise.reject(error)
      // is idiomatic and safe even though `error` may not be an Error instance.
      '@typescript-eslint/prefer-promise-reject-errors': 'off',

      // Deprecation warnings surfaced as warnings so they don't fail CI but
      // are still visible for future cleanup.
      '@typescript-eslint/no-deprecated': 'warn',
    },
  },
)
