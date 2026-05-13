import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  headline?: string;
  bio?: string;
  role?: string;
}

export default function ProfileScreen() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(user as UserProfile | null);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [title, setTitle] = useState(user?.title || '');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const next = response.data;
      setProfile(next);
      setFirstName(next.firstName || next.first_name || '');
      setLastName(next.lastName || next.last_name || '');
      setTitle(next.title || next.headline || '');
      setBio(next.bio || '');
    } catch (err: any) {
      Alert.alert('Profile unavailable', err.response?.data?.error || 'Could not load profile.');
    }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const saveProfile = async () => {
    setLoading(true);
    try {
      await api.put('/profile-enhanced/basic', { firstName, lastName, title, headline: title, bio });
      updateUser({ firstName, lastName, title });
      setProfile((prev) => prev ? { ...prev, firstName, lastName, title, bio } : prev);
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (err: any) {
      Alert.alert('Save failed', err.response?.data?.error || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    clearAuth();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(firstName?.[0] || profile?.email?.[0] || '?').toUpperCase()}</Text></View>
        <Text style={styles.name}>{firstName || 'Your'} {lastName || 'Profile'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <Text style={styles.role}>{profile?.role || user?.subscriptionTier || 'candidate'}</Text>
      </View>

      <Text style={styles.label}>First name</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
      <Text style={styles.label}>Last name</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
      <Text style={styles.label}>Headline</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Product designer, React engineer..." />
      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.textarea]} value={bio} onChangeText={setBio} multiline placeholder="Tell recruiters what you are looking for." />

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={saveProfile} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save profile'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 20, paddingTop: 56 },
  headerCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 22 },
  avatar: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 23, fontWeight: '800', color: '#0f172a' },
  email: { color: '#64748b', marginTop: 4 },
  role: { marginTop: 8, color: '#2563eb', fontWeight: '700' },
  label: { color: '#334155', fontWeight: '700', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, fontSize: 16 },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontWeight: '800' },
  logoutButton: { padding: 16, alignItems: 'center', marginTop: 10 },
  logoutText: { color: '#ef4444', fontWeight: '800' },
});
