import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useSwipeStore } from '../store/auth';
import toast from 'react-hot-toast';
import JobCard from '../components/JobCard';
import FilterPanel from '../components/FilterPanel';
import MatchModal from '../components/MatchModal';

interface Job {
  id: string;
  title: string;
  description: string;
  salary_min: number;
  salary_max: number;
  equity_min: number;
  equity_max: number;
  location: string;
  remote_allowed: boolean;
  tech_stack: string[];
  startup_name: string;
  startup_logo?: string;
  startup_slug: string;
  startup_stage: string;
  startup_verified: boolean;
  match_score: number;
}

function Swipe() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [match, setMatch] = useState<Job | null>(null);
  const [filters, setFilters] = useState({
    remote: false,
    minSalary: '',
    stages: [] as string[],
    tech: [] as string[],
  });
  
  const { remainingSwipes, setSwipeInfo, decrementSwipes } = useSwipeStore();

  useEffect(() => {
    fetchJobs();
    fetchSwipeInfo();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.remote) params.append('remote', 'true');
      if (filters.minSalary) params.append('minSalary', filters.minSalary);
      if (filters.stages && filters.stages.length > 0) params.append('stages', filters.stages.join(','));
      if (filters.tech && filters.tech.length > 0) params.append('tech', filters.tech.join(','));
      
      const queryString = params.toString();
      const url = queryString ? `/startups?${queryString}` : '/startups';
      const response = await api.get(url);
      setJobs(response.data);
      setCurrentIndex(0);
    } catch (err) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSwipeInfo = async () => {
    try {
      const response = await api.get('/swipes/remaining');
      setSwipeInfo(response.data.remainingSwipes, response.data.dailyLimit);
    } catch {
      // Non-critical — swipe limit defaults will apply
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= jobs.length) return;

    const job = jobs[currentIndex];

    try {
      const response = await api.post('/swipes', {
        jobId: job.id,
        direction,
      });

      setSwipeInfo(response.data.remainingSwipes, useSwipeStore.getState().dailyLimit);

      if (response.data.match) {
        setMatch(job);
      }

      if (direction === 'right') {
        decrementSwipes();
      }

      // Animate card away
      setCurrentIndex((prev) => prev + 1);
    } catch (err: any) {
      if (err.response?.data?.upgradeRequired) {
        toast.error('Daily limit reached! Upgrade for more swipes.');
      } else {
        toast.error('Failed to record swipe');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentJob = jobs[currentIndex];

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
          <p className="text-sm text-gray-500">
            {remainingSwipes} swipes remaining today
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {/* Job Cards */}
      <div className="relative h-[600px]">
        <AnimatePresence>
          {currentJob ? (
            <JobCard
              key={currentJob.id}
              job={currentJob}
              onSwipe={handleSwipe}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg p-8"
            >
              <span className="text-6xl mb-4">🎉</span>
              <h2 className="text-2xl font-bold text-gray-900">You're all caught up!</h2>
              <p className="text-gray-600 mt-2 text-center">
                Check back later for more opportunities
              </p>
              <button
                onClick={fetchJobs}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Swipe Buttons */}
      {currentJob && (
        <div className="flex justify-center space-x-6 mt-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shadow-lg"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSwipe('right')}
            className="w-16 h-16 rounded-full bg-green-50 text-green-500 hover:bg-green-100 flex items-center justify-center shadow-lg"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </motion.button>
        </div>
      )}

      {/* Match Modal */}
      <MatchModal
        isOpen={!!match}
        job={match}
        onClose={() => setMatch(null)}
      />
    </div>
  );
}

export default Swipe;