import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, Users, MessageSquare, TrendingUp, 
  Plus, Edit2, Eye, CheckCircle, XCircle,
  MapPin, DollarSign
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  salary_min: number;
  salary_max: number;
  location: string;
  remote_allowed: boolean;
  status: string;
  views_count: number;
  applications_count: number;
  created_at: string;
}

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  avatar_url: string;
  match_score: number;
  linkedin_verified: boolean;
}

function RecruiterDashboard() {
  useAuthStore();
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [companiesRes, candidatesRes, dashboardRes] = await Promise.all([
        api.get('/recruiter/companies'),
        api.get('/recruiter/candidates'),
        api.get('/recruiter/dashboard')
      ]);

      // Collect all jobs from all companies
      const allJobs: Job[] = [];
      const companies: any[] = Array.isArray(companiesRes.data) ? companiesRes.data : [];
      for (const company of companies) {
        try {
          const companyRes = await api.get(`/recruiter/companies/${company.id}`);
          if (Array.isArray(companyRes.data.jobs)) {
            allJobs.push(...companyRes.data.jobs.map((j: any) => ({ ...j, company_name: company.name })));
          }
        } catch {
          // skip company if fetch fails
        }
      }

      setJobs(allJobs);
      setCandidates(Array.isArray(candidatesRes.data) ? candidatesRes.data : []);
      setStats(dashboardRes.data);
    } catch (err) {
      console.error('Failed to load recruiter dashboard', err);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (jobData: any) => {
    try {
      await api.post('/recruiter/jobs', jobData);
      toast.success('Job posted successfully');
      setShowJobModal(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to create recruiter job', err);
      toast.error('Failed to create job');
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#191919]">Recruiter Dashboard</h1>
        <p className="text-[#666666] mt-1">Manage your jobs and find top talent</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Active Jobs</p>
              <p className="text-2xl font-bold text-[#191919]">{stats?.stats?.jobs ?? jobs.length}</p>
            </div>
            <Briefcase className="w-8 h-8 text-[#0A66C2]" />
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
              <p className="text-sm text-[#666666]">Total Matches</p>
              <p className="text-2xl font-bold text-[#191919]">{stats?.stats?.matches ?? 0}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
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
              <p className="text-sm text-[#666666]">Interested Candidates</p>
              <p className="text-2xl font-bold text-[#191919]">{stats?.stats?.interestedCandidates ?? 0}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-600" />
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
              <p className="text-sm text-[#666666]">Companies</p>
              <p className="text-2xl font-bold text-[#191919]">{stats?.stats?.companies ?? 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-[#E0E0E0]">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'jobs' 
              ? 'text-[#0A66C2] border-b-2 border-[#0A66C2]' 
              : 'text-[#666666] hover:text-[#191919]'
          }`}
        >
          My Jobs
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'candidates' 
              ? 'text-[#0A66C2] border-b-2 border-[#0A66C2]' 
              : 'text-[#666666] hover:text-[#191919]'
          }`}
        >
          Candidates
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'analytics' 
              ? 'text-[#0A66C2] border-b-2 border-[#0A66C2]' 
              : 'text-[#666666] hover:text-[#191919]'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-title">Active Job Postings</h2>
            <button 
              onClick={() => setShowJobModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Job</span>
            </button>
          </div>

          <div className="space-y-4">
            {jobs.map((job) => (
              <motion.div 
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#191919]">{job.title}</h3>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-[#666666]">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {job.location}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        ${job.salary_min?.toLocaleString()} - ${job.salary_max?.toLocaleString()}
                      </span>
                      {job.remote_allowed && (
                        <span className="badge-primary">Remote</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-[#666666]">
                      <Eye className="w-4 h-4 inline mr-1" />
                      {job.views_count} views
                    </span>
                    <button className="p-2 hover:bg-gray-100 rounded-full">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-[#E0E0E0] flex justify-between items-center">
                  <div className="flex space-x-4 text-sm">
                    <span className="text-[#666666]">
                      {job.applications_count} applications
                    </span>
                    <span className="text-[#8C8C8C]">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`badge ${
                    job.status === 'active' ? 'badge-success' : 'badge-secondary'
                  }`}>
                    {job.status}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {jobs.length === 0 && (
              <div className="text-center py-12 card">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active jobs. Post your first job!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div>
          <h2 className="section-title mb-4">Matched Candidates</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {candidates.map((candidate) => (
              <motion.div 
                key={candidate.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-4 flex items-start space-x-4"
              >
                <div className="w-12 h-12 bg-[#F3F2EF] rounded-full flex items-center justify-center flex-shrink-0">
                  {candidate.avatar_url ? (
                    <img src={candidate.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-[#0A66C2]">
                      {candidate.first_name[0]}{candidate.last_name[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-[#191919]">
                      {candidate.first_name} {candidate.last_name}
                    </h3>
                    {candidate.linkedin_verified && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-[#666666]">{candidate.title}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="badge-primary">
                      {candidate.match_score}% Match
                    </span>
                  </div>
                </div>
                <button className="btn-secondary text-sm">
                  View Profile
                </button>
              </motion.div>
            ))}
            
            {candidates.length === 0 && (
              <div className="text-center py-12 card col-span-2">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No candidates yet. Post jobs to get matches!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <h2 className="section-title mb-4">Recruitment Analytics</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-[#666666] mb-1">Total Jobs Posted</p>
              <p className="text-3xl font-bold text-[#191919]">{stats?.stats?.jobs ?? jobs.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-[#666666] mb-1">Interested Candidates</p>
              <p className="text-3xl font-bold text-[#191919]">{stats?.stats?.interestedCandidates ?? candidates.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-[#666666] mb-1">Total Matches</p>
              <p className="text-3xl font-bold text-[#191919]">{stats?.stats?.matches ?? 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-[#666666] mb-1">Companies Managed</p>
              <p className="text-3xl font-bold text-[#191919]">{stats?.stats?.companies ?? 0}</p>
            </div>
          </div>
          {stats?.recentActivity?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-[#191919] mb-3">Recent Candidate Activity</h3>
              <div className="space-y-3">
                {stats.recentActivity.map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#191919]">{a.first_name} {a.last_name}</span>
                    <span className="text-[#666666]">{a.job_title}</span>
                    <span className="text-[#8C8C8C]">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#191919]">Post New Job</h2>
              <button 
                onClick={() => setShowJobModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <JobForm onSubmit={handleCreateJob} onCancel={() => setShowJobModal(false)} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Job Form Component
function JobForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    salary_min: '',
    salary_max: '',
    location: '',
    remote_allowed: true,
    employment_type: 'full-time',
    experience_level: 'mid'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      requirements: formData.requirements.split('\n').filter(r => r.trim()),
      salary_min: parseInt(formData.salary_min),
      salary_max: parseInt(formData.salary_max)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Job Title</label>
        <input
          type="text"
          required
          className="input-field"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="e.g. Senior Full Stack Engineer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Description</label>
        <textarea
          required
          rows={4}
          className="input-field"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Describe the role and responsibilities..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Requirements (one per line)</label>
        <textarea
          rows={3}
          className="input-field"
          value={formData.requirements}
          onChange={(e) => setFormData({...formData, requirements: e.target.value})}
          placeholder="e.g. 5+ years of experience with React&#10;Strong TypeScript skills&#10;Experience with Node.js"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#666666] mb-1">Min Salary</label>
          <input
            type="number"
            required
            className="input-field"
            value={formData.salary_min}
            onChange={(e) => setFormData({...formData, salary_min: e.target.value})}
            placeholder="80000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#666666] mb-1">Max Salary</label>
          <input
            type="number"
            required
            className="input-field"
            value={formData.salary_max}
            onChange={(e) => setFormData({...formData, salary_max: e.target.value})}
            placeholder="150000"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Location</label>
        <input
          type="text"
          required
          className="input-field"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
          placeholder="e.g. San Francisco, CA or Remote"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="remote"
          checked={formData.remote_allowed}
          onChange={(e) => setFormData({...formData, remote_allowed: e.target.checked})}
          className="w-4 h-4 text-[#0A66C2]"
        />
        <label htmlFor="remote" className="text-sm text-[#666666]">Remote work allowed</label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Post Job
        </button>
      </div>
    </form>
  );
}

export default RecruiterDashboard;