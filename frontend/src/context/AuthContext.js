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

  // getSecurityQuestion: to handle client requests for getSecurityQuestion and it processes the request to interact with database/AI and returns a response
  const getSecurityQuestion = async (identifier) => {
    try {
      const res = await axios.post(`${API_URL}/get-security-question`, { identifier });
      return { success: true, question: res.data.question };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Failed to fetch security question' };
    }
  };

  // verifySecurityAnswer: to handle client requests for verifySecurityAnswer and it processes the request to interact with database/AI and returns a response
  const verifySecurityAnswer = async (identifier, answer) => {
    try {
      const res = await axios.post(`${API_URL}/verify-security-answer`, { identifier, answer });
      return { success: true, message: res.data.message };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Verification failed' };
    }
  };

  // resetPassword: to handle client requests for resetPassword and it processes the request to interact with database/AI and returns a response
  const resetPassword = async (identifier, newPassword) => {
    try {
      const res = await axios.post(`${API_URL}/reset-password`, { identifier, newPassword });
      return { success: true, message: res.data.message };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Password reset failed' };
    }
  };

  // login: to handle client requests for login and it processes the request to interact with database/AI and returns a response
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

  // register: to handle client requests for register and it processes the request to interact with database/AI and returns a response
  const register = async (identifier, password, securityQuestion, securityAnswer) => {
    try {
      await axios.post(`${API_URL}/register`, { identifier, password, securityQuestion, securityAnswer });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.response?.data?.error || 'Account creation failed.' };
    }
  };

  // logout: to handle client requests for logout and it processes the request to interact with database/AI and returns a response
  const logout = async () => {
    setUserToken(null);
    await AsyncStorage.removeItem('userToken');
  };

  // isLoggedIn: to handle client requests for isLoggedIn and it processes the request to interact with database/AI and returns a response
  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let token = await AsyncStorage.getItem('userToken');
      if (token) {
        try {
          // Verify token is still valid with the backend
          const res = await axios.get(`${API_URL}/user`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserToken(token);
          setUserData(res.data);
        } catch (err) {
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            console.log('Token expired or invalid, logging out automatically');
            setUserToken(null);
            setUserData(null);
            await AsyncStorage.removeItem('userToken');
          } else {
            console.log('Network error on startup, keeping token alive');
            setUserToken(token);
          }
        }
      } else {
        setUserToken(null);
      }
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
