import React, { useContext, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AppNav = () => {
  const { isLoading, userToken, API_URL } = useContext(AuthContext);

  useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          axios.put(`${API_URL}/user/push-token`, { pushToken: token }, {
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
        console.log('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId: '7513e2f4-e817-4daf-915e-abbe6fcb13cb' })).data;
    }
    return token;
  }

  if (isLoading) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size={'large'} color="#00aa00" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken !== null ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNav;
