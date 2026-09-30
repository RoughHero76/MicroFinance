module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    // Release builds drop console.log/info/debug (W6); warnings and errors
    // stay for crash reports.
    production: {
      plugins: [['transform-remove-console', {exclude: ['error', 'warn']}]],
    },
  },
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: { '@': './src', '@brands': './brands' },
      },
    ],
    // Must stay last.
    'react-native-reanimated/plugin',
  ],
};
