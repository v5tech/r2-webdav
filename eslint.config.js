import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import i18next from 'eslint-plugin-i18next'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage', '.wrangler'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // plugin v7 默认 error; 现有代码内有 effect 内调 setState 的模式, 单独整理, 升级 scope 内只降级为 warn
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['functions/**/*.ts'],
    languageOptions: {
      globals: { ...globals.worker },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-var': 'warn',
    },
  },
  // Legacy MUI files (slated for rewrite in Phase 2); downgrade rules to warnings
  {
    files: [
      'src/Main.tsx',
      'src/Header.tsx',
      'src/FileGrid.tsx',
      'src/MimeIcon.tsx',
      'src/MultiSelectToolbar.tsx',
      'src/ProgressDialog.tsx',
      'src/TextPadDrawer.tsx',
      'src/UploadDrawer.tsx',
      'src/app/transfer.ts',
      'src/app/transferQueue.tsx',
    ],
    rules: {
      'react/display-name': 'warn',
      'no-var': 'warn',
      'no-async-promise-executor': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
  // Phase 2a new UI components: enforce i18n on visible JSX text.
  // Scope intentionally narrow — legacy MUI files and pre-i18n pages (login) untouched.
  {
    files: [
      'src/components/layout/**/*.{ts,tsx}',
      'src/components/files/**/*.{ts,tsx}',
      'src/components/upload/**/*.{ts,tsx}',
    ],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['warn', { mode: 'jsx-text-only' }],
    },
  },
  prettier,
)
