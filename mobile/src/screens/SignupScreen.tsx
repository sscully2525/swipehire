import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

type RootStackParamList = { Login: undefined; Signup: undefined; Main: undefined };
type Props = { navigation: StackNavigationProp<RootStackParamList, 'Signup'> };

const passwordScore = (password: string) => {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

export default function SignupScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const strength = useMemo(() => passwordScore(password), [password]);

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }
    if (strength < 3) {
      Alert.alert('Weak password', 'Use at least 10 characters and mix upper/lowercase, numbers, and symbols.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/signup', { firstName, lastName, email, password });
      const { accessToken, refreshToken, user } = response.data;
      await AsyncStorage.setItem('token', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setAuth(user, accessToken, refreshToken);
    } catch (err: any) {
      Alert.alert('Signup failed', err.response?.data?.error || 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = strength >= 4 ? 'Strong' : strength >= 3 ? 'Good' : strength >= 2 ? 'Fair' : 'Weak';
  const strengthColor = strength >= 4 ? '#16a34a' : strength >= 3 ? '#2563eb' : strength >= 2 ? '#f59e0b' : '#ef4444';

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>⚡</Text>
      <Text style={styles.title}>Create your Gigly account</Text>
      <Text style={styles.subtitle}>Start matching with jobs that fit you.</Text>

      <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {password.length > 0 && (
        <View style={styles.strengthWrap}>
          <View style={styles.strengthTrack}>
            <View style={[styles.strengthBar, { width: `${Math.min(100, strength * 25)}%`, backgroundColor: strengthColor }]} />
          </View>
          <Text style={[styles.strengthText, { color: strengthColor }]}>{strengthLabel} password</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 28 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 15, marginBottom: 12, fontSize: 16 },
  strengthWrap: { marginBottom: 14 },
  strengthTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  strengthBar: { height: 8, borderRadius: 999 },
  strengthText: { marginTop: 6, fontWeight: '600' },
  button: { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 6 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkButton: { marginTop: 18, alignItems: 'center' },
  linkText: { color: '#2563eb', fontWeight: '600' },
});
