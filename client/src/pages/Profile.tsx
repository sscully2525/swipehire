import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, GraduationCap, Plus, Edit2, Camera, FileText,
  ExternalLink, MapPin
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
  useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile-enhanced/full');
      setProfile(response.data);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
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
          <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
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
              <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
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
              <a href="#" className="text-[#0A66C2] font-medium hover:underline">
                Contact info
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-[#666666]">
              {workExperience.length > 0 ? workExperience[0].company_name : 'Add experience'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-4">
            <button className="btn-primary">
              Open to
            </button>
            <button className="btn-secondary">
              Add profile section
            </button>
            <button className="btn-ghost">
              More
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
              <button className="p-2 hover:bg-gray-100 rounded-full">
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
              <button className="p-2 hover:bg-gray-100 rounded-full">
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
                <p className="text-gray-400 italic">No experience added yet</p>
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
              <button className="p-2 hover:bg-gray-100 rounded-full">
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
                <p className="text-gray-400 italic">No education added yet</p>
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
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(userData?.skills || []).map((skill: string) => (
                <span key={skill} className="badge-primary">
                  {skill}
                </span>
              ))}
              {(!userData?.skills || userData.skills.length === 0) && (
                <p className="text-gray-400 italic">No skills added yet</p>
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
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#666666]">Profile views</span>
              <span className="text-lg font-bold text-[#0A66C2]">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#666666]">Post impressions</span>
              <span className="text-lg font-bold text-[#0A66C2]">0</span>
            </div>
          </motion.div>

          {/* Links Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-4"
          >
            <h3 className="font-semibold text-[#191919] mb-3">Links</h3>
            <div className="space-y-2">
              {userData?.linkedin_url && (
                <a href={userData.linkedin_url} target="_blank" rel="noopener noreferrer" 
                   className="flex items-center text-[#0A66C2] hover:underline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              )}
              {userData?.github_url && (
                <a href={userData.github_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center text-[#0A66C2] hover:underline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  GitHub
                </a>
              )}
              {userData?.portfolio_url && (
                <a href={userData.portfolio_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center text-[#0A66C2] hover:underline">
                  <ExternalLink className="w-4 h-4 mr-2" />
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
                <p className="text-gray-400 text-sm italic">No links added</p>
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
    </div>
  );
}

export default Profile;