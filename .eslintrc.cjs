module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Custom rules or overrides can go here
    '@typescript-eslint/no-explicit-any': 'warn', // Too many existing instances
    '@typescript-eslint/ban-ts-comment': 'warn',
    'no-empty-pattern': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }]
  },
  ignorePatterns: ['dist/', 'node_modules/']
};
