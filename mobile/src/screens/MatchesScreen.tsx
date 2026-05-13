import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import api from '../lib/api';

interface Match {
  id: string;
  startup_name?: string;
  job_title?: string;
  status?: string;
  created_at?: string;
  unread_count?: number;
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = useCallback(async () => {
    try {
      const response = await api.get('/matches');
      setMatches(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      Alert.alert('Could not load matches', err.response?.data?.error || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadMatches(); }, [loadMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadMatches();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Matches</Text>
      <Text style={styles.subtitle}>Companies where there is mutual interest.</Text>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No matches yet. Keep swiping.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => Alert.alert(item.startup_name || 'Match', 'Chat opens from the web app today; mobile chat is next.') }>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.startup_name || '?')[0]}</Text></View>
            <View style={styles.cardBody}>
              <Text style={styles.company}>{item.startup_name || 'Startup'}</Text>
              <Text style={styles.job}>{item.job_title || 'Role matched'}</Text>
              <Text style={styles.meta}>{item.status || 'matched'}{item.unread_count ? ` • ${item.unread_count} unread` : ''}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 56 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginBottom: 18, marginTop: 4 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 80 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  cardBody: { flex: 1 },
  company: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  job: { color: '#334155', marginTop: 2 },
  meta: { color: '#64748b', marginTop: 4, fontSize: 12 },
});
