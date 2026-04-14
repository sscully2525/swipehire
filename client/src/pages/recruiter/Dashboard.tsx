import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

function RecruiterDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/recruiter/dashboard');
      setStats(response.data.stats);
      setRecentActivity(response.data.recentActivity);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Recruiter Dashboard</h1>
        <Link
          to="/recruiter/companies/new"
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          + Add Company
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Companies</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.companies || 0}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Active Jobs</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.jobs || 0}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Interested Candidates</p>
          <p className="text-3xl font-bold text-green-600">{stats?.interestedCandidates || 0}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <p className="text-sm text-gray-500">Total Matches</p>
          <p className="text-3xl font-bold text-purple-600">{stats?.matches || 0}</p>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Interest</h2>
          <p className="text-sm text-gray-500">Candidates who swiped right on your jobs</p>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No candidates yet</p>
              <p className="text-sm">Post more jobs to get noticed!</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {activity.first_name?.charAt(0)}{activity.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {activity.first_name} {activity.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{activity.title}</p>
                    <p className="text-xs text-gray-400">Interested in {activity.job_title}</p>
                  </div>
                </div>
                <Link
                  to="/recruiter/candidates"
                  className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg"
                >
                  View →
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RecruiterDashboard;