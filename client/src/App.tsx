import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import api from './lib/api';

// Candidate Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import RecruiterSignup from './pages/RecruiterSignup';
import AuthCallback from './pages/AuthCallback';
import Onboarding from './pages/Onboarding';
import Swipe from './pages/Swipe';
import Matches from './pages/Matches';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Subscription from './pages/Subscription';
import ApiTester from './pages/ApiTester';
import Notifications from './pages/Notifications';
import Work from './pages/Work';
import Messages from './pages/Messages';
import Layout from './components/Layout';

// Recruiter Pages
import RecruiterLayout from './components/RecruiterLayout';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import Candidates from './pages/recruiter/Candidates';
import RecruiterMatches from './pages/recruiter/RecruiterMatches';
import RecruiterCompanies from './pages/recruiter/RecruiterCompanies';

function App() {
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Tokens live in the Zustand persisted store (`swipehire-auth`).
    const { accessToken, refreshToken } = useAuthStore.getState();
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/me');
      const me = response.data;
      setAuth(
        {
          id: me.id,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          role: me.role || 'candidate',
          title: me.title,
          dailySwipes: me.dailySwipes ?? 10,
          subscriptionTier: me.subscriptionTier ?? 'free',
          onboardingCompleted: me.onboardingCompleted ?? false,
        },
        accessToken,
        refreshToken || ''
      );
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin';
  const isCandidate = !isRecruiter;

  // Smart default redirect based on role
  const defaultRedirect = isAuthenticated
    ? isRecruiter
      ? '/recruiter/dashboard'
      : user?.onboardingCompleted
        ? '/swipe'
        : '/onboarding'
    : '/login';

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={defaultRedirect} /> : <Login />}
        />
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to={defaultRedirect} /> : <Signup />}
        />
        <Route
          path="/recruiter-signup"
          element={isAuthenticated ? <Navigate to={defaultRedirect} /> : <RecruiterSignup />}
        />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Onboarding (candidates only) */}
        <Route
          path="/onboarding"
          element={
            isAuthenticated && isCandidate && !user?.onboardingCompleted ? (
              <Onboarding />
            ) : (
              <Navigate to={defaultRedirect} />
            )
          }
        />

        {/* Candidate Routes */}
        <Route element={<Layout />}>
          <Route
            path="/swipe"
            element={
              !isAuthenticated ? <Navigate to="/login" /> :
              isRecruiter ? <Navigate to="/recruiter/dashboard" /> :
              !user?.onboardingCompleted ? <Navigate to="/onboarding" /> :
              <Swipe />
            }
          />
          <Route
            path="/matches"
            element={
              !isAuthenticated ? <Navigate to="/login" /> :
              isRecruiter ? <Navigate to="/recruiter/matches" /> :
              <Matches />
            }
          />
          <Route path="/profile" element={isAuthenticated && isCandidate ? <Profile /> : <Navigate to={defaultRedirect} />} />
          <Route path="/analytics" element={isAuthenticated && isCandidate ? <Analytics /> : <Navigate to={defaultRedirect} />} />
          <Route path="/subscription" element={isAuthenticated ? <Subscription /> : <Navigate to="/login" />} />
          <Route path="/api-tester" element={isAuthenticated ? <ApiTester /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={isAuthenticated ? <Notifications /> : <Navigate to="/login" />} />
          <Route path="/work" element={isAuthenticated && isCandidate ? <Work /> : <Navigate to={defaultRedirect} />} />
          <Route path="/messages" element={isAuthenticated && isCandidate ? <Messages /> : <Navigate to={defaultRedirect} />} />
        </Route>

        {/* Recruiter Routes */}
        <Route element={<RecruiterLayout />}>
          <Route
            path="/recruiter/dashboard"
            element={isAuthenticated && isRecruiter ? <RecruiterDashboard /> : <Navigate to={defaultRedirect} />}
          />
          <Route
            path="/recruiter/candidates"
            element={isAuthenticated && isRecruiter ? <Candidates /> : <Navigate to={defaultRedirect} />}
          />
          <Route
            path="/recruiter/matches"
            element={isAuthenticated && isRecruiter ? <RecruiterMatches /> : <Navigate to={defaultRedirect} />}
          />
          <Route
            path="/recruiter/companies"
            element={isAuthenticated && isRecruiter ? <RecruiterCompanies /> : <Navigate to={defaultRedirect} />}
          />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={defaultRedirect} />} />
        <Route path="*" element={<Navigate to={defaultRedirect} />} />
      </Routes>
    </>
  );
}

export default App;
