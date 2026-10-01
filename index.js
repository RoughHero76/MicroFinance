/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {enableFreeze} from 'react-native-screens';
import {registerBackgroundHandler} from './src/lib/push';
import App from './App';
import {name as appName} from './app.json';

// W7: screens behind the current one stop re-rendering until shown again.
enableFreeze(true);
// Pushes that arrive while the app is closed are shown by Android itself.
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
