import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Briefcase, Building2, Users, MessageSquare, BarChart3,
  Settings, ChevronRight, Bookmark, Eye, TrendingUp, Lock, User, LogOut
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

interface Match {
  id: string;
  job_title: string;
  startup_name: string;
  startup_logo: string | null;
  job_location: string;
  salary_min: number;
  salary_max: number;
  status: string;
  created_at: string;
  startup_id: string;
}

function Work() {
  const { clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    rightSwipes: 0,
    savedJobs: 0
  });

  useEffect(() => {
    fetchWorkData();
  }, []);

  const fetchWorkData = async () => {
    try {
      const matchesRes = await api.get('/matches').catch(() => ({ data: [] }));
      const matchList: Match[] = Array.isArray(matchesRes.data) ? matchesRes.data : [];
      setMatches(matchList);

      const swipeRes = await api.get('/swipes/stats').catch(() => ({ data: {} }));
      setStats({
        totalMatches: matchList.length,
        rightSwipes: parseInt(swipeRes.data?.right_swipes || '0'),
        savedJobs: 0
      });
    } catch {
      toast.error('Failed to load work data');
    }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'jobs', label: 'My Jobs', icon: Briefcase },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'connections', label: 'Connections', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-[#191919] mb-6">Work</h1>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0A66C2] text-white'
                : 'bg-white text-[#666666] hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Total Matches</p>
                  <p className="text-2xl font-bold text-[#191919]">{stats.totalMatches}</p>
                </div>
                <Eye className="w-8 h-8 text-[#0A66C2]" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Right Swipes</p>
                  <p className="text-2xl font-bold text-[#191919]">{stats.rightSwipes}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Companies Matched</p>
                  <p className="text-2xl font-bold text-[#191919]">
                    {new Set(matches.map(m => m.startup_id)).size}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-purple-600" />
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/swipe" className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4">
              <div className="p-3 bg-[#E3F0FE] rounded-lg">
                <Briefcase className="w-6 h-6 text-[#0A66C2]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#191919]">Find Jobs</h3>
                <p className="text-sm text-[#666666]">Browse and apply to new opportunities</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link to="/matches" className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#191919]">Messages</h3>
                <p className="text-sm text-[#666666]">Chat with recruiters and companies</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>
      )}

      {/* My Jobs Tab — shows matches as job applications */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <h2 className="section-title">Matched Jobs</h2>
          {matches.length === 0 ? (
            <div className="text-center py-12 card">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No matches yet</p>
              <Link to="/swipe" className="text-[#0A66C2] font-medium hover:underline mt-2 inline-block">
                Start swiping
              </Link>
            </div>
          ) : (
            matches.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#191919]">{m.job_title}</h3>
                    <p className="text-[#666666]">{m.startup_name}</p>
                    <p className="text-sm text-[#8C8C8C] mt-1">
                      Matched {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="badge-primary capitalize">{m.status || 'pending'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Saved Tab — placeholder until save-job API is built */}
      {activeTab === 'saved' && (
        <div className="text-center py-12 card">
          <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Saved jobs feature coming soon</p>
          <Link to="/swipe" className="text-[#0A66C2] font-medium hover:underline mt-2 inline-block">
            Browse jobs
          </Link>
        </div>
      )}

      {/* Companies Tab — unique companies from matches */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <h2 className="section-title">Companies You've Matched With</h2>
          {matches.length === 0 ? (
            <div className="text-center py-12 card">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No companies yet — start swiping to get matched</p>
              <Link to="/swipe" className="text-[#0A66C2] font-medium hover:underline mt-2 inline-block">
                Browse jobs
              </Link>
            </div>
          ) : (
            Array.from(new Map(matches.map(m => [m.startup_id, m])).values()).map((m) => (
              <div key={m.startup_id} className="card p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#F3F2EF] rounded-lg flex items-center justify-center flex-shrink-0">
                  {m.startup_logo
                    ? <img src={m.startup_logo} alt="" className="w-full h-full rounded-lg object-cover" />
                    : <Building2 className="w-6 h-6 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#191919]">{m.startup_name}</h3>
                  <p className="text-sm text-[#666666]">{m.job_title}</p>
                </div>
                <Link to="/matches" className="text-[#0A66C2] text-sm font-medium hover:underline">
                  View chat
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Connections Tab — matches as professional connections */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          <h2 className="section-title">Your Connections</h2>
          {matches.length === 0 ? (
            <div className="text-center py-12 card">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No connections yet</p>
              <Link to="/swipe" className="text-[#0A66C2] font-medium hover:underline mt-2 inline-block">
                Start swiping to get matched
              </Link>
            </div>
          ) : (
            matches.map((m) => (
              <div key={m.id} className="card p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#E3F0FE] rounded-full flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-[#0A66C2]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#191919]">{m.startup_name}</h3>
                  <p className="text-sm text-[#666666]">{m.job_title}</p>
                  <p className="text-xs text-[#8C8C8C]">Connected {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <Link to="/messages" className="text-[#0A66C2] text-sm font-medium hover:underline">
                  Message
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/profile" className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4">
            <div className="p-3 bg-[#E3F0FE] rounded-lg">
              <User className="w-6 h-6 text-[#0A66C2]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#191919]">Edit Profile</h3>
              <p className="text-sm text-[#666666]">Update your information</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link to="/subscription" className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#191919]">Subscription</h3>
              <p className="text-sm text-[#666666]">Manage your plan</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <button
            onClick={handleLogout}
            className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4 text-left w-full text-red-600"
          >
            <div className="p-3 bg-red-100 rounded-lg">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Sign Out</h3>
              <p className="text-sm text-red-400">Log out of your account</p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Work;