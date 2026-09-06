import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import ReportsScreen from '../screens/ReportsScreen';
import MapScreen from '../screens/MapScreen';
import TrackScreen from '../screens/TrackScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={{
      top: -25,
      justifyContent: 'center',
      alignItems: 'center',
      ...styles.shadow
    }}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={{
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: '#1B8C4A',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: '#FAFAFA',
    }}>
      {children}
    </View>
  </TouchableOpacity>
);

const HomeTabs = () => {
  const navigation = useNavigation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          elevation: 5,
          backgroundColor: '#ffffff',
          height: 70,
          paddingBottom: 10,
          paddingTop: 10
        },
        tabBarActiveTintColor: '#1B8C4A',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({color}) => (<Icon name="home-outline" size={24} color={color} />)
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{
          tabBarIcon: ({color}) => (<Icon name="map-outline" size={24} color={color} />)
        }}
      />
      
      {/* Center Camera Button */}
      <Tab.Screen 
        name="Capture" 
        component={View} // Dummy component, handled by onPress
        listeners={{
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Camera');
          }
        }}
        options={{
          tabBarIcon: ({color}) => (<Icon name="camera" size={32} color="#fff" />),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} />
          )
        }}
      />

      <Tab.Screen 
        name="Track" 
        component={TrackScreen} 
        options={{
          tabBarIcon: ({color}) => (<Icon name="location-outline" size={24} color={color} />)
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({color}) => (<Icon name="person-outline" size={24} color={color} />)
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#00aa00',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5
  }
});

export default HomeTabs;
