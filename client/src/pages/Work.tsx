import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Briefcase, Building2, Users, MessageSquare, BarChart3,
  Settings, ChevronRight, Eye, TrendingUp, User, LogOut, Heart
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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  interview_scheduled: 'bg-violet-100 text-violet-700',
  hired: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function Work() {
  const { user, clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState({ totalMatches: 0, rightSwipes: 0 });

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
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'connections', label: 'Connections', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Welcome back, {user?.firstName}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all outline-none focus:outline-none ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Matches', value: stats.totalMatches, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Right Swipes', value: stats.rightSwipes, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Companies Matched', value: new Set(matches.map(m => m.startup_id)).size, icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${card.bg}`}>
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link to="/swipe" className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Find Jobs</h3>
                <p className="text-sm text-slate-500">Browse and apply to new opportunities</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </Link>

            <Link to="/matches" className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Heart className="w-6 h-6 text-rose-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">My Matches</h3>
                <p className="text-sm text-slate-500">View and chat with your matches</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </Link>

            <Link to="/messages" className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Messages</h3>
                <p className="text-sm text-slate-500">Continue your conversations</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </Link>

            <Link to="/analytics" className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Analytics</h3>
                <p className="text-sm text-slate-500">Track your job search performance</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </Link>
          </div>
        </div>
      )}

      {/* My Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Matched Jobs</h2>
          {matches.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium mb-2">No matches yet</p>
              <Link to="/swipe" className="text-blue-600 text-sm font-medium hover:underline">
                Start swiping
              </Link>
            </div>
          ) : (
            matches.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  {m.startup_logo
                    ? <img src={m.startup_logo} alt="" className="w-full h-full rounded-xl object-cover" />
                    : <Building2 className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{m.job_title}</h3>
                  <p className="text-sm text-slate-500">{m.startup_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Matched {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[m.status] || 'bg-slate-100 text-slate-600'}`}>
                  {m.status || 'pending'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Companies You've Matched With</h2>
          {matches.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium mb-2">No companies yet</p>
              <Link to="/swipe" className="text-blue-600 text-sm font-medium hover:underline">
                Start swiping to get matched
              </Link>
            </div>
          ) : (
            Array.from(new Map(matches.map(m => [m.startup_id, m])).values()).map((m) => (
              <div key={m.startup_id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  {m.startup_logo
                    ? <img src={m.startup_logo} alt="" className="w-full h-full rounded-xl object-cover" />
                    : <Building2 className="w-6 h-6 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{m.startup_name}</h3>
                  <p className="text-sm text-slate-500">{m.job_title}</p>
                </div>
                <Link to="/matches" className="text-blue-600 text-sm font-medium hover:underline">
                  View chat
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Your Connections</h2>
          {matches.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium mb-2">No connections yet</p>
              <Link to="/swipe" className="text-blue-600 text-sm font-medium hover:underline">
                Start swiping to get matched
              </Link>
            </div>
          ) : (
            matches.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{m.startup_name}</h3>
                  <p className="text-sm text-slate-500">{m.job_title}</p>
                  <p className="text-xs text-slate-400">Connected {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <Link to="/messages" className="text-blue-600 text-sm font-medium hover:underline">
                  Message
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/profile" className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Edit Profile</h3>
              <p className="text-sm text-slate-500">Update your information</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </Link>

          <Link to="/subscription" className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="p-3 bg-violet-50 rounded-xl">
              <BarChart3 className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Subscription</h3>
              <p className="text-sm text-slate-500">Manage your plan</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </Link>

          <button
            onClick={handleLogout}
            className="bg-white border border-red-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4 text-left w-full"
          >
            <div className="p-3 bg-red-50 rounded-xl">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-600">Sign Out</h3>
              <p className="text-sm text-red-400">Log out of your account</p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-300" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Work;
