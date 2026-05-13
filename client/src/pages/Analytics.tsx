import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { TrendingUp, Heart, Zap, Calendar, Cpu } from 'lucide-react';

function Analytics() {
  const [data, setData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, recsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/recommendations'),
      ]);
      setData(dashboardRes.data);
      setRecommendations(recsRes.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const rightSwipes = parseInt(data?.swipes?.total_right_swipes || 0);
  const leftSwipes = parseInt(data?.swipes?.total_left_swipes || 0);
  const totalSwipes = rightSwipes + leftSwipes;
  const matchRate = totalSwipes > 0 ? Math.round((parseInt(data?.matches?.total_matches || 0) / rightSwipes) * 100) : 0;

  const pieData = [
    { name: 'Right Swipes', value: rightSwipes, color: '#22c55e' },
    { name: 'Left Swipes', value: leftSwipes, color: '#ef4444' },
  ];

  const barData = data?.skillMatches?.slice(0, 6).map((s: any) => ({
    name: s.skill,
    count: parseInt(s.count),
  })) || [];

  const statCards = [
    {
      label: 'Total Matches',
      value: data?.matches?.total_matches || 0,
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
    {
      label: 'Right Swipes',
      value: rightSwipes,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Today\'s Swipes',
      value: data?.swipes?.today_swipes || 0,
      icon: Zap,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Interviews',
      value: data?.matches?.scheduled_interviews || 0,
      icon: Calendar,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your job search performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-white rounded-2xl border ${card.border} p-5 shadow-sm`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <div className={`p-2 rounded-xl ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Match Rate Banner */}
      {totalSwipes > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white flex items-center justify-between"
        >
          <div>
            <p className="text-blue-100 text-sm font-medium">Match Rate</p>
            <p className="text-4xl font-bold mt-1">{isNaN(matchRate) ? 0 : matchRate}%</p>
            <p className="text-blue-200 text-sm mt-1">of right swipes turned into matches</p>
          </div>
          <TrendingUp className="w-16 h-16 text-blue-300 opacity-50" />
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
        >
          <h3 className="text-base font-semibold text-slate-900 mb-4">Swipe Breakdown</h3>
          {totalSwipes > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">
              No swipe data yet — start swiping!
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
        >
          <h3 className="text-base font-semibold text-slate-900 mb-4">Top Skills in Matches</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">
              Complete your profile to see skill matches
            </div>
          )}
        </motion.div>
      </div>

      {/* AI Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Cpu className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">AI-Powered Recommendations</h3>
        </div>
        {recommendations.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    {rec.startup_name.charAt(0)}
                  </div>
                  <span className="font-medium text-slate-900 text-sm truncate">{rec.startup_name}</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{rec.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {Math.round(rec.match_score * 100)}% match
                  </span>
                  <span className="text-xs text-slate-400">{rec.startup_stage}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Complete your profile to get personalized job recommendations.</p>
        )}
      </motion.div>
    </div>
  );
}

export default Analytics;
