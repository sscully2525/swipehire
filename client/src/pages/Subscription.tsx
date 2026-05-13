import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Check, Sparkles, Zap, Crown, X } from 'lucide-react';

interface Plan {
  name: string;
  price: number;
  swipeLimit: number;
  features: string[];
}

const COMPARISON_FEATURES = [
  'Daily job swipes',
  'Real-time messaging',
  'AI match scoring',
  'Analytics dashboard',
  'Profile visibility boost',
  'Priority support',
];

const PLAN_FEATURE_VALUES: Record<string, (string | boolean | null)[]> = {
  free:      ['10/day',    true,  true,  false, false, false],
  pro:       ['50/day',    true,  true,  true,  true,  false],
  unlimited: ['Unlimited', true,  true,  true,  true,  true],
};

function Subscription() {
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(false);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/stripe/plans');
      setPlans(response.data);
    } catch {
      toast.error('Failed to load subscription plans');
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await api.get('/payments/subscription');
      setCurrentPlan(response.data.tier);
    } catch {
      // Non-critical
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free' || planId === currentPlan) return;
    setLoading(true);
    try {
      const response = await api.post('/stripe/checkout', { planId, annual });
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

  const planOrder = ['free', 'pro', 'unlimited'];
  const orderedPlans = planOrder
    .filter((id) => plans[id])
    .map((id) => ({ id, ...plans[id] }));

  const planConfig: Record<string, {
    icon: React.ReactNode;
    gradient: string;
    badge: string | null;
    buttonClass: string;
  }> = {
    free: {
      icon: <Zap className="w-6 h-6 text-slate-500" />,
      gradient: 'from-slate-50 to-slate-100',
      badge: null,
      buttonClass: 'bg-slate-100 text-slate-500 cursor-not-allowed',
    },
    pro: {
      icon: <Sparkles className="w-6 h-6 text-violet-600" />,
      gradient: 'from-violet-50 to-purple-50',
      badge: 'Most Popular',
      buttonClass: 'bg-violet-600 text-white hover:bg-violet-700',
    },
    unlimited: {
      icon: <Crown className="w-6 h-6 text-amber-500" />,
      gradient: 'from-amber-50 to-yellow-50',
      badge: 'Best Value',
      buttonClass: 'bg-amber-500 text-white hover:bg-amber-600',
    },
  };

  const displayPrice = (plan: Plan) => {
    if (plan.price === 0) return { monthly: 0, display: 'Free' };
    const monthly = plan.price / 100;
    if (annual) {
      const discounted = monthly * 0.83;
      return { monthly: discounted, display: `$${discounted.toFixed(0)}/mo` };
    }
    return { monthly, display: `$${monthly.toFixed(0)}/mo` };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Choose Your Plan</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Unlock more opportunities and accelerate your job search with a plan that fits you.
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm font-medium ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <motion.span
              animate={{ x: annual ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm block"
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
            Annual
            <span className="ml-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              Save 17%
            </span>
          </span>
        </div>
      </motion.div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {orderedPlans.map((plan, i) => {
          const cfg = planConfig[plan.id] || planConfig.free;
          const price = displayPrice(plan);
          const isCurrent = currentPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border-2 p-6 ${
                isCurrent ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200'
              } bg-gradient-to-b ${cfg.gradient}`}
            >
              {cfg.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 text-white whitespace-nowrap">
                    {cfg.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">{cfg.icon}</div>
                {isCurrent && (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>

              <div className="mb-5">
                {plan.price === 0 ? (
                  <span className="text-4xl font-bold text-slate-900">Free</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-slate-900">${price.monthly.toFixed(0)}</span>
                    <span className="text-slate-400 text-sm">/mo{annual ? ' billed annually' : ''}</span>
                  </>
                )}
              </div>

              <div className="mb-5 py-3 px-4 bg-white/60 rounded-xl">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Daily Swipes</p>
                <p className="text-2xl font-bold text-slate-900">
                  {plan.swipeLimit === 999999 ? 'Unlimited' : plan.swipeLimit}
                </p>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features?.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading || isCurrent || plan.id === 'free'}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                  isCurrent || plan.id === 'free'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : cfg.buttonClass
                }`}
              >
                {loading ? 'Loading…' : isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Free Forever' : 'Upgrade'}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Feature Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-6 py-3 font-medium text-slate-500 w-1/2">Feature</th>
                {planOrder.filter((id) => plans[id]).map((id) => (
                  <th key={id} className="text-center px-4 py-3 font-semibold text-slate-800 capitalize">{id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((feature, fi) => (
                <tr key={fi} className="border-t border-slate-100">
                  <td className="px-6 py-3 text-slate-700">{feature}</td>
                  {planOrder.filter((id) => plans[id]).map((id) => {
                    const val = PLAN_FEATURE_VALUES[id]?.[fi];
                    return (
                      <td key={id} className="text-center px-4 py-3">
                        {typeof val === 'boolean' ? (
                          val
                            ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            : <X className="w-4 h-4 text-slate-300 mx-auto" />
                        ) : (
                          <span className="font-medium text-slate-800">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <p className="text-center text-xs text-slate-400 mt-8">
        Cancel anytime. No hidden fees. Secure payments via Stripe.
      </p>
    </div>
  );
}

export default Subscription;
