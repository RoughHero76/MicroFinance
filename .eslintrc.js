const noRawColours = [
  'error',
  {
    selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: 'Use a theme colour (t.colors.*) instead of a hex literal. Colours live in src/theme.',
  },
  {
    selector: 'Literal[value=/^rgba?\\(/]',
    message: 'Use a theme colour (t.colors.*) or withAlpha() instead of rgb()/rgba().',
  },
];

module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // New code must take every colour from the theme, so palettes and dark
      // mode keep working (W0). src/theme is where colours are defined.
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: ['src/theme/**'],
      rules: { 'no-restricted-syntax': noRawColours },
    },
  ],
};
