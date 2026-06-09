import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';

function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      toast.error('LinkedIn sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    if (!code) {
      navigate('/login');
      return;
    }

    // The server redirects here with a short-lived one-time code instead of
    // raw tokens (keeps JWTs out of the URL/history). Exchange it, then load
    // the user.
    let accessToken = '';
    let refreshToken = '';
    api.post('/auth/oauth/exchange', { code })
      .then((res) => {
        accessToken = res.data.accessToken;
        refreshToken = res.data.refreshToken;
        return api.get('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
      })
      .then((res) => {
        const user = res.data;
        setAuth(
          {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role || 'candidate',
            title: user.title,
            dailySwipes: user.dailySwipes ?? 10,
            subscriptionTier: user.subscriptionTier ?? 'free',
            onboardingCompleted: user.onboardingCompleted ?? false,
          },
          accessToken,
          refreshToken
        );
        toast.success('Signed in with LinkedIn!');
        if (user.role === 'recruiter') {
          navigate('/recruiter/dashboard');
        } else {
          navigate(user.onboardingCompleted ? '/swipe' : '/onboarding');
        }
      })
      .catch(() => {
        toast.error('Failed to complete sign-in');
        navigate('/login');
      });
  }, [navigate, params, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
