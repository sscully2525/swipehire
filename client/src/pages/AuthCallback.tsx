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
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    if (error) {
      toast.error('LinkedIn sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    if (!accessToken || !refreshToken) {
      navigate('/login');
      return;
    }

    // Fetch user info with the new token
    api.get('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
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
