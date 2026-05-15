import { registerRootComponent } from 'expo';
import { defineLocationTask } from './src/services/LocationWorker';

import App from './App';

// 백그라운드 태스크 등록 (최상위 스코프)
defineLocationTask();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
