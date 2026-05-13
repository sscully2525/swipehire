import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  mission?: string;
  stage: string;
  location?: string;
  size?: string;
  website?: string;
  logo_url?: string;
  verified: boolean;
  job_count: number;
  match_count: number;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  employment_type?: string;
  location?: string;
  remote_allowed: boolean;
  salary_min?: number;
  salary_max?: number;
  created_at: string;
}

const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Public'];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

function RecruiterCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyJobs, setCompanyJobs] = useState<Job[]>([]);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: '', description: '', mission: '', stage: 'Seed',
    location: '', size: '1-10', website: '',
  });

  const [jobForm, setJobForm] = useState({
    title: '', description: '', requirements: '', responsibilities: '',
    salaryMin: '', salaryMax: '', equityMin: '', equityMax: '',
    location: '', remoteAllowed: false, visaSponsorship: false,
    employmentType: 'full-time', techStack: '', experienceLevel: 'mid',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/recruiter/companies');
      setCompanies(res.data);
    } catch {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = async (company: Company) => {
    setSelectedCompany(company);
    try {
      const res = await api.get(`/recruiter/companies/${company.id}`);
      setCompanyJobs(res.data.jobs || []);
    } catch {
      setCompanyJobs([]);
    }
  };

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/recruiter/companies', companyForm);
      toast.success('Company created!');
      setShowCreateCompany(false);
      setCompanyForm({ name: '', description: '', mission: '', stage: 'Seed', location: '', size: '1-10', website: '' });
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSubmitting(true);
    try {
      await api.post(`/recruiter/companies/${selectedCompany.id}/jobs`, {
        ...jobForm,
        salaryMin: jobForm.salaryMin ? parseInt(jobForm.salaryMin) : null,
        salaryMax: jobForm.salaryMax ? parseInt(jobForm.salaryMax) : null,
        equityMin: jobForm.equityMin ? parseFloat(jobForm.equityMin) : null,
        equityMax: jobForm.equityMax ? parseFloat(jobForm.equityMax) : null,
        techStack: jobForm.techStack.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Job posting created!');
      setShowCreateJob(false);
      setJobForm({
        title: '', description: '', requirements: '', responsibilities: '',
        salaryMin: '', salaryMax: '', equityMin: '', equityMax: '',
        location: '', remoteAllowed: false, visaSponsorship: false,
        employmentType: 'full-time', techStack: '', experienceLevel: 'mid',
      });
      selectCompany(selectedCompany);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <button
          onClick={() => setShowCreateCompany(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Company
        </button>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Company List */}
        <div className="md:col-span-2 space-y-3">
          {companies.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-3">🏢</div>
              <p className="font-medium text-gray-600">No companies yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first company to start posting jobs</p>
              <button
                onClick={() => setShowCreateCompany(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700"
              >
                Add Company
              </button>
            </div>
          ) : (
            companies.map((company) => (
              <motion.button
                key={company.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => selectCompany(company)}
                className={`w-full text-left bg-white rounded-xl shadow-sm border-2 p-4 transition-all ${
                  selectedCompany?.id === company.id
                    ? 'border-indigo-500 ring-2 ring-indigo-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {company.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 truncate">{company.name}</span>
                      {company.verified && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{company.stage}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{company.job_count} jobs</span>
                      <span className="text-xs text-gray-400">{company.match_count} matches</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* Company Detail */}
        <div className="md:col-span-3">
          {selectedCompany ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Company Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                      {selectedCompany.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">{selectedCompany.stage}</span>
                        {selectedCompany.location && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-sm text-gray-500">{selectedCompany.location}</span>
                          </>
                        )}
                        {selectedCompany.size && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-sm text-gray-500">{selectedCompany.size} employees</span>
                          </>
                        )}
                      </div>
                      {selectedCompany.website && (
                        <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:underline mt-1 block">
                          {selectedCompany.website}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!selectedCompany.verified && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Unverified</span>
                    )}
                  </div>
                </div>

                {selectedCompany.description && (
                  <p className="mt-4 text-sm text-gray-600">{selectedCompany.description}</p>
                )}

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{selectedCompany.job_count}</p>
                    <p className="text-xs text-gray-500">Active Jobs</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{selectedCompany.match_count}</p>
                    <p className="text-xs text-gray-500">Total Matches</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{companyJobs.filter(j => j.status === 'active').length}</p>
                    <p className="text-xs text-gray-500">Open Roles</p>
                  </div>
                </div>
              </div>

              {/* Jobs */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Job Postings</h3>
                  <button
                    onClick={() => setShowCreateJob(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Post Job
                  </button>
                </div>

                {companyJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No jobs posted yet</p>
                    <button
                      onClick={() => setShowCreateJob(true)}
                      className="mt-3 text-indigo-600 text-sm hover:underline"
                    >
                      Post your first job
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companyJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">{job.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {job.employment_type && (
                              <span className="text-xs text-gray-500">{job.employment_type}</span>
                            )}
                            {job.remote_allowed && (
                              <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Remote</span>
                            )}
                            {job.salary_min && job.salary_max && (
                              <span className="text-xs text-gray-500">
                                ${(job.salary_min / 1000).toFixed(0)}k–${(job.salary_max / 1000).toFixed(0)}k
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 h-80 items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-3">🏢</div>
                <p className="font-medium">Select a company to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Company Modal */}
      <AnimatePresence>
        {showCreateCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCreateCompany(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Company</h2>
                <button onClick={() => setShowCreateCompany(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={createCompany} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company name *</label>
                  <input type="text" required value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={companyForm.description}
                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mission</label>
                  <textarea rows={2} value={companyForm.mission}
                    onChange={(e) => setCompanyForm({ ...companyForm, mission: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                    <select value={companyForm.stage}
                      onChange={(e) => setCompanyForm({ ...companyForm, stage: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <select value={companyForm.size}
                      onChange={(e) => setCompanyForm({ ...companyForm, size: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={companyForm.location}
                    onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input type="url" value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    placeholder="https://company.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateCompany(false)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {submitting ? 'Creating...' : 'Create Company'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Job Modal */}
      <AnimatePresence>
        {showCreateJob && selectedCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCreateJob(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Post a Job at {selectedCompany.name}</h2>
                <button onClick={() => setShowCreateJob(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={createJob} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job title *</label>
                  <input type="text" required value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="Senior Software Engineer"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea rows={4} required value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Describe the role, responsibilities, and ideal candidate..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                  <textarea rows={3} value={jobForm.requirements}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    placeholder="List the required qualifications..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary ($)</label>
                    <input type="number" value={jobForm.salaryMin}
                      onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                      placeholder="80000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary ($)</label>
                    <input type="number" value={jobForm.salaryMax}
                      onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                      placeholder="120000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                    <select value={jobForm.employmentType}
                      onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                    <select value={jobForm.experienceLevel}
                      onChange={(e) => setJobForm({ ...jobForm, experienceLevel: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="entry">Entry level</option>
                      <option value="mid">Mid level</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead / Staff</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack (comma-separated)</label>
                  <input type="text" value={jobForm.techStack}
                    onChange={(e) => setJobForm({ ...jobForm, techStack: e.target.value })}
                    placeholder="React, TypeScript, Node.js, PostgreSQL"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={jobForm.remoteAllowed}
                      onChange={(e) => setJobForm({ ...jobForm, remoteAllowed: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-gray-700">Remote allowed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={jobForm.visaSponsorship}
                      onChange={(e) => setJobForm({ ...jobForm, visaSponsorship: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-gray-700">Visa sponsorship</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateJob(false)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {submitting ? 'Posting...' : 'Post Job'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RecruiterCompanies;
