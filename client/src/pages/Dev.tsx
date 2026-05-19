import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';

const ACCOUNTS = [
  {
    email: 'sean@swipehire.com',
    label: 'Sean Scully',
    role: 'Admin',
    emoji: '👑',
    password: 'admin12345',
    gradient: 'from-purple-600 to-indigo-600',
    description: 'Full admin access, all features',
  },
  {
    email: 'recruiter@test.com',
    label: 'Alex Recruiter',
    role: 'Recruiter',
    emoji: '🏢',
    password: 'test123456',
    gradient: 'from-blue-600 to-cyan-600',
    description: 'SwipeHire Labs — 3 jobs posted',
  },
  {
    email: 'alice@test.com',
    label: 'Alice Chen',
    role: 'Candidate',
    emoji: '👩‍💻',
    password: 'test123456',
    gradient: 'from-green-600 to-emerald-600',
    description: 'Full Stack Engineer · React, Node.js, AWS',
  },
  {
    email: 'bob@test.com',
    label: 'Bob Martinez',
    role: 'Candidate',
    emoji: '👨‍🔬',
    password: 'test123456',
    gradient: 'from-orange-600 to-amber-600',
    description: 'ML Engineer · Python, PyTorch, Kubernetes',
  },
  {
    email: 'carol@test.com',
    label: 'Carol Kim',
    role: 'Candidate',
    emoji: '🎨',
    password: 'test123456',
    gradient: 'from-pink-600 to-rose-600',
    description: 'Product Designer · Figma, React, Design Systems',
  },
];

export default function Dev() {
  const [loading, setLoading] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const loginAs = async (email: string, role: string) => {
    setLoading(email);
    try {
      const res = await api.post('/setup/dev-login', { email });
      const { accessToken, refreshToken, user } = res.data;
      setAuth(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          title: user.title,
          dailySwipes: user.dailySwipes ?? 10,
          subscriptionTier: user.subscriptionTier ?? 'free',
          onboardingCompleted: user.onboardingCompleted ?? true,
        },
        accessToken,
        refreshToken
      );
      if (role === 'Recruiter') navigate('/recruiter/dashboard');
      else navigate('/swipe');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed';
      setSeedResult(`❌ ${msg} — click "Nuke & Reseed" first`);
    } finally {
      setLoading(null);
    }
  };

  const nukeAndSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await api.post('/setup/nuke-and-seed');
      setSeedResult(`✅ Done! ${res.data.accounts.length} accounts created.`);
    } catch (err: any) {
      setSeedResult('❌ Failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🧪</span>
            <h1 className="text-3xl font-bold">Dev Login</h1>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-full font-mono">
              DEV ONLY
            </span>
          </div>
          <p className="text-gray-400">One-click login — no password needed. Not available in production.</p>
        </div>

        {/* Nuke & Reseed */}
        <div className="mb-8 p-4 bg-red-950/40 border border-red-800/50 rounded-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-red-300">☢️  Nuke &amp; Reseed Database</h2>
              <p className="text-sm text-red-400/80 mt-0.5">
                Wipes all users, recreates test accounts + demo companies. Run this first.
              </p>
              {seedResult && (
                <p className="text-sm mt-2 font-mono text-gray-300">{seedResult}</p>
              )}
            </div>
            <button
              onClick={nukeAndSeed}
              disabled={seeding}
              className="flex-shrink-0 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-xl font-medium transition-all"
            >
              {seeding ? 'Seeding...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Account cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Test Accounts</h2>
          {ACCOUNTS.map((acct) => (
            <div
              key={acct.email}
              className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-600 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${acct.gradient} flex items-center justify-center text-2xl flex-shrink-0`}>
                {acct.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{acct.label}</span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{acct.role}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{acct.description}</p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">
                  {acct.email} / <span className="text-gray-500">{acct.password}</span>
                </p>
              </div>
              <button
                onClick={() => loginAs(acct.email, acct.role)}
                disabled={!!loading}
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all bg-gradient-to-r ${acct.gradient}
                  hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {loading === acct.email ? '...' : 'Login →'}
              </button>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-8 p-4 bg-blue-950/30 border border-blue-800/30 rounded-2xl text-sm text-blue-300/80">
          <strong className="text-blue-300">💡 Testing both sides simultaneously:</strong>
          <br />
          Open this tab as Recruiter. Open a new Incognito window → localhost:3000/dev → login as a Candidate.
          Two browsers, two sessions — see both sides at once.
        </div>
      </div>
    </div>
  );
}
