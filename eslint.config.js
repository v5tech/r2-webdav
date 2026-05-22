import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
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
  prettier,
)
