import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  bio: string;
  skills: string[];
  years_experience: number;
  linkedin_url: string;
  github_url: string;
  startup_id: string;
  startup_name: string;
  job_id: string;
  job_title: string;
  swiped_at: string;
  ai_match_score: number;
}

function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/recruiter/candidates');
      setCandidates(response.data);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (currentIndex >= candidates.length) return;
    
    setActionLoading(true);
    const candidate = candidates[currentIndex];
    
    try {
      await api.post(`/recruiter/candidates/${candidate.id}/like`, {
        jobId: candidate.job_id
      });
      toast.success('It\'s a match! 🎉');
      setCurrentIndex(prev => prev + 1);
    } catch {
      toast.error('Failed to like candidate');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePass = async () => {
    if (currentIndex >= candidates.length) return;
    
    setActionLoading(true);
    const candidate = candidates[currentIndex];
    
    try {
      await api.post(`/recruiter/candidates/${candidate.id}/pass`, {
        jobId: candidate.job_id
      });
      setCurrentIndex(prev => prev + 1);
    } catch {
      toast.error('Failed to pass on candidate');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const currentCandidate = candidates[currentIndex];

  if (!currentCandidate) {
    return (
      <div className="text-center py-16">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900">All caught up!</h2>
        <p className="mt-2 text-gray-600">You've reviewed all interested candidates.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Interested Candidates ({candidates.length - currentIndex} remaining)
      </h1>

      <div className="relative h-[600px]">
        <AnimatePresence>
          <motion.div
            key={currentCandidate.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -300 }}
            className="absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {currentCandidate.first_name?.charAt(0)}{currentCandidate.last_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentCandidate.first_name} {currentCandidate.last_name}
                  </h2>
                  <p className="text-gray-600">{currentCandidate.title}</p>
                  {currentCandidate.years_experience && (
                    <p className="text-sm text-gray-500">{currentCandidate.years_experience} years experience</p>
                  )}
                </div>
                {currentCandidate.ai_match_score > 0.7 && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {Math.round(currentCandidate.ai_match_score * 100)}% Match
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[350px]">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Interested in</p>
                <p className="font-medium text-gray-900">{currentCandidate.job_title} at {currentCandidate.startup_name}</p>
              </div>

              {currentCandidate.bio && (
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Bio</p>
                  <p className="text-gray-700">{currentCandidate.bio}</p>
                </div>
              )}

              {currentCandidate.skills && currentCandidate.skills.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {currentCandidate.skills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                {currentCandidate.linkedin_url && (
                  <a
                    href={currentCandidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    LinkedIn →
                  </a>
                )}
                {currentCandidate.github_url && (
                  <a
                    href={currentCandidate.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:underline"
                  >
                    GitHub →
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-white">
              <div className="flex justify-center space-x-6">
                <button
                  onClick={handlePass}
                  disabled={actionLoading}
                  className="w-16 h-16 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={handleLike}
                  disabled={actionLoading}
                  className="w-16 h-16 rounded-full bg-green-50 text-green-500 hover:bg-green-100 flex items-center justify-center transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Candidates;