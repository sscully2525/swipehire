import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  body?: object;
}

const ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/api/health', description: 'Health check' },
  { method: 'GET', path: '/api/setup/seed-sample-companies', description: 'Seed 50 sample companies' },
  { method: 'GET', path: '/api/setup/admin-stats', description: 'Get admin stats' },
  { method: 'GET', path: '/api/startups', description: 'Get jobs for swiping' },
  { method: 'GET', path: '/api/matches', description: 'Get user matches' },
  { method: 'GET', path: '/api/profile', description: 'Get user profile' },
  { method: 'GET', path: '/api/stripe/plans', description: 'Get subscription plans' },
  { method: 'GET', path: '/api/stripe/subscription', description: 'Get current subscription' },
  { method: 'GET', path: '/api/notifications', description: 'Get notifications' },
  { method: 'GET', path: '/api/notifications/unread-count', description: 'Get unread notification count' },
  { method: 'GET', path: '/api/swipes/remaining', description: 'Get remaining swipes' },
  { method: 'GET', path: '/api/recruiter/dashboard', description: 'Get recruiter dashboard' },
  { method: 'POST', path: '/api/setup/clear-swipes', description: 'Clear all swipes (test)', body: { userId: '' } },
  { method: 'POST', path: '/api/auth/login', description: 'Login', body: { email: '', password: '' } },
  { method: 'POST', path: '/api/auth/register', description: 'Register', body: { email: '', password: '', firstName: '', lastName: '' } },
  { method: 'POST', path: '/api/swipes', description: 'Create swipe', body: { jobId: '', direction: 'right' } },
  { method: 'POST', path: '/api/stripe/checkout', description: 'Create checkout session', body: { planId: 'pro' } },
];

function ApiTester() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Try to get token from localStorage (stored by auth store)
    const storedToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (storedToken) setToken(storedToken);
    if (selectedEndpoint.body) {
      setRequestBody(JSON.stringify(selectedEndpoint.body, null, 2));
    } else {
      setRequestBody('');
    }
  }, [selectedEndpoint]);

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const config: any = {
        method: selectedEndpoint.method,
        url: selectedEndpoint.path,
        headers: {}
      };

      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      if (selectedEndpoint.method !== 'GET' && requestBody) {
        config.data = JSON.parse(requestBody);
      }

      const result = await api(config);
      setResponse(result.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Request failed');
      setResponse(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Tester</h1>
        <p className="text-gray-600">Test all API endpoints</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Endpoint List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Endpoints</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {ENDPOINTS.map((endpoint, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedEndpoint(endpoint)}
                className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedEndpoint.path === endpoint.path ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {endpoint.method}
                  </span>
                  <span className="text-sm font-mono text-gray-700 truncate">{endpoint.path}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{endpoint.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Request/Response Panel */}
        <div className="space-y-4">
          {/* Auth Token */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Auth Token (Bearer)</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
          </div>

          {/* Request Body */}
          {selectedEndpoint.method !== 'GET' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Body (JSON)</label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleTest}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : `Send ${selectedEndpoint.method} Request`}
          </button>

          {/* Response */}
          {(response || error) && (
            <div className={`rounded-xl shadow-sm border p-4 ${error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <h3 className={`font-medium mb-2 ${error ? 'text-red-900' : 'text-green-900'}`}>
                {error ? 'Error' : 'Response'}
              </h3>
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(response || { error }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiTester;