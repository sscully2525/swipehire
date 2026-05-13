import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';

const steps = [
  {
    id: 'basics',
    title: 'Basic Info',
    description: 'Tell us about yourself',
  },
  {
    id: 'experience',
    title: 'Experience',
    description: 'Your background and skills',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'What are you looking for?',
  },
];

function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    bio: '',
    location: '',
    yearsExperience: '',
    skills: [] as string[],
    preferredSalaryMin: '',
    preferredSalaryMax: '',
    remotePreference: 'hybrid',
  });
  const updateUser = useAuthStore((state) => state.updateUser);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      await api.put('/profile', {
        title: formData.title,
        bio: formData.bio,
        location: formData.location,
        yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : undefined,
        skills: formData.skills,
        preferredSalaryMin: formData.preferredSalaryMin ? parseInt(formData.preferredSalaryMin) : undefined,
        preferredSalaryMax: formData.preferredSalaryMax ? parseInt(formData.preferredSalaryMax) : undefined,
        remotePreference: formData.remotePreference,
        onboardingCompleted: true,
      });
      
      updateUser({ onboardingCompleted: true });
      toast.success('Welcome to SwipeHire!');
      window.location.href = '/swipe';
    } catch {
      toast.error('Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Professional Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. San Francisco, CA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell startups about yourself..."
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="number"
                value={formData.yearsExperience}
                onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center space-x-1"
                  >
                    <span>{skill}</span>
                    <button onClick={() => removeSkill(skill)} className="text-blue-500 hover:text-blue-700">×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add a skill and press Enter"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addSkill((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
                <input
                  type="number"
                  value={formData.preferredSalaryMin}
                  onChange={(e) => setFormData({ ...formData, preferredSalaryMin: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="120000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
                <input
                  type="number"
                  value={formData.preferredSalaryMax}
                  onChange={(e) => setFormData({ ...formData, preferredSalaryMax: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="200000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remote Preference</label>
              <div className="grid grid-cols-3 gap-3">
                {['remote', 'hybrid', 'onsite'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, remotePreference: option })}
                    className={`py-3 px-4 rounded-xl border-2 font-medium capitalize transition-all ${
                      formData.remotePreference === option
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8"
      >
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span className="text-xs mt-1 text-gray-500">{step.title}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{steps[currentStep].title}</h2>
          <p className="text-gray-600">{steps[currentStep].description}</p>
        </div>

        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-3 text-gray-600 font-medium disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default Onboarding;