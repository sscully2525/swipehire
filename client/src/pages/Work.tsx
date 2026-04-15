import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Briefcase, Building2, Users, MessageSquare, BarChart3,
  Settings, HelpCircle, FileText, Shield, ChevronRight,
  Bookmark, Eye, TrendingUp, Lock, User, LogOut
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

interface JobApplication {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
  applied_at: string;
}

interface SavedJob {
  id: string;
  title: string;
  startup_name: string;
  salary_min: number;
  salary_max: number;
  location: string;
}

function Work() {
  const { user, clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [stats, setStats] = useState({
    profileViews: 0,
    searchAppearances: 0,
    applications: 0,
    savedJobs: 0
  });

  useEffect(() => {
    fetchWorkData();
  }, []);

  const fetchWorkData = async () => {
    try {
      // Fetch applications
      const appsRes = await api.get('/profile/applications').catch(() => ({ data: [] }));
      setApplications(appsRes.data);

      // Fetch saved jobs
      const savedRes = await api.get('/profile/saved-jobs').catch(() => ({ data: [] }));
      setSavedJobs(savedRes.data);

      // Fetch stats
      const statsRes = await api.get('/analytics/dashboard').catch(() => ({ data: {} }));
      setStats({
        profileViews: statsRes.data?.profileViews || 0,
        searchAppearances: statsRes.data?.searchAppearances || 0,
        applications: appsRes.data?.length || 0,
        savedJobs: savedRes.data?.length || 0
      });
    } catch (err) {
      console.error('Failed to fetch work data');
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
          <div className="grid md:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Profile Views</p>
                  <p className="text-2xl font-bold text-[#191919]">{stats.profileViews}</p>
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
                  <p className="text-sm text-[#666666]">Search Appearances</p>
                  <p className="text-2xl font-bold text-[#191919]">{stats.searchAppearances}</p>
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
                  <p className="text-sm text-[#666666]">Applications</p>
                  <p className="text-2xl font-bold text-[#191919]">{stats.applications}</p>
                </div>
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Saved Jobs</p>
                  <p className="text-2xl font-bold text-[#191919]">{stats.savedJobs}</p>
                </div>
                <Bookmark className="w-8 h-8 text-orange-600" />
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

      {/* My Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <h2 className="section-title">Applied Jobs</h2>
          {applications.length === 0 ? (
            <div className="text-center py-12 card">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No applications yet</p>
              <Link to="/swipe" className="text-[#0A66C2] font-medium hover:underline mt-2 inline-block">
                Start applying
              </Link>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#191919]">{app.job_title}</h3>
                    <p className="text-[#666666]">{app.company_name}</p>
                    <p className="text-sm text-[#8C8C8C] mt-1">
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="badge-primary capitalize">{app.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Saved Jobs Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <h2 className="section-title">Saved Jobs</h2>
          {savedJobs.length === 0 ? (
            <div className="text-center py-12 card">
              <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No saved jobs yet</p>
              <Link to="/swipe" className="text-[#0A66C2] font-medium hover:underline mt-2 inline-block">
                Browse jobs
              </Link>
            </div>
          ) : (
            savedJobs.map((job) => (
              <div key={job.id} className="card p-4">
                <h3 className="font-semibold text-[#191919]">{job.title}</h3>
                <p className="text-[#666666]">{job.startup_name}</p>
                <p className="text-sm text-[#8C8C8C]">{job.location}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="text-center py-12 card">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Company following coming soon</p>
        </div>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <div className="text-center py-12 card">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Professional network coming soon</p>
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

          <button 
            onClick={() => toast.info('Privacy settings coming soon')}
            className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4 text-left w-full"
          >
            <div className="p-3 bg-purple-100 rounded-lg">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#191919]">Privacy</h3>
              <p className="text-sm text-[#666666]">Manage your privacy</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => toast.info('Resume builder coming soon')}
            className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4 text-left w-full"
          >
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#191919]">Resume Builder</h3>
              <p className="text-sm text-[#666666]">Create or update resume</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => toast.info('Help center coming soon')}
            className="card p-4 hover:shadow-md transition-shadow flex items-center space-x-4 text-left w-full"
          >
            <div className="p-3 bg-orange-100 rounded-lg">
              <HelpCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#191919]">Help Center</h3>
              <p className="text-sm text-[#666666]">Get support and help</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

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