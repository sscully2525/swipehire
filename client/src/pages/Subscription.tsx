import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  swipeLimit: number;
  features: string[];
}

function Subscription() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/stripe/plans');
      setPlans(response.data);
    } catch (err) {
      console.error('Failed to fetch plans');
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await api.get('/stripe/subscription');
      setCurrentPlan(response.data.tier);
    } catch (err) {
      console.error('Failed to fetch subscription');
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;
    
    setLoading(true);
    try {
      const response = await api.post('/stripe/checkout', { planId });
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const planIcons: Record<string, React.ReactNode> = {
    free: <Zap className="w-8 h-8 text-gray-400" />,
    pro: <Sparkles className="w-8 h-8 text-purple-500" />,
    unlimited: <Crown className="w-8 h-8 text-yellow-500" />
  };

  const planColors: Record<string, string> = {
    free: 'border-gray-200 bg-white',
    pro: 'border-purple-200 bg-purple-50',
    unlimited: 'border-yellow-200 bg-yellow-50'
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Unlock more opportunities and features to accelerate your job search
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {Object.entries(plans).map(([planId, plan]) => (
          <motion.div
            key={planId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Object.keys(plans).indexOf(planId) * 0.1 }}
            className={`rounded-2xl border-2 p-6 ${planColors[planId]} ${
              currentPlan === planId ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                {planIcons[planId]}
              </div>
              {currentPlan === planId && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Current
                </span>
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">
                ${(plan.price / 100).toFixed(0)}
              </span>
              {plan.price > 0 && <span className="text-gray-500">/month</span>}
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Daily Swipes</p>
              <p className="text-2xl font-bold text-gray-900">
                {plan.swipeLimit === 999999 ? 'Unlimited' : plan.swipeLimit}
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features?.map((feature, idx) => (
                <li key={idx} className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(planId)}
              disabled={loading || currentPlan === planId}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                currentPlan === planId
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : planId === 'free'
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Loading...' : currentPlan === planId ? 'Current Plan' : planId === 'free' ? 'Free' : 'Upgrade'}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}

export default Subscription;