import { motion, PanInfo } from 'framer-motion';
import { useState } from 'react';

interface JobCardProps {
  job: {
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
    startup_stage: string;
    startup_verified: boolean;
    match_score: number;
  };
  onSwipe: (direction: 'left' | 'right') => void;
}

function JobCard({ job, onSwipe }: JobCardProps) {
  const [exitX, setExitX] = useState(0);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      setExitX(500);
      onSwipe('right');
    } else if (info.offset.x < -100) {
      setExitX(-500);
      onSwipe('left');
    }
  };

  const formatSalary = (min: number, max: number) => {
    return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
  };

  const formatEquity = (min: number, max: number) => {
    return `${(min * 100).toFixed(2)}% - ${(max * 100).toFixed(2)}%`;
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, x: exitX }}
      exit={{ opacity: 0, x: exitX }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* Match Score Badge */}
      {job.match_score > 0.7 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-gradient-to-r from-green-400 to-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            {Math.round(job.match_score * 100)}% Match
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {job.startup_name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900">{job.startup_name}</h2>
              {job.startup_verified && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-500">{job.startup_stage} • {job.location}</p>
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="p-6 space-y-4 overflow-y-auto max-h-[400px]">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
          <div className="flex items-center space-x-2 mt-1">
            {job.remote_allowed && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                Remote OK
              </span>
            )}
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed">{job.description}</p>

        {/* Compensation */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Salary</p>
            <p className="text-sm font-semibold text-gray-900">{formatSalary(job.salary_min, job.salary_max)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Equity</p>
            <p className="text-sm font-semibold text-gray-900">{formatEquity(job.equity_min, job.equity_max)}</p>
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tech Stack</p>
          <div className="flex flex-wrap gap-2">
            {job.tech_stack?.map((tech) => (
              <span key={tech} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Swipe Hint */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-8 text-sm text-gray-400">
        <span>← Pass</span>
        <span>Swipe →</span>
      </div>
    </motion.div>
  );
}

export default JobCard;