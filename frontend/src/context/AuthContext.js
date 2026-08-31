import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Bypass localtunnel warning screen
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['User-Agent'] = 'axios/0.21.1';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // The backend URL - update this when your Cloudflare tunnel restarts
  const API_URL = 'https://ai-community-problem-reporter.onrender.com';

  const sendOtp = async (identifier) => {
    try {
      const res = await axios.post(`${API_URL}/send-otp`, { identifier });
      return { success: true, message: res.data.message };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Failed to send OTP' };
    }
  };

  const verifyOtp = async (identifier, otp) => {
    try {
      const res = await axios.post(`${API_URL}/verify-otp`, { identifier, otp });
      return { success: true, message: res.data.message };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Invalid OTP' };
    }
  };

  const login = async (identifier, password) => {
    try {
      const res = await axios.post(`${API_URL}/login`, { identifier, password });
      const token = res.data.token;
      setUserToken(token);
      await AsyncStorage.setItem('userToken', token);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Network error: Cannot reach server.' };
    }
  };

  const register = async (identifier, password) => {
    try {
      await axios.post(`${API_URL}/register`, { identifier, password });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Account creation failed.' };
    }
  };

  const logout = async () => {
    setUserToken(null);
    await AsyncStorage.removeItem('userToken');
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let token = await AsyncStorage.getItem('userToken');
      setUserToken(token);
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, register, sendOtp, verifyOtp, userToken, isLoading, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};
