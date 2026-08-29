import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeTabs from './HomeTabs';
import CameraScreen from '../screens/CameraScreen';
import AIProcessingScreen from '../screens/AIProcessingScreen';
import ReviewComplaintScreen from '../screens/ReviewComplaintScreen';
import SubmitScreen from '../screens/SubmitScreen';
import StatusDetailsScreen from '../screens/StatusDetailsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createStackNavigator();

const AppStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="HomeTabs" component={HomeTabs} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="AIProcessing" component={AIProcessingScreen} />
      <Stack.Screen name="ReviewComplaint" component={ReviewComplaintScreen} />
      <Stack.Screen name="Submit" component={SubmitScreen} />
      <Stack.Screen name="StatusDetails" component={StatusDetailsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
};

export default AppStack;
