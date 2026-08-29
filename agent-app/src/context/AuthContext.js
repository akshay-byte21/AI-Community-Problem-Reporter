import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use the active Cloudflare Tunnel URL
  const API_URL = 'https://campus-coleman-systems-guides.trycloudflare.com';

  const login = async (phone) => {
    try {
      const res = await axios.post(`${API_URL}/agent-login`, { phone });
      const { token, staff } = res.data;
      setUserToken(token);
      setAgent(staff);
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('agentData', JSON.stringify(staff));
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Network error' };
    }
  };

  const logout = async () => {
    setUserToken(null);
    setAgent(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('agentData');
  };

  const loadAuthData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const staff = await AsyncStorage.getItem('agentData');
      if (token && staff) {
        setUserToken(token);
        setAgent(JSON.parse(staff));
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAuthData();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, userToken, agent, isLoading, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};
