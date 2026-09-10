/**
 * React Native entry point. Metro loads this file first; it registers the
 * root component under the name declared in app.json.
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
