// Web entry: registers the same App the phone runs and mounts it in #root.

import {AppRegistry} from 'react-native';
import App from '../App';
import './fonts.css';

AppRegistry.registerComponent('MicroFinance', () => App);
AppRegistry.runApplication('MicroFinance', {rootTag: document.getElementById('root')});

// An installed copy keeps working offline for its own files; data still
// comes from the server (and the saved query cache).
if ('serviceWorker' in navigator && !__DEV__) {
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
