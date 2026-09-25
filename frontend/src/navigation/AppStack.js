import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import HomeTabs from './HomeTabs';
import CameraScreen from '../screens/CameraScreen';
import AIProcessingScreen from '../screens/AIProcessingScreen';
import ReviewComplaintScreen from '../screens/ReviewComplaintScreen';
import SubmitScreen from '../screens/SubmitScreen';
import StatusDetailsScreen from '../screens/StatusDetailsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import RewardsScreen from '../screens/RewardsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import NameSetupScreen from '../screens/NameSetupScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createStackNavigator();

// AppStack: to handle client requests for AppStack and it processes the request to interact with database/AI and returns a response
const AppStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 300 } },
          close: { animation: 'timing', config: { duration: 300 } }
        }
      }}
    >
      <Stack.Screen name="HomeTabs" component={HomeTabs} />
      <Stack.Screen name="NameSetup" component={NameSetupScreen} options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid }} />
      <Stack.Screen name="Camera" component={CameraScreen} options={{ cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS }} />
      <Stack.Screen name="AIProcessing" component={AIProcessingScreen} options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid }} />
      <Stack.Screen name="ReviewComplaint" component={ReviewComplaintScreen} />
      <Stack.Screen name="Submit" component={SubmitScreen} options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid }} />
      <Stack.Screen name="StatusDetails" component={StatusDetailsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Rewards" component={RewardsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }} />
    </Stack.Navigator>
  );
};

export default AppStack;
