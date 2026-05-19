import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import api from './lib/api';
import ErrorBoundary from './components/ErrorBoundary';

// Layout shells are small and used on every authenticated page —
// import them eagerly to avoid an extra round trip after login.
import Layout from './components/Layout';
import RecruiterLayout from './components/RecruiterLayout';

// Dev-only tools — tree-shaken out of production builds by Vite
const DevPanel = import.meta.env.DEV ? lazy(() => import('./components/DevPanel')) : null;
const Dev = import.meta.env.DEV ? lazy(() => import('./pages/Dev')) : null;

// Code-split each page route so the initial bundle stays small.
// Previously this file imported every page eagerly, producing an
// 882KB single-chunk bundle (audit 🟠).
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const RecruiterSignup = lazy(() => import('./pages/RecruiterSignup'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Swipe = lazy(() => import('./pages/Swipe'));
const Matches = lazy(() => import('./pages/Matches'));
const Profile = lazy(() => import('./pages/Profile'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Subscription = lazy(() => import('./pages/Subscription'));
const ApiTester = import.meta.env.DEV ? lazy(() => import('./pages/ApiTester')) : null;
const Notifications = lazy(() => import('./pages/Notifications'));
const Work = lazy(() => import('./pages/Work'));
const Messages = lazy(() => import('./pages/Messages'));
const RecruiterDashboard = lazy(() => import('./pages/recruiter/Dashboard'));
const Candidates = lazy(() => import('./pages/recruiter/Candidates'));
const RecruiterMatches = lazy(() => import('./pages/recruiter/RecruiterMatches'));
const RecruiterCompanies = lazy(() => import('./pages/recruiter/RecruiterCompanies'));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    checkAuth();
    // setAuth/clearAuth come from a Zustand store and are stable references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <LoadingSpinner />;

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
    <ErrorBoundary>
      <Toaster position="top-center" />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Dev-only quick login page */}
          {import.meta.env.DEV && Dev && <Route path="/dev" element={<Dev />} />}

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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
            <Route path="/api-tester" element={import.meta.env.DEV && ApiTester && isAuthenticated && user?.role === 'admin' ? <ApiTester /> : <Navigate to={defaultRedirect} />} />
            <Route path="/notifications" element={isAuthenticated ? <Notifications /> : <Navigate to="/login" />} />
            <Route path="/work" element={isAuthenticated && isCandidate ? <Work /> : <Navigate to={defaultRedirect} />} />
            <Route path="/messages" element={isAuthenticated && isCandidate ? <Messages /> : <Navigate to={defaultRedirect} />} />
          </Route>

          {/* Recruiter Routes — require authenticated user with the recruiter role. */}
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
      </Suspense>
      {/* Floating dev switcher — only rendered in Vite dev mode */}
      {import.meta.env.DEV && DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
    </ErrorBoundary>
  );
}

export default App;
