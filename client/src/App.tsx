import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import api from './lib/api';

// Candidate Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Swipe from './pages/Swipe';
import Matches from './pages/Matches';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Subscription from './pages/Subscription';
import Layout from './components/Layout';

// Recruiter Pages
import RecruiterLayout from './components/RecruiterLayout';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import Candidates from './pages/recruiter/Candidates';

function App() {
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/profile');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setAuth({ ...storedUser, ...response.data }, token, '');
    } catch (err) {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/swipe" /> : <Login />} 
        />
        <Route 
          path="/signup" 
          element={isAuthenticated ? <Navigate to="/swipe" /> : <Signup />} 
        />
        
        {/* Onboarding */}
        <Route 
          path="/onboarding" 
          element={
            isAuthenticated && !user?.onboardingCompleted ? (
              <Onboarding />
            ) : (
              <Navigate to="/swipe" />
            )
          } 
        />
        
        {/* Candidate Routes */}
        <Route element={<Layout />}>
          <Route 
            path="/swipe" 
            element={
              isAuthenticated ? (
                user?.onboardingCompleted ? <Swipe /> : <Navigate to="/onboarding" />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/matches" 
            element={isAuthenticated ? <Matches /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/profile" 
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/analytics" 
            element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/subscription" 
            element={isAuthenticated ? <Subscription /> : <Navigate to="/login" />} 
          />
        </Route>

        {/* Recruiter Routes */}
        <Route element={<RecruiterLayout />}>
          <Route 
            path="/recruiter/dashboard" 
            element={isAuthenticated ? <RecruiterDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/recruiter/candidates" 
            element={isAuthenticated ? <Candidates /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/recruiter/matches" 
            element={isAuthenticated ? <div>Matches Page</div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/recruiter/companies" 
            element={isAuthenticated ? <div>Companies Page</div> : <Navigate to="/login" />} 
          />
        </Route>
        
        {/* Default redirect */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/swipe" : "/login"} />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/swipe" : "/login"} />} 
        />
      </Routes>
    </>
  );
}

export default App;