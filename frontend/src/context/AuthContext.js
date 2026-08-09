import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use stable Cloudflare Tunnel public URL to bypass local network and firewall restrictions
  const API_URL = 'https://thunder-highest-regulations-politics.trycloudflare.com';

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
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const register = async (identifier, password) => {
    try {
      await axios.post(`${API_URL}/register`, { identifier, password });
      return true;
    } catch (e) {
      console.error(e);
      return false;
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
