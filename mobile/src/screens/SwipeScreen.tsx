import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated, Alert } from 'react-native';
import api from '../lib/api';
import { useSwipeStore } from '../store/auth';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

interface Job {
  id: string;
  title: string;
  description: string;
  salary_min: number;
  salary_max: number;
  startup_name: string;
  startup_stage: string;
  location: string;
  remote_allowed: boolean;
  tech_stack: string[];
  match_score: number;
}

export default function SwipeScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = new Animated.ValueXY();
  const { remainingSwipes, setRemainingSwipes, decrementSwipes } = useSwipeStore();

  useEffect(() => {
    fetchJobs();
    fetchSwipeInfo();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/startups');
      setJobs(response.data);
    } catch (err) {
      console.error('Failed to fetch jobs');
    }
  };

  const fetchSwipeInfo = async () => {
    try {
      const response = await api.get('/swipes/remaining');
      setRemainingSwipes(response.data.remainingSwipes);
    } catch (err) {
      console.error('Failed to fetch swipe info');
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        swipeRight();
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        swipeLeft();
      } else {
        resetPosition();
      }
    },
  });

  const swipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => handleSwipe('right'));
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => handleSwipe('left'));
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= jobs.length) return;

    const job = jobs[currentIndex];

    try {
      const response = await api.post('/swipes', {
        jobId: job.id,
        direction,
      });

      setRemainingSwipes(response.data.remainingSwipes);

      if (response.data.match) {
        Alert.alert('🎉 It\'s a Match!', `You matched with ${job.startup_name}!`);
      }

      if (direction === 'right') {
        decrementSwipes();
      }

      position.setValue({ x: 0, y: 0 });
      setCurrentIndex(currentIndex + 1);
    } catch (err: any) {
      if (err.response?.data?.upgradeRequired) {
        Alert.alert('Daily Limit Reached', 'Upgrade for unlimited swipes!');
      }
      resetPosition();
    }
  };

  const renderCard = () => {
    const job = jobs[currentIndex];
    if (!job) {
      return (
        <View style={styles.noMoreCards}>
          <Text style={styles.noMoreText}>🎉</Text>
          <Text style={styles.noMoreTitle}>You're all caught up!</Text>
          <Text style={styles.noMoreSubtitle}>Check back later for more opportunities</Text>
        </View>
      );
    }

    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>{job.startup_name.charAt(0)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.companyName}>{job.startup_name}</Text>
            <Text style={styles.stage}>{job.startup_stage} • {job.location}</Text>
          </View>
          {job.match_score > 0.7 && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{Math.round(job.match_score * 100)}% Match</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          {job.remote_allowed && (
            <View style={styles.remoteBadge}>
              <Text style={styles.remoteText}>Remote OK</Text>
            </View>
          )}
          <Text style={styles.description} numberOfLines={4}>
            {job.description}
          </Text>

          <View style={styles.compensation}>
            <Text style={styles.salary}>
              ${(job.salary_min / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k
            </Text>
          </View>

          <View style={styles.techStack}>
            {job.tech_stack?.slice(0, 5).map((tech) => (
              <View key={tech} style={styles.techBadge}>
                <Text style={styles.techText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.swipeCount}>{remainingSwipes} swipes left</Text>
      </View>

      <View style={styles.cardContainer}>
        {renderCard()}
      </View>

      <View style={styles.buttons}>
        <View style={[styles.button, styles.passButton]} />
        <View style={[styles.button, styles.likeButton]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  swipeCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: 500,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 20,
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  stage: {
    fontSize: 14,
    color: '#6b7280',
  },
  matchBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 20,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  remoteBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  remoteText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  compensation: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  salary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  techStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  techText: {
    color: '#2563eb',
    fontSize: 12,
  },
  noMoreCards: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noMoreText: {
    fontSize: 60,
    marginBottom: 16,
  },
  noMoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  noMoreSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    gap: 40,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  passButton: {
    backgroundColor: '#fee2e2',
  },
  likeButton: {
    backgroundColor: '#d1fae5',
  },
});