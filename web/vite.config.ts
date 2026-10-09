// Web build (package W-1). The phone app runs in the browser through
// react-native-web: `react-native` is aliased to it, native-only libraries
// are aliased to the small stand-ins in web/shims, and a file named
// `thing.web.ts(x)` beside `thing.ts(x)` wins over it. The phone build
// (Metro) never sees any of this.
//
//   npm run web          dev server
//   npm run web:build    static folder in dist-web/ (host it anywhere)

import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import {defineConfig, transformWithEsbuild, type Plugin} from 'vite';
import pkg from '../package.json';

const root = path.resolve(__dirname, '..');
// Libraries that ship JSX inside plain .js files (the phone's bundler copes;
// a browser bundler needs to be told).
const JSX_IN_JS = /node_modules\/(react-native-vector-icons)\/.*\.js$/;
const jsxInJs: Plugin = {
  name: 'jsx-in-node-modules-js',
  enforce: 'pre',
  transform(code, id) {
    return JSX_IN_JS.test(id) ? transformWithEsbuild(code, id, {loader: 'jsx', jsx: 'automatic'}) : null;
  },
};

const shim = (name: string) => path.resolve(__dirname, 'shims', name);

// The dev server copies the shims into its cache of pre-bundled libraries
// (`react-native` inside gesture-handler, for one) and does not notice when a
// shim changes. A cache folder per shim version makes it rebuild.
const shimsDir = path.resolve(__dirname, 'shims');
const shimsHash = createHash('sha1')
  .update(
    fs
      .readdirSync(shimsDir)
      .sort()
      .map(file => file + fs.readFileSync(path.join(shimsDir, file), 'utf8'))
      .join('\n'),
  )
  .digest('hex')
  .slice(0, 8);

export default defineConfig(({mode}) => ({
  root: __dirname,
  cacheDir: path.resolve(root, `node_modules/.vite/web-${shimsHash}`),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [
    jsxInJs,
    react({
      // Reanimated's worklets need its Babel plugin, on the web too.
      babel: {babelrc: false, configFile: false, plugins: ['react-native-reanimated/plugin']},
    }),
  ],
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
    __APP_VERSION__: JSON.stringify(pkg.version),
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: [
      {find: /^react-native$/, replacement: shim('react-native.ts')},
      // Phone-only internals that libraries reach into.
      {find: /^react-native\/Libraries\/.*$/, replacement: shim('rn-internal.ts')},
      {find: /^@\//, replacement: `${path.resolve(root, 'src')}/`},
      {find: /^@brands\//, replacement: `${path.resolve(root, 'brands')}/`},
      // Its ES build re-exports a type (`export { PressableProps }`), which esbuild rejects.
      {
        find: /^react-native-gesture-handler$/,
        replacement: path.resolve(root, 'node_modules/react-native-gesture-handler/lib/commonjs/index.js'),
      },
      {find: /^react-native-device-info$/, replacement: shim('device-info.ts')},
      {find: /^react-native-linear-gradient$/, replacement: shim('linear-gradient.tsx')},
      {find: /^@gorhom\/bottom-sheet$/, replacement: shim('bottom-sheet.tsx')},
      {find: /^@react-native-community\/datetimepicker$/, replacement: shim('datetimepicker.tsx')},
      {find: /^@react-native-clipboard\/clipboard$/, replacement: shim('clipboard.ts')},
    ],
  },
  optimizeDeps: {
    // Some React Native libraries ship JSX in .js files.
    esbuildOptions: {
      resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx'],
      loader: {'.js': 'jsx'},
      define: {global: 'globalThis'},
    },
  },
  build: {
    outDir: path.resolve(root, 'dist-web'),
    emptyOutDir: true,
    sourcemap: false,
    commonjsOptions: {transformMixedEsModules: true},
  },
  server: {port: 5173},
}));
