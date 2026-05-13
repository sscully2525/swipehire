import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';


const getPasswordStrength = (password: string) => {
  const checks = [password.length >= 10, /[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  if (score >= 5) return { score, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-700' };
  if (score >= 4) return { score, label: 'Good', color: 'bg-blue-500', text: 'text-blue-700' };
  if (score >= 3) return { score, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-700' };
  return { score, label: 'Weak', color: 'bg-red-500', text: 'text-red-700' };
};

function RecruiterSignup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordStrength.score < 4) {
      toast.error('Use a stronger password: 10+ chars and at least 3 of lower/upper/digit/symbol');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/auth/recruiter/signup', formData);
      const { accessToken, refreshToken, user } = response.data;
      setAuth(
        {
          ...user,
          role: 'recruiter',
          dailySwipes: user.dailySwipes ?? 0,
          subscriptionTier: user.subscriptionTier ?? 'free',
          onboardingCompleted: true,
        },
        accessToken,
        refreshToken
      );
      toast.success('Company account created!');
      navigate('/recruiter/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center"
          >
            <span className="text-3xl">🏢</span>
          </motion.div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Post jobs & hire talent</h2>
          <p className="mt-2 text-sm text-gray-600">Create your company account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company name</label>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Acme Inc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First name</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last name</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Work email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="10+ chars, mix upper/lower, number or symbol"
              />
              {formData.password && (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${Math.min(100, passwordStrength.score * 20)}%` }} />
                  </div>
                  <p className={`mt-1 text-xs font-medium ${passwordStrength.text}`}>
                    {passwordStrength.label} password — required for hiring accounts.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              'Create company account'
            )}
          </button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Looking for a job?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Candidate sign up
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default RecruiterSignup;
