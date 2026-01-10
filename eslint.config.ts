import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';

import globals from 'globals';

export default [
  /* ----------------------------------------
   * Base / language rules
   * -------------------------------------- */
  js.configs.recommended,
  ...tseslint.configs.recommended,

  /* ----------------------------------------
   * React (Remix)
   * -------------------------------------- */
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  {
    plugins: {
      'react-hooks': pluginReactHooks,
      'jsx-a11y': pluginJsxA11y,
    },
    settings: {
      react: { version: 'detect' },
      formComponents: ['Form'],
      linkComponents: [
        { name: 'Link', linkAttribute: 'to' },
        { name: 'NavLink', linkAttribute: 'to' },
      ],
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginJsxA11y.configs.recommended.rules,

      // React / Remix adjustments
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'jsx-a11y/control-has-associated-label': 'off',
    },
  },

  /* ----------------------------------------
   * Server-only overrides
   * -------------------------------------- */
  {
    files: ['**/*.server.*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  /* ----------------------------------------
   * Prettier（一定要放最後）
   * -------------------------------------- */
  eslintConfigPrettier,

  /* ----------------------------------------
   * Ignore paths
   * -------------------------------------- */
  {
    ignores: ['dist/**', 'build/**', '.react-router/**', '**/*.generated.*'],
  },
];
