import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';

type AccountType = 'candidate' | 'recruiter';

const getPasswordStrength = (password: string) => {
  const checks = [
    password.length >= 10,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  if (score >= 5) return { score, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-700' };
  if (score >= 4) return { score, label: 'Good', color: 'bg-blue-500', text: 'text-blue-700' };
  if (score >= 3) return { score, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-700' };
  return { score, label: 'Weak', color: 'bg-red-500', text: 'text-red-700' };
};


function Signup() {
  const [accountType, setAccountType] = useState<AccountType>('candidate');
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
    if (accountType === 'recruiter' && !formData.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setIsLoading(true);
    try {
      const endpoint = accountType === 'recruiter' ? '/auth/recruiter/signup' : '/auth/signup';
      const payload = accountType === 'recruiter'
        ? formData
        : { firstName: formData.firstName, lastName: formData.lastName, email: formData.email, password: formData.password };

      const response = await api.post(endpoint, payload);
      const { accessToken, refreshToken, user } = response.data;

      setAuth(
        {
          ...user,
          role: accountType,
          dailySwipes: user.dailySwipes ?? 10,
          subscriptionTier: user.subscriptionTier ?? 'free',
          onboardingCompleted: accountType === 'recruiter' ? true : (user.onboardingCompleted ?? false),
        },
        accessToken,
        refreshToken
      );

      toast.success(accountType === 'recruiter' ? 'Company account created!' : 'Account created!');
      navigate(accountType === 'recruiter' ? '/recruiter/dashboard' : '/onboarding');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInSignup = () => {
    window.location.href = '/api/auth/linkedin';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
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
            className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center"
          >
            <span className="text-3xl">⚡</span>
          </motion.div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Create your account</h2>
        </div>

        {/* Account type toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setAccountType('candidate')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              accountType === 'candidate'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Looking for a job
          </button>
          <button
            type="button"
            onClick={() => setAccountType('recruiter')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              accountType === 'recruiter'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            I'm hiring
          </button>
        </div>

        {/* LinkedIn OAuth */}
        <button
          type="button"
          onClick={handleLinkedInSignup}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Continue with LinkedIn
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <AnimatePresence>
            {accountType === 'recruiter' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700">Company name</label>
                <input
                  type="text"
                  name="companyName"
                  required={accountType === 'recruiter'}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Acme Inc."
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First name</label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
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
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="10+ chars, mix upper/lower, number or symbol"
            />
            {formData.password && (
              <div className="mt-2">
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${Math.min(100, passwordStrength.score * 20)}%` }} />
                </div>
                <p className={`mt-1 text-xs font-medium ${passwordStrength.text}`}>
                  {passwordStrength.label} password — use 10+ chars and at least 3 of lowercase, uppercase, digits, symbols.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              accountType === 'recruiter'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500'
            }`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : accountType === 'recruiter' ? (
              'Create company account'
            ) : (
              'Create account'
            )}
          </button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              By signing up you agree to the{' '}
              <Link to="/terms" className="underline hover:text-gray-600">Terms of Service</Link>.
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default Signup;
