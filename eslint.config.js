module.exports = {
  extends: [
    'eslint:recommended', // Use recommended rules
    'plugin:react/recommended', // If using React
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true, // Enable JSX if using React
    },
    ecmaVersion: 12, // Use the latest ECMAScript version
    sourceType: 'module', // Allow the use of imports
  },
  rules: {
    // Custom rules can be added here
    'no-console': 'warn', // Warn on console logs
    indent: ['error', 2], // Enforce 2-space indentation
    quotes: ['error', 'single'], // Enforce single quotes
  },
};
