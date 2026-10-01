/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {enableFreeze} from 'react-native-screens';
import App from './App';
import {name as appName} from './app.json';

// W7: screens behind the current one stop re-rendering until shown again.
enableFreeze(true);

AppRegistry.registerComponent(appName, () => App);
