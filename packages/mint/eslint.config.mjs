import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'no-console': 'warn',
      'prefer-const': 'error',
      curly: ['error', 'multi-line'],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Downgrade strict rules to warn (pre-existing issues to fix incrementally)
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  prettierConfig,
];
