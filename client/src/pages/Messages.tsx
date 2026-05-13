import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/api';
import { MessageSquare, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Match {
  id: string;
  startup_name: string;
  startup_logo?: string;
  startup_slug: string;
  startup_verified: boolean;
  job_title: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_type: string;
  };
  unread_count: number;
}

function Messages() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/matches');
      // Filter only matches with messages
      const matchesWithMessages = response.data.filter((m: Match) => m.last_message);
      setMatches(matchesWithMessages);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A66C2]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#191919] mb-6">Messages</h1>

      {matches.length === 0 ? (
        <div className="text-center py-16 card">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#191919]">No messages yet</h2>
          <p className="mt-2 text-[#666666]">Start swiping to match with companies!</p>
          <Link
            to="/swipe"
            className="inline-block mt-6 px-6 py-3 bg-[#0A66C2] text-white rounded-full font-medium hover:bg-[#004182]"
          >
            Start Swiping
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Link
                to={`/matches?chat=${match.id}`}
                className={`card p-4 flex items-center space-x-4 hover:shadow-md transition-shadow ${
                  match.unread_count > 0 ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#0A66C2] to-[#0077B5] rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                  {match.startup_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-[#191919] truncate">
                      {match.startup_name}
                    </h3>
                    {match.startup_verified && (
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-[#666666] truncate">{match.job_title}</p>
                  {match.last_message && (
                    <p className="text-sm text-[#8C8C8C] truncate mt-1">
                      {match.last_message.sender_type === 'candidate' ? 'You: ' : ''}
                      {match.last_message.content}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {match.last_message && (
                    <p className="text-xs text-[#8C8C8C]">
                      {formatDistanceToNow(new Date(match.last_message.created_at), { addSuffix: true })}
                    </p>
                  )}
                  {match.unread_count > 0 && (
                    <span className="inline-block mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {match.unread_count}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Messages;