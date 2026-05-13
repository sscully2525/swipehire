import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

interface Metric { label: string; value: string | number; hint?: string }

export default function AnalyticsScreen() {
  const user = useAuthStore((state) => state.user);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setRefreshing(true);
    try {
      const endpoint = (user as any)?.role === 'recruiter' ? '/recruiter/analytics' : '/analytics/candidate';
      const response = await api.get(endpoint);
      const data = response.data || {};
      const next: Metric[] = (user as any)?.role === 'recruiter'
        ? [
            { label: 'Active jobs', value: data.activeJobs ?? data.jobs ?? 0 },
            { label: 'Candidate matches', value: data.matches ?? 0 },
            { label: 'Messages', value: data.messages ?? 0 },
            { label: 'Profile views', value: data.views ?? 0 },
          ]
        : [
            { label: 'Swipes right', value: data.swipesRight ?? data.rightSwipes ?? 0 },
            { label: 'Matches', value: data.matches ?? 0 },
            { label: 'Messages', value: data.messages ?? 0 },
            { label: 'Remaining swipes', value: data.remainingSwipes ?? '—' },
          ];
      setMetrics(next);
    } catch (err: any) {
      Alert.alert('Analytics unavailable', err.response?.data?.error || 'Could not load analytics.');
      setMetrics([
        { label: 'Matches', value: 0, hint: 'Start swiping to build signal.' },
        { label: 'Messages', value: 0, hint: 'Matches can turn into conversations.' },
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAnalytics} />}
    >
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>Track momentum and where to focus next.</Text>
      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.card}>
            <Text style={styles.value}>{metric.value}</Text>
            <Text style={styles.label}>{metric.label}</Text>
            {metric.hint ? <Text style={styles.hint}>{metric.hint}</Text> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 20, paddingTop: 56 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  value: { fontSize: 30, fontWeight: '900', color: '#2563eb' },
  label: { color: '#334155', fontWeight: '700', marginTop: 6 },
  hint: { color: '#64748b', marginTop: 6, fontSize: 12 },
});
