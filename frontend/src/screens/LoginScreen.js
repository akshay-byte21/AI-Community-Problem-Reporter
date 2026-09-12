import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SECURITY_QUESTIONS = [
  "What is the name of your first pet?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What was your childhood nickname?"
];

const LoginScreen = ({ navigation }) => {
  const { login, register, getSecurityQuestion, resetPassword } = useContext(AuthContext);
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  
  // States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 

  // Security Question States (Signup)
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Security Question States (Reset)
  const [fetchedQuestion, setFetchedQuestion] = useState('');

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter both Phone number and password');
      return;
    }
    const result = await login(identifier, password);
    if (!result.success) {
      if (result.message === 'user is not registered') {
        Alert.alert('Not Registered', 'Need to create an account.');
        setIsLogin(false); // Switch to sign up mode
      } else {
        Alert.alert('Error', result.message || 'Invalid credentials');
      }
    }
  };

  const handleCreateAccount = async () => {
    if (!identifier || identifier.length !== 10 || !/^\d+$/.test(identifier)) {
      Alert.alert('Error', 'Please enter a valid 10-digit Phone number');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (!securityAnswer.trim()) {
      Alert.alert('Error', 'Please provide an answer to the security question');
      return;
    }

    const res = await register(identifier, password, securityQuestion, securityAnswer);
    if (res.success) {
      Alert.alert('Success', 'Account created successfully! Please log in.');
      setIsLogin(true);
      setPassword('');
      setSecurityAnswer('');
    } else {
      Alert.alert('Error', res.message === 'Account with this email/phone already exists' ? 'Phone number is already existed' : res.message);
    }
  };

  const handleGetQuestion = async () => {
    if (!identifier || identifier.length !== 10 || !/^\d+$/.test(identifier)) {
      Alert.alert('Error', 'Please enter a valid 10-digit Phone number');
      return;
    }
    const res = await getSecurityQuestion(identifier);
    if (res.success) {
      setFetchedQuestion(res.question);
      setResetStep(2);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const handleResetPassword = async () => {
    if (!securityAnswer.trim() || !password) {
      Alert.alert('Error', 'Please enter your answer and a new password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    const res = await resetPassword(identifier, securityAnswer, password);
    if (res.success) {
      Alert.alert('Success', 'Password reset successfully! You can now log in.');
      setIsForgotPassword(false);
      setIsLogin(true);
      setPassword('');
      setSecurityAnswer('');
      setResetStep(1);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const switchMode = () => {
    setIsForgotPassword(false);
    setIsLogin(!isLogin);
    setPassword('');
    setSecurityAnswer('');
  };

  const renderForgotPassword = () => {
    return (
      <View style={styles.form}>
        {resetStep === 1 ? (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Enter 10-digit Phone number" 
                placeholderTextColor="#999"
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleGetQuestion}>
              <Text style={styles.buttonText}>Get Security Question</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.questionText}>Security Question:</Text>
            <Text style={styles.questionBold}>{fetchedQuestion}</Text>
            
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Your Answer"
                placeholderTextColor="#999"
                value={securityAnswer}
                onChangeText={setSecurityAnswer}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="New Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
              <Text style={styles.buttonText}>Reset Password</Text>
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsForgotPassword(false); setResetStep(1); }}>
          <Text style={styles.cancelButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
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
              {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back!' : 'Create Account'}
            </Text>
            <Text style={styles.subText}>
              {isForgotPassword ? 'Answer your security question' : isLogin ? 'Login to continue' : 'Enter 10-digit Phone number to sign up'}
            </Text>
          </View>

          {isForgotPassword ? renderForgotPassword() : (
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder={isLogin ? "Phone number" : "10-digit Phone number"}
                  placeholderTextColor="#999"
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType={isLogin ? "default" : "numeric"}
                  maxLength={isLogin ? undefined : 10}
                  autoCapitalize="none"
                />
              </View>

              {!isLogin && (
                <>
                  <Text style={styles.label}>Security Question (for Password Reset)</Text>
                  <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDropdown(!showDropdown)}>
                    <Text style={styles.dropdownTxt}>{securityQuestion}</Text>
                    <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#888" />
                  </TouchableOpacity>
                  
                  {showDropdown && (
                    <View style={styles.dropdownList}>
                      {SECURITY_QUESTIONS.map((q, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          style={styles.dropdownItem} 
                          onPress={() => { setSecurityQuestion(q); setShowDropdown(false); }}
                        >
                          <Text style={styles.dropdownItemTxt}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Your Answer"
                      placeholderTextColor="#999"
                      value={securityAnswer}
                      onChangeText={setSecurityAnswer}
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}

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
              
              {isLogin && (
                <TouchableOpacity onPress={() => { setIsForgotPassword(true); setResetStep(1); setSecurityAnswer(''); setPassword(''); }}>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.button} 
                onPress={isLogin ? handleLogin : handleCreateAccount}
              >
                <Text style={styles.buttonText}>
                  {isLogin ? 'Login' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.spacer} />

          {!isForgotPassword && (
            <View style={styles.switchAuth}>
              <Text style={styles.switchAuthText} numberOfLines={1} adjustsFontSizeToFit>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={switchMode}>
                <Text style={styles.switchAuthLink}>{isLogin ? 'Sign Up' : 'Login'}</Text>
              </TouchableOpacity>
            </View>
          )}
          
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
  cancelButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666',
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
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginLeft: 4
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    height: 56,
    paddingHorizontal: 16,
  },
  dropdownTxt: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginTop: -8
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  dropdownItemTxt: {
    fontSize: 14,
    color: '#333'
  },
  questionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center'
  },
  questionBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center'
  }
});

export default LoginScreen;
