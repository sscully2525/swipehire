import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Briefcase, GraduationCap, Plus, Edit2, Camera, FileText,
  MapPin, X, Globe, Check
} from 'lucide-react';

interface WorkExperience {
  id: string;
  company_name: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  employment_type: string;
}

interface Education {
  id: string;
  school_name: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  gpa: number;
}

interface ProfileData {
  user: any;
  workExperience: WorkExperience[];
  education: Education[];
  honorsAwards: any[];
  certifications: any[];
  projects: any[];
  languages: any[];
  volunteerExperience: any[];
  publications: any[];
  skills: string[];
}

function Profile() {
  const { updateUser } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddSection, setShowAddSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [openToWork, setOpenToWork] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [showSkillInput, setShowSkillInput] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile-enhanced/full');
      setProfile(response.data);
      setEditForm(response.data.user || {});
      setOpenToWork(response.data.user?.open_to_work || false);
    } catch (err) {
      console.error('Failed to load profile', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpenToWork = async () => {
    const next = !openToWork;
    setOpenToWork(next);
    try {
      await api.put('/profile-enhanced/basic', { open_to_work: next });
      toast.success(next ? 'Open to work enabled' : 'Open to work disabled');
    } catch {
      setOpenToWork(!next);
      toast.error('Failed to update open to work status');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await api.put('/profile-enhanced/basic', editForm);
      toast.success('Profile updated');
      setShowEditModal(false);
      fetchProfile();
      if (updateUser) {
        updateUser(editForm);
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile');
    }
  };

  const handleAddSkill = async (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    try {
      await api.post('/profile-enhanced/skills', { skill: trimmed });
      toast.success('Skill added');
      setSkillInput('');
      setShowSkillInput(false);
      fetchProfile();
    } catch {
      toast.error('Failed to add skill');
    }
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(skillInput); }
    if (e.key === 'Escape') { setShowSkillInput(false); setSkillInput(''); }
  };

  const handleAddWorkExperience = async (data: any) => {
    try {
      await api.post('/profile-enhanced/work-experience', data);
      toast.success('Experience added');
      setShowAddSection(null);
      fetchProfile();
    } catch (err) {
      console.error('Failed to add work experience', err);
      toast.error('Failed to add experience');
    }
  };

  const handleAddEducation = async (data: any) => {
    try {
      await api.post('/profile-enhanced/education', data);
      toast.success('Education added');
      setShowAddSection(null);
      fetchProfile();
    } catch (err) {
      console.error('Failed to add education', err);
      toast.error('Failed to add education');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A66C2]"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-16">Failed to load profile</div>;
  }

  const { user: userData, workExperience, education } = profile;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Profile Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] overflow-hidden mb-4"
      >
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-[#0A66C2] to-[#0077B5] relative">
          <button
            onClick={() => { setEditForm(userData || {}); setShowEditModal(true); }}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            title="Edit cover image URL"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex justify-between items-start -mt-12 mb-4">
            <div className="relative">
              <div className="w-32 h-32 bg-white rounded-full p-1">
                <div className="w-full h-full bg-[#F3F2EF] rounded-full flex items-center justify-center border-4 border-white">
                  {userData?.avatar_url ? (
                    <img src={userData.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-[#0A66C2]">
                      {userData?.first_name?.[0]}{userData?.last_name?.[0]}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setEditForm(userData || {}); setShowEditModal(true); }}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                title="Edit avatar URL"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <button 
              onClick={() => {
                setEditForm(userData || {});
                setShowEditModal(true);
              }}
              className="btn-secondary flex items-center space-x-2 mt-16"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#191919]">
              {userData?.first_name} {userData?.last_name}
            </h1>
            <p className="text-lg text-[#666666]">{userData?.title || 'Add a headline'}</p>
            <div className="flex items-center text-sm text-[#8C8C8C] mt-1 space-x-4">
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {userData?.location || 'Add location'}
              </span>
              <button
                onClick={() => { setEditForm(userData || {}); setShowEditModal(true); }}
                className="text-[#0A66C2] font-medium hover:underline"
              >
                Contact info
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-[#666666]">
              {workExperience.length > 0 ? workExperience[0].company_name : 'Add experience'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-4">
            <button
              onClick={handleToggleOpenToWork}
              className={openToWork ? 'btn-primary' : 'btn-secondary'}
            >
              {openToWork ? '✓ Open to Work' : 'Open to Work'}
            </button>
            <button
              onClick={() => setShowAddSection('menu')}
              className="btn-secondary"
            >
              Add profile section
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-4">
          {/* About Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title">About</h2>
              <button 
                onClick={() => {
                  setEditForm(userData || {});
                  setShowEditModal(true);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-body">
              {userData?.bio || 'Add a summary to tell people about your experience, skills, and goals.'}
            </p>
          </motion.div>

          {/* Experience Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                Experience
              </h2>
              <button 
                onClick={() => setShowAddSection('experience')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-6">
              {workExperience.map((exp) => (
                <div key={exp.id} className="flex space-x-4">
                  <div className="w-12 h-12 bg-[#F3F2EF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#191919]">{exp.title}</h3>
                    <p className="text-[#666666]">{exp.company_name}</p>
                    <p className="text-sm text-[#8C8C8C]">
                      {new Date(exp.start_date).getFullYear()} - {exp.is_current ? 'Present' : new Date(exp.end_date).getFullYear()}
                    </p>
                    <p className="text-sm text-[#8C8C8C]">{exp.location}</p>
                    {exp.description && (
                      <p className="text-body mt-2">{exp.description}</p>
                    )}
                  </div>
                </div>
              ))}
              {workExperience.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-400 italic mb-2">No experience added yet</p>
                  <button 
                    onClick={() => setShowAddSection('experience')}
                    className="text-[#0A66C2] font-medium hover:underline"
                  >
                    Add experience
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Education Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title flex items-center">
                <GraduationCap className="w-5 h-5 mr-2" />
                Education
              </h2>
              <button 
                onClick={() => setShowAddSection('education')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-6">
              {education.map((edu) => (
                <div key={edu.id} className="flex space-x-4">
                  <div className="w-12 h-12 bg-[#F3F2EF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#191919]">{edu.school_name}</h3>
                    <p className="text-[#666666]">{edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}</p>
                    <p className="text-sm text-[#8C8C8C]">
                      {new Date(edu.start_date).getFullYear()} - {edu.is_current ? 'Present' : new Date(edu.end_date).getFullYear()}
                    </p>
                    {edu.gpa && <p className="text-sm text-[#8C8C8C]">GPA: {edu.gpa}</p>}
                  </div>
                </div>
              ))}
              {education.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-400 italic mb-2">No education added yet</p>
                  <button 
                    onClick={() => setShowAddSection('education')}
                    className="text-[#0A66C2] font-medium hover:underline"
                  >
                    Add education
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Skills Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title">Skills</h2>
              <button
                onClick={() => { setShowSkillInput(true); setTimeout(() => skillInputRef.current?.focus(), 50); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(userData?.skills || []).map((skill: string) => (
                <span key={skill} className="badge-primary">{skill}</span>
              ))}

              {/* Inline chip input */}
              {showSkillInput && (
                <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 border-2 border-blue-300 rounded-full">
                  <input
                    ref={skillInputRef}
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder="Type a skill…"
                    className="bg-transparent text-sm text-blue-900 placeholder-blue-400 outline-none w-28"
                  />
                  <button onClick={() => handleAddSkill(skillInput)} className="text-blue-600 hover:text-blue-800">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setShowSkillInput(false); setSkillInput(''); }} className="text-blue-400 hover:text-blue-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(!userData?.skills || userData.skills.length === 0) && !showSkillInput && (
                <div className="text-center py-4 w-full">
                  <p className="text-gray-400 italic mb-2">No skills added yet</p>
                  <button
                    onClick={() => { setShowSkillInput(true); setTimeout(() => skillInputRef.current?.focus(), 50); }}
                    className="text-[#0A66C2] font-medium hover:underline"
                  >
                    Add skills
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Stats Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-4"
          >
            <h3 className="font-semibold text-[#191919] mb-3">Analytics</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#666666]">Matches</span>
              <span className="text-lg font-bold text-[#0A66C2]">{profile?.user?.match_count || 0}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#666666]">Right swipes</span>
              <span className="text-lg font-bold text-[#0A66C2]">{profile?.user?.right_swipe_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#666666]">Skills listed</span>
              <span className="text-lg font-bold text-[#0A66C2]">{(userData?.skills || []).length}</span>
            </div>
          </motion.div>

          {/* Links Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-4"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-[#191919]">Links</h3>
              <button 
                onClick={() => {
                  setEditForm(userData || {});
                  setShowEditModal(true);
                }}
                className="text-sm text-[#0A66C2] hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="space-y-2">
              {userData?.linkedin_url && (
                <a href={userData.linkedin_url} target="_blank" rel="noopener noreferrer" 
                   className="flex items-center text-[#0A66C2] hover:underline">
                  <Globe className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              )}
              {userData?.github_url && (
                <a href={userData.github_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center text-[#0A66C2] hover:underline">
                  <Globe className="w-4 h-4 mr-2" />
                  GitHub
                </a>
              )}
              {userData?.portfolio_url && (
                <a href={userData.portfolio_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center text-[#0A66C2] hover:underline">
                  <Globe className="w-4 h-4 mr-2" />
                  Portfolio
                </a>
              )}
              {userData?.resume_url && (
                <a href={userData.resume_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center text-[#0A66C2] hover:underline">
                  <FileText className="w-4 h-4 mr-2" />
                  Resume
                </a>
              )}
              {!userData?.linkedin_url && !userData?.github_url && !userData?.portfolio_url && !userData?.resume_url && (
                <div className="text-center py-2">
                  <p className="text-gray-400 text-sm italic mb-2">No links added</p>
                  <button 
                    onClick={() => {
                      setEditForm(userData || {});
                      setShowEditModal(true);
                    }}
                    className="text-[#0A66C2] text-sm font-medium hover:underline"
                  >
                    Add links
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Subscription Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-4"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-[#666666]">Current Plan</span>
              <span className="badge-primary capitalize">{userData?.subscription_tier || 'Free'}</span>
            </div>
            <button 
              onClick={() => window.location.href = '/subscription'}
              className="w-full btn-primary"
            >
              Upgrade
            </button>
          </motion.div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#191919]">Edit Profile</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name || ''}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name || ''}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">Headline</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    className="input-field"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    className="input-field"
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">About</label>
                  <textarea
                    rows={4}
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    className="input-field"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editForm.linkedin_url || ''}
                    onChange={(e) => setEditForm({...editForm, linkedin_url: e.target.value})}
                    className="input-field"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={editForm.github_url || ''}
                    onChange={(e) => setEditForm({...editForm, github_url: e.target.value})}
                    className="input-field"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">Portfolio URL</label>
                  <input
                    type="url"
                    value={editForm.portfolio_url || ''}
                    onChange={(e) => setEditForm({...editForm, portfolio_url: e.target.value})}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">Resume URL</label>
                  <input
                    type="url"
                    value={editForm.resume_url || ''}
                    onChange={(e) => setEditForm({...editForm, resume_url: e.target.value})}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666666] mb-1">Avatar URL</label>
                  <input
                    type="url"
                    value={editForm.avatar_url || ''}
                    onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#E0E0E0] flex justify-end space-x-3">
                <button onClick={() => setShowEditModal(false)} className="btn-ghost">
                  Cancel
                </button>
                <button onClick={handleSaveProfile} className="btn-primary">
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Section Modal */}
      <AnimatePresence>
        {showAddSection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#191919]">
                  Add {showAddSection === 'experience' ? 'Experience' : showAddSection === 'education' ? 'Education' : 'Section'}
                </h2>
                <button onClick={() => setShowAddSection(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                {showAddSection === 'menu' && (
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowAddSection('experience')}
                      className="w-full text-left p-4 hover:bg-gray-50 rounded-lg flex items-center space-x-3"
                    >
                      <Briefcase className="w-5 h-5 text-[#0A66C2]" />
                      <div>
                        <p className="font-medium text-[#191919]">Experience</p>
                        <p className="text-sm text-[#666666]">Add a new position</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => setShowAddSection('education')}
                      className="w-full text-left p-4 hover:bg-gray-50 rounded-lg flex items-center space-x-3"
                    >
                      <GraduationCap className="w-5 h-5 text-[#0A66C2]" />
                      <div>
                        <p className="font-medium text-[#191919]">Education</p>
                        <p className="text-sm text-[#666666]">Add a school or degree</p>
                      </div>
                    </button>
                  </div>
                )}
                {showAddSection === 'experience' && (
                  <AddExperienceForm 
                    onSubmit={handleAddWorkExperience}
                    onCancel={() => setShowAddSection(null)}
                  />
                )}
                {showAddSection === 'education' && (
                  <AddEducationForm 
                    onSubmit={handleAddEducation}
                    onCancel={() => setShowAddSection(null)}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add Experience Form
function AddExperienceForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void, onCancel: () => void }) {
  const [form, setForm] = useState({
    companyName: '',
    title: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    employmentType: 'full-time'
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Company Name *</label>
        <input
          type="text"
          required
          value={form.companyName}
          onChange={(e) => setForm({...form, companyName: e.target.value})}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Title *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm({...form, title: e.target.value})}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Location</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm({...form, location: e.target.value})}
          className="input-field"
          placeholder="e.g. San Francisco, CA"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#666666] mb-1">Start Date *</label>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm({...form, startDate: e.target.value})}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#666666] mb-1">End Date</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({...form, endDate: e.target.value})}
            className="input-field"
            disabled={form.isCurrent}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isCurrent"
          checked={form.isCurrent}
          onChange={(e) => setForm({...form, isCurrent: e.target.checked})}
          className="w-4 h-4"
        />
        <label htmlFor="isCurrent" className="text-sm text-[#666666]">I currently work here</label>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
          className="input-field"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

// Add Education Form
function AddEducationForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void, onCancel: () => void }) {
  const [form, setForm] = useState({
    schoolName: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    gpa: ''
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">School Name *</label>
        <input
          type="text"
          required
          value={form.schoolName}
          onChange={(e) => setForm({...form, schoolName: e.target.value})}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Degree</label>
        <input
          type="text"
          value={form.degree}
          onChange={(e) => setForm({...form, degree: e.target.value})}
          className="input-field"
          placeholder="e.g. Bachelor of Science"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#666666] mb-1">Field of Study</label>
        <input
          type="text"
          value={form.fieldOfStudy}
          onChange={(e) => setForm({...form, fieldOfStudy: e.target.value})}
          className="input-field"
          placeholder="e.g. Computer Science"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#666666] mb-1">Start Date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({...form, startDate: e.target.value})}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#666666] mb-1">End Date</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({...form, endDate: e.target.value})}
            className="input-field"
            disabled={form.isCurrent}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isCurrentEdu"
          checked={form.isCurrent}
          onChange={(e) => setForm({...form, isCurrent: e.target.checked})}
          className="w-4 h-4"
        />
        <label htmlFor="isCurrentEdu" className="text-sm text-[#666666]">I currently study here</label>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

export default Profile;