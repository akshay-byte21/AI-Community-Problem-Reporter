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

  const getSecurityQuestion = async (identifier) => {
    try {
      const res = await axios.post(`${API_URL}/get-security-question`, { identifier });
      return { success: true, question: res.data.question };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Failed to fetch security question' };
    }
  };

  const verifySecurityAnswer = async (identifier, answer) => {
    try {
      const res = await axios.post(`${API_URL}/verify-security-answer`, { identifier, answer });
      return { success: true, message: res.data.message };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Verification failed' };
    }
  };

  const resetPassword = async (identifier, newPassword) => {
    try {
      const res = await axios.post(`${API_URL}/reset-password`, { identifier, newPassword });
      return { success: true, message: res.data.message };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Password reset failed' };
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

  const register = async (identifier, password, securityQuestion, securityAnswer) => {
    try {
      await axios.post(`${API_URL}/register`, { identifier, password, securityQuestion, securityAnswer });
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
    <AuthContext.Provider value={{ login, logout, register, getSecurityQuestion, verifySecurityAnswer, resetPassword, userToken, isLoading, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};
