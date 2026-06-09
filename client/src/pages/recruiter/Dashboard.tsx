import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Briefcase, Users, MessageSquare, TrendingUp,
  Plus, Edit2, Eye, CheckCircle, XCircle,
  MapPin, DollarSign, HandCoins, ChevronDown
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  salary_min: number;
  salary_max: number;
  pricing_type?: string;
  budget_min?: number;
  budget_max?: number;
  deadline?: string;
  estimated_duration?: string;
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
  // Which gig's bids panel is expanded (one at a time)
  const [bidsJobId, setBidsJobId] = useState<string | null>(null);

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
      toast.success('Gig posted successfully');
      setShowJobModal(false);
      fetchDashboardData();
    } catch (err: any) {
      console.error('Failed to create recruiter job', err);
      // Surface the server's reason (e.g. "Create a company before posting
      // a job") instead of a generic failure.
      toast.error(err.response?.data?.error || 'Failed to create gig');
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
        <h1 className="text-3xl font-bold text-[#191919]">Client Dashboard</h1>
        <p className="text-[#666666] mt-1">Manage your gigs and find great freelancers</p>
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
              <p className="text-sm text-[#666666]">Active Gigs</p>
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
              <p className="text-sm text-[#666666]">Interested Freelancers</p>
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
          My Gigs
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'candidates' 
              ? 'text-[#0A66C2] border-b-2 border-[#0A66C2]' 
              : 'text-[#666666] hover:text-[#191919]'
          }`}
        >
          Freelancers
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
            <h2 className="section-title">Active Gig Postings</h2>
            <button 
              onClick={() => setShowJobModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Post a Gig</span>
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
                        {job.pricing_type === 'fixed' || job.pricing_type === 'hourly'
                          ? `$${(job.budget_min ?? job.budget_max)?.toLocaleString()}${
                              job.budget_max && job.budget_min && job.budget_max !== job.budget_min
                                ? ` - $${job.budget_max.toLocaleString()}` : ''
                            }${job.pricing_type === 'hourly' ? '/hr' : ''}`
                          : `$${job.salary_min?.toLocaleString()} - $${job.salary_max?.toLocaleString()}`}
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
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setBidsJobId(bidsJobId === job.id ? null : job.id)}
                      className="flex items-center gap-1 text-sm font-medium text-[#0A66C2] hover:underline"
                    >
                      <HandCoins className="w-4 h-4" />
                      Bids
                      <ChevronDown className={`w-3 h-3 transition-transform ${bidsJobId === job.id ? 'rotate-180' : ''}`} />
                    </button>
                    <span className={`badge ${
                      job.status === 'active' ? 'badge-success' : 'badge-secondary'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {bidsJobId === job.id && <GigBidsPanel jobId={job.id} />}
              </motion.div>
            ))}
            
            {jobs.length === 0 && (
              <div className="text-center py-12 card">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active gigs. Post your first gig!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div>
          <h2 className="section-title mb-4">Matched Freelancers</h2>
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
                <p className="text-gray-500">No freelancers yet. Post gigs to get matches!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <h2 className="section-title mb-4">Gig Analytics</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-[#666666] mb-1">Total Gigs Posted</p>
              <p className="text-3xl font-bold text-[#191919]">{stats?.stats?.jobs ?? jobs.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-[#666666] mb-1">Interested Freelancers</p>
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
              <h3 className="font-semibold text-[#191919] mb-3">Recent Freelancer Activity</h3>
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
              <h2 className="text-xl font-bold text-[#191919]">Post a Gig</h2>
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

// Bids on a single gig — expandable panel under each job card. Lets the gig
// owner review freelancer offers and accept/decline them (Gigly flow).
function GigBidsPanel({ jobId }: { jobId: string }) {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = async () => {
    try {
      const res = await api.get(`/bids/gig/${jobId}`);
      setBids(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const decideBid = async (bidId: string, status: 'accepted' | 'declined') => {
    try {
      await api.patch(`/bids/${bidId}/status`, { status });
      toast.success(status === 'accepted' ? 'Bid accepted!' : 'Bid declined');
      fetchBids();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update bid');
    }
  };

  if (loading) {
    return <div className="mt-4 pt-4 border-t border-[#E0E0E0] text-sm text-[#8C8C8C]">Loading bids…</div>;
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#E0E0E0]">
      {bids.length === 0 ? (
        <p className="text-sm text-[#8C8C8C]">No bids on this gig yet.</p>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => (
            <div key={bid.id} className="flex items-start justify-between gap-3 bg-[#F9FAFB] rounded-lg p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#191919]">
                  {bid.first_name} {bid.last_name}
                  {bid.title ? <span className="font-normal text-[#666666]"> · {bid.title}</span> : null}
                </p>
                <p className="text-sm text-[#191919] mt-0.5">
                  ${Number(bid.amount).toLocaleString()}
                  {bid.pricing_type === 'hourly' ? '/hr' : ' fixed'}
                  {bid.estimated_duration ? ` · ${bid.estimated_duration}` : ''}
                </p>
                {bid.message && (
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2">{bid.message}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {bid.status === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decideBid(bid.id, 'accepted')}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => decideBid(bid.id, 'declined')}
                      className="px-3 py-1.5 text-xs font-medium text-[#666666] bg-white border border-[#E0E0E0] hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className={`badge ${
                    bid.status === 'accepted' ? 'badge-success' : 'badge-secondary'
                  }`}>
                    {bid.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Gig/Job Form Component — gig-first (fixed or hourly price point), with
// "Salaried role" kept as a legacy option.
function JobForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    pricing_type: 'fixed',
    budget_min: '',
    budget_max: '',
    deadline: '',
    estimated_duration: '',
    salary_min: '',
    salary_max: '',
    location: '',
    remote_allowed: true,
    employment_type: 'contract',
    experience_level: 'mid'
  });

  const isGig = formData.pricing_type !== 'salary';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      requirements: formData.requirements.split('\n').filter(r => r.trim()),
      budget_min: isGig && formData.budget_min ? parseInt(formData.budget_min) : undefined,
      budget_max: isGig && formData.budget_max ? parseInt(formData.budget_max) : undefined,
      deadline: isGig && formData.deadline ? formData.deadline : undefined,
      estimated_duration: isGig && formData.estimated_duration ? formData.estimated_duration : undefined,
      salary_min: !isGig && formData.salary_min ? parseInt(formData.salary_min) : undefined,
      salary_max: !isGig && formData.salary_max ? parseInt(formData.salary_max) : undefined,
      employment_type: isGig ? 'contract' : formData.employment_type,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Gig Title</label>
        <input
          type="text"
          required
          className="input-field"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="e.g. Build a landing page in React"
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
          placeholder="What needs to be done, what's included, what does 'done' look like…"
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

      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Pricing</label>
        <select
          className="input-field"
          value={formData.pricing_type}
          onChange={(e) => setFormData({...formData, pricing_type: e.target.value})}
        >
          <option value="fixed">Fixed price gig</option>
          <option value="hourly">Hourly gig</option>
          <option value="salary">Salaried role</option>
        </select>
      </div>

      {isGig ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666666] mb-1">
                Budget {formData.pricing_type === 'hourly' ? '($/hr, low)' : '(low)'}
              </label>
              <input
                type="number"
                required
                min="1"
                className="input-field"
                value={formData.budget_min}
                onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                placeholder={formData.pricing_type === 'hourly' ? '40' : '500'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666666] mb-1">
                Budget {formData.pricing_type === 'hourly' ? '($/hr, high)' : '(high)'}
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={formData.budget_max}
                onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                placeholder={formData.pricing_type === 'hourly' ? '80' : '1500'}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666666] mb-1">Deadline (optional)</label>
              <input
                type="date"
                className="input-field"
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666666] mb-1">Estimated time (optional)</label>
              <input
                type="text"
                className="input-field"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})}
                placeholder="e.g. 2 weeks"
              />
            </div>
          </div>
        </>
      ) : (
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
      )}

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
          Post Gig
        </button>
      </div>
    </form>
  );
}

export default RecruiterDashboard;