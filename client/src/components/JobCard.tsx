import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { MapPin, DollarSign, TrendingUp, Wifi } from 'lucide-react';

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
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  const formatSalary = (min: number, max: number) => {
    if (!min && !max) return 'Competitive';
    return `$${(min / 1000).toFixed(0)}k–$${(max / 1000).toFixed(0)}k`;
  };

  const formatEquity = (min: number, max: number) => {
    if (!min && !max) return null;
    return `${(min * 100).toFixed(2)}%–${(max * 100).toFixed(2)}%`;
  };

  const stageColors: Record<string, string> = {
    pre_seed: 'bg-orange-100 text-orange-700',
    seed: 'bg-amber-100 text-amber-700',
    series_a: 'bg-blue-100 text-blue-700',
    series_b: 'bg-indigo-100 text-indigo-700',
    series_c: 'bg-purple-100 text-purple-700',
    growth: 'bg-green-100 text-green-700',
  };

  const equity = formatEquity(job.equity_min, job.equity_max);

  return (
    <motion.div
      data-testid="job-card"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-0 bg-white rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {/* Like / Nope overlays */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-8 left-8 z-20 rotate-[-20deg] border-4 border-green-500 rounded-xl px-4 py-2 pointer-events-none"
      >
        <span className="text-2xl font-black text-green-500 tracking-widest">LIKE</span>
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-8 right-8 z-20 rotate-[20deg] border-4 border-red-500 rounded-xl px-4 py-2 pointer-events-none"
      >
        <span className="text-2xl font-black text-red-500 tracking-widest">NOPE</span>
      </motion.div>

      {/* Match Score */}
      {job.match_score > 0.7 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {Math.round(job.match_score * 100)}% Match
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-slate-50 to-blue-50 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0">
            {job.startup_logo
              ? <img src={job.startup_logo} alt="" className="w-full h-full rounded-2xl object-cover" />
              : job.startup_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 truncate">{job.startup_name}</h2>
              {job.startup_verified && (
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageColors[job.startup_stage] || 'bg-slate-100 text-slate-600'}`}>
                {job.startup_stage?.replace('_', ' ')}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 220px)' }}>
        {/* Title + remote */}
        <div>
          <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
          {job.remote_allowed && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
              <Wifi className="w-3 h-3" />
              Remote OK
            </span>
          )}
        </div>

        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{job.description}</p>

        {/* Compensation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              <DollarSign className="w-3 h-3" />
              Salary
            </div>
            <p className="text-sm font-semibold text-slate-900">{formatSalary(job.salary_min, job.salary_max)}</p>
          </div>
          {equity && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                <TrendingUp className="w-3 h-3" />
                Equity
              </div>
              <p className="text-sm font-semibold text-slate-900">{equity}</p>
            </div>
          )}
        </div>

        {/* Tech Stack */}
        {job.tech_stack?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tech Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {job.tech_stack.slice(0, 8).map((tech) => (
                <span key={tech} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                  {tech}
                </span>
              ))}
              {job.tech_stack.length > 8 && (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg">
                  +{job.tech_stack.length - 8}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Swipe hint */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8 text-xs text-slate-300 pointer-events-none">
        <span>← Pass</span>
        <span className="text-slate-200">drag or use arrow keys</span>
        <span>Like →</span>
      </div>
    </motion.div>
  );
}

export default JobCard;
