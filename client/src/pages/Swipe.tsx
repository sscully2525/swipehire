import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, RefreshCw, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
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

  const { remainingSwipes, dailyLimit, setSwipeInfo, decrementSwipes } = useSwipeStore();

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
      if (filters.stages?.length > 0) params.append('stages', filters.stages.join(','));
      if (filters.tech?.length > 0) params.append('tech', filters.tech.join(','));
      const qs = params.toString();
      const response = await api.get(qs ? `/startups?${qs}` : '/startups');
      setJobs(response.data);
      setCurrentIndex(0);
    } catch {
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
      // Non-critical
    }
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (currentIndex >= jobs.length) return;
    const job = jobs[currentIndex];
    try {
      const response = await api.post('/swipes', { jobId: job.id, direction });
      setSwipeInfo(response.data.remainingSwipes, useSwipeStore.getState().dailyLimit);
      if (response.data.match) setMatch(job);
      if (direction === 'right') decrementSwipes();
      setCurrentIndex((prev) => prev + 1);
    } catch (err: any) {
      if (err.response?.data?.upgradeRequired) {
        toast.error('Daily limit reached — upgrade for more swipes!');
      } else {
        toast.error('Failed to record swipe');
      }
    }
  }, [currentIndex, jobs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleSwipe('left');
      if (e.key === 'ArrowRight') handleSwipe('right');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSwipe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const currentJob = jobs[currentIndex];
  const swipedCount = dailyLimit - remainingSwipes;
  const progressPct = dailyLimit > 0 ? Math.min(100, (swipedCount / dailyLimit) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discover Jobs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {jobs.length - currentIndex} jobs remaining
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
            showFilters
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Swipe progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {remainingSwipes} swipes left today
          </span>
          <span>{swipedCount}/{dailyLimit}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
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
      <div className="relative h-[560px]">
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-3xl shadow-lg p-8 text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mb-5">
                <RefreshCw className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all caught up!</h2>
              <p className="text-slate-500 mb-6 max-w-xs">
                You've reviewed all available jobs. Check back later for new opportunities.
              </p>
              <button
                onClick={fetchJobs}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Refresh Jobs
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Swipe Buttons */}
      {currentJob && (
        <div className="flex items-center justify-center gap-6 mt-6">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSwipe('left')}
            className="w-14 h-14 rounded-2xl bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 flex items-center justify-center shadow-md transition-colors"
            title="Pass (← Arrow)"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>
          <div className="text-xs text-slate-300 text-center leading-snug">
            Use arrow keys<br />or drag the card
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSwipe('right')}
            className="w-14 h-14 rounded-2xl bg-white border-2 border-green-200 text-green-500 hover:bg-green-50 hover:border-green-400 flex items-center justify-center shadow-md transition-colors"
            title="Like (→ Arrow)"
          >
            <ArrowRight className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      <MatchModal
        isOpen={!!match}
        job={match}
        onClose={() => setMatch(null)}
      />
    </div>
  );
}

export default Swipe;
