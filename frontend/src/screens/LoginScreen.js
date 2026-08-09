import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const { login, register, sendOtp, verifyOtp } = useContext(AuthContext);
  
  const [isLogin, setIsLogin] = useState(true);
  
  // States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 1: Enter Identifier, 2: Enter OTP, 3: Set Password
  const [signupStep, setSignupStep] = useState(1); 

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter both Email/Phone and password');
      return;
    }
    const success = await login(identifier, password);
    if (!success) Alert.alert('Error', 'Invalid credentials');
  };

  const handleSendOtp = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter your Email or Phone number');
      return;
    }
    const res = await sendOtp(identifier);
    if (res.success) {
      setSignupStep(2);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the 4-digit code');
      return;
    }
    const res = await verifyOtp(identifier, otp);
    if (res.success) {
      setSignupStep(3);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const handleCreateAccount = async () => {
    if (!password || password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const success = await register(identifier, password);
    if (success) {
      Alert.alert('Success', 'Account created successfully! Please log in.');
      // Switch back to login
      setIsLogin(true);
      setSignupStep(1);
      setPassword('');
      setConfirmPassword('');
      setOtp('');
    } else {
      Alert.alert('Error', 'Account creation failed. Identifier might already exist.');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setSignupStep(1);
    setPassword('');
    setConfirmPassword('');
    setOtp('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={50} color="#1B8C4A" />
              <View style={styles.iconBadge}>
                <Ionicons name="person" size={14} color="#fff" />
              </View>
            </View>
            <Text style={styles.welcomeText}>
              {isLogin ? 'Welcome Back!' : (signupStep === 1 ? 'Create Account' : signupStep === 2 ? 'Verify Code' : 'Set Password')}
            </Text>
            <Text style={styles.subText}>
              {isLogin 
                ? 'Login to continue' 
                : (signupStep === 1 
                  ? 'Enter Email or Phone to sign up' 
                  : signupStep === 2 
                    ? `Code sent to ${identifier}`
                    : 'Secure your account')}
            </Text>
          </View>

          <View style={styles.form}>
            {/* IDENTIFIER INPUT - Show in Login or Signup Step 1 */}
            {(isLogin || signupStep === 1) && (
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Email or Phone number" 
                  placeholderTextColor="#999"
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* OTP INPUT - Show in Signup Step 2 */}
            {(!isLogin && signupStep === 2) && (
              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="4-digit Verification Code" 
                  placeholderTextColor="#999"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            )}

            {/* PASSWORD INPUT - Show in Login or Signup Step 3 */}
            {(isLogin || (!isLogin && signupStep === 3)) && (
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
                </TouchableOpacity>
              </View>
            )}

            {/* CONFIRM PASSWORD - Show in Signup Step 3 */}
            {(!isLogin && signupStep === 3) && (
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            )}
            
            {isLogin && (
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* ACTION BUTTON */}
            <TouchableOpacity 
              style={styles.button} 
              onPress={
                isLogin 
                  ? handleLogin 
                  : (signupStep === 1 
                      ? handleSendOtp 
                      : signupStep === 2 
                        ? handleVerifyOtp 
                        : handleCreateAccount)
              }
            >
              <Text style={styles.buttonText}>
                {isLogin 
                  ? 'Login' 
                  : (signupStep === 1 
                      ? 'Send Verification Code' 
                      : signupStep === 2 
                        ? 'Verify Code' 
                        : 'Create Account')}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <>
                <Text style={styles.orText}>or</Text>
                <TouchableOpacity style={styles.googleButton}>
                  <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Login with Google</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
          
          <View style={styles.spacer} />

          <View style={styles.switchAuth}>
            <Text style={styles.switchAuthText} numberOfLines={1} adjustsFontSizeToFit>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={switchMode}>
              <Text style={styles.switchAuthLink}>{isLogin ? 'Sign Up' : 'Login'}</Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    bottom: 20,
    right: 25,
    backgroundColor: '#0B4C82',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F8F3',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    height: 56,
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
  },
  forgotPassword: {
    color: '#1B8C4A',
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 24,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#1B8C4A',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#1B8C4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginBottom: 24,
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  switchAuth: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    flexWrap: 'wrap',
  },
  switchAuthText: {
    color: '#6B7280',
    fontSize: 15,
  },
  switchAuthLink: {
    color: '#1B8C4A',
    fontWeight: 'bold',
    fontSize: 15,
  }
});

export default LoginScreen;

