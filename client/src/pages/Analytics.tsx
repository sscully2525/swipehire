import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import toast from 'react-hot-toast';

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
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const swipeData = [
    { name: 'Right Swipes', value: parseInt(data?.swipes?.total_right_swipes || 0) },
    { name: 'Left Swipes', value: parseInt(data?.swipes?.total_left_swipes || 0) },
  ];



  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Your Analytics</h1>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Total Matches</p>
          <p className="text-3xl font-bold text-gray-900">{data?.matches?.total_matches || 0}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Right Swipes</p>
          <p className="text-3xl font-bold text-green-600">{data?.swipes?.total_right_swipes || 0}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Today's Swipes</p>
          <p className="text-3xl font-bold text-blue-600">{data?.swipes?.today_swipes || 0}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Interviews</p>
          <p className="text-3xl font-bold text-purple-600">{data?.matches?.scheduled_interviews || 0}</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Swipe Activity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={swipeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Matching Skills</h3>
          {data?.skillMatches?.length > 0 ? (
            <div className="space-y-3">
              {data.skillMatches.map((skill: any, index: number) => (
                <div key={skill.skill} className="flex items-center">
                  <span className="w-8 text-sm text-gray-500">#{index + 1}</span>
                  <div className="flex-1 mx-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${(skill.count / data.skillMatches[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No data yet</p>
          )}
        </motion.div>
      </div>

      {/* AI Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI-Powered Recommendations</h3>
        {recommendations.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    {rec.startup_name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900">{rec.startup_name}</span>
                </div>
                <p className="text-sm text-gray-600">{rec.title}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-green-600 font-medium">
                    {Math.round(rec.match_score * 100)}% match
                  </span>
                  <span className="text-xs text-gray-400">{rec.startup_stage}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Complete your profile to get personalized recommendations!</p>
        )}
      </motion.div>
    </div>
  );
}

export default Analytics;