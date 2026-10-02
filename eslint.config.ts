import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import type { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

function forbidImports(patterns: string[], message: string): Linter.RulesRecord {
  return { 'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }] };
}

export default defineConfig([
  js.configs.recommended,
  // Type-aware rules: no `any`, no unsafe values, no unchecked promises, no needless assertions.
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // Hexagonal dependency rule: what the profile says and how it is drawn depend on nothing.
    files: ['src/domain/**'],
    ignores: ['**/*.test.ts'],
    rules: forbidImports(
      ['**/application/**', '**/infrastructure/**', 'zod', 'zod/*', 'node:*'],
      'The domain layer must not depend on outer layers, libraries or the platform.',
    ),
  },
  {
    // The use case depends only on the domain.
    files: ['src/application/**'],
    ignores: ['**/*.test.ts'],
    rules: forbidImports(
      ['**/infrastructure/**', 'zod', 'zod/*', 'node:*'],
      'The application layer must not depend on infrastructure, libraries or the platform.',
    ),
  },
  {
    // The test runner of Node collects `describe` and `it` itself: nothing is left floating.
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', name: ['describe', 'it'], package: 'node:test' },
          ],
        },
      ],
    },
  },
  globalIgnores(['node_modules/**']),
]);
