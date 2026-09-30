module.exports = {
  presets: ['module:@react-native/babel-preset'],
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
