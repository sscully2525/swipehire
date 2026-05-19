import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';

const ACCOUNTS = [
  { email: 'sean@swipehire.com',    label: 'Sean',    role: 'Admin',     emoji: '👑', color: 'bg-purple-500' },
  { email: 'recruiter@test.com',    label: 'Alex',    role: 'Recruiter', emoji: '🏢', color: 'bg-blue-500'   },
  { email: 'alice@test.com',        label: 'Alice',   role: 'Candidate', emoji: '👩‍💻', color: 'bg-green-500'  },
  { email: 'bob@test.com',          label: 'Bob',     role: 'Candidate', emoji: '👨‍🔬', color: 'bg-orange-500' },
  { email: 'carol@test.com',        label: 'Carol',   role: 'Candidate', emoji: '🎨', color: 'bg-pink-500'   },
];

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const switchTo = async (email: string) => {
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
      setOpen(false);
      if (user.role === 'recruiter') navigate('/recruiter/dashboard');
      else if (user.role === 'admin') navigate('/swipe');
      else navigate('/swipe');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Login failed — run make seed-test first');
    } finally {
      setLoading(null);
    }
  };

  const nukeAndSeed = async () => {
    if (!confirm('⚠️ This will wipe ALL users and reseed test data. Continue?')) return;
    setSeeding(true);
    try {
      const res = await api.post('/setup/nuke-and-seed');
      alert(`✅ Done!\n\n${res.data.accounts.map((a: any) => `${a.email} / ${a.password}`).join('\n')}`);
    } catch (err: any) {
      alert('Failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSeeding(false);
    }
  };

  const currentUser = useAuthStore.getState();

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-mono text-xs">
      {open && (
        <div className="mb-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <span className="text-gray-300 font-semibold tracking-wide">🧪 DEV PANEL</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">✕</button>
          </div>

          {/* Account switcher */}
          <div className="p-2 space-y-1">
            {ACCOUNTS.map((acct) => {
              const isCurrent = currentUser.user?.email === acct.email;
              return (
                <button
                  key={acct.email}
                  onClick={() => switchTo(acct.email)}
                  disabled={!!loading || isCurrent}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left
                    ${isCurrent
                      ? 'bg-gray-700 opacity-60 cursor-default'
                      : 'hover:bg-gray-700 cursor-pointer'
                    }`}
                >
                  <span className={`w-6 h-6 rounded-full ${acct.color} flex items-center justify-center text-base flex-shrink-0`}>
                    {loading === acct.email ? '⏳' : acct.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{acct.label}</div>
                    <div className="text-gray-400 text-[10px]">{acct.role}</div>
                  </div>
                  {isCurrent && <span className="text-green-400 text-[10px]">active</span>}
                  {!isCurrent && loading !== acct.email && (
                    <span className="text-gray-500">→</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 mx-2" />

          {/* Actions */}
          <div className="p-2 space-y-1">
            <button
              onClick={nukeAndSeed}
              disabled={seeding}
              className="w-full px-2 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800/80 text-red-300 text-left transition-all disabled:opacity-50"
            >
              {seeding ? '⏳ Seeding...' : '☢️  Nuke & reseed DB'}
            </button>
            <button
              onClick={() => navigate('/dev')}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-gray-700 text-gray-400 text-left transition-all"
            >
              📋 /dev login page
            </button>
          </div>

          <div className="px-3 py-2 bg-gray-800 border-t border-gray-700">
            <p className="text-gray-500 text-[10px]">Only visible in dev mode</p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-gray-900 border border-gray-600 shadow-xl flex items-center justify-center hover:bg-gray-800 transition-all hover:scale-110"
        title="Dev Panel"
      >
        🧪
      </button>
    </div>
  );
}
