import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, MessageSquare, ArrowRight } from 'lucide-react';

interface MatchModalProps {
  isOpen: boolean;
  job: {
    id: string;
    title: string;
    startup_name: string;
    startup_logo?: string;
  } | null;
  onClose: () => void;
}

const confettiColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 1,
            x: `${Math.random() * 100}%`,
            y: '-10%',
            rotate: Math.random() * 360,
            scale: Math.random() * 0.6 + 0.4,
          }}
          animate={{
            y: '110%',
            rotate: Math.random() * 720 - 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: Math.random() * 1.5 + 1,
            delay: Math.random() * 0.5,
            ease: 'easeIn',
          }}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{ background: confettiColors[i % confettiColors.length] }}
        />
      ))}
    </div>
  );
}

function MatchModal({ isOpen, job, onClose }: MatchModalProps) {
  if (!job) return null;

  const initials = job.startup_name.charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 280 }}
            className="relative bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Confetti />

            {/* Glow ring */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ boxShadow: 'inset 0 0 60px 10px rgba(99,102,241,0.08)' }} />

            {/* Icon row */}
            <motion.div
              className="flex items-center justify-center gap-4 mb-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <motion.div
                animate={{ rotate: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              >
                {initials}
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </motion.div>
              <motion.div
                animate={{ rotate: [8, -8, 8] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg"
              >
                <MessageSquare className="w-7 h-7" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <h3 className="text-3xl font-extrabold text-slate-900 mb-1">It's a Match!</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                You and{' '}
                <span className="font-semibold text-slate-900">{job.startup_name}</span>
                {' '}both expressed interest in the{' '}
                <span className="font-semibold text-slate-900">{job.title}</span>
                {' '}role.
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="space-y-3"
            >
              <Link
                to="/matches"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Send a Message
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 text-slate-500 rounded-2xl font-medium hover:bg-slate-50 transition-all text-sm"
              >
                Keep Swiping
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MatchModal;
