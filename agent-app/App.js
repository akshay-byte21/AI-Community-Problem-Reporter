import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ResolutionScreen from './src/screens/ResolutionScreen';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { userToken, isLoading, API_URL } = useContext(AuthContext);

  React.useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          axios.put(`${API_URL}/agent/push-token`, { pushToken: token }, {
            headers: { Authorization: `Bearer ${userToken}` }
          }).catch(err => console.log('Failed to save push token:', err));
        }
      });
    }
  }, [userToken]);

  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B8C4A',
      });
    }
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId: '7513e2f4-e817-4daf-915e-abbe6fcb13cb' })).data;
    }
    return token;
  }

  if (isLoading) return null; // Or a splash screen

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken == null ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Resolution" component={ResolutionScreen} options={{ headerShown: true, title: 'Task Details' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
