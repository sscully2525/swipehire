import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HandCoins } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface BidModalProps {
  isOpen: boolean;
  gig: {
    id: string;
    title: string;
    startup_name: string;
    budget_min?: number;
    budget_max?: number;
    pricing_type?: string;
  } | null;
  onClose: () => void;
  onPlaced?: () => void;
}

/**
 * "Bid to commit" — the freelancer's offer on a gig. Swiping right says
 * "interested"; placing a bid puts a price on actually doing the work.
 */
function BidModal({ isOpen, gig, onClose, onPlaced }: BidModalProps) {
  const [amount, setAmount] = useState('');
  const [pricingType, setPricingType] = useState<'fixed' | 'hourly'>('fixed');
  const [duration, setDuration] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!gig) return null;

  const budgetHint =
    gig.budget_min || gig.budget_max
      ? `Client budget: $${(gig.budget_min ?? gig.budget_max)?.toLocaleString()}${
          gig.budget_max && gig.budget_min && gig.budget_max !== gig.budget_min
            ? `–$${gig.budget_max.toLocaleString()}`
            : ''
        }${gig.pricing_type === 'hourly' ? '/hr' : ''}`
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/bids', {
        jobId: gig.id,
        amount: parsed,
        pricingType,
        estimatedDuration: duration || undefined,
        message: message || undefined,
      });
      toast.success('Bid placed!');
      setAmount('');
      setDuration('');
      setMessage('');
      onPlaced?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to place bid');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 leading-tight">Place a bid</h2>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">
                    {gig.title} · {gig.startup_name}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {budgetHint && (
                <p className="text-xs font-medium text-blue-700 bg-blue-50 rounded-xl px-3 py-2">{budgetHint}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Your price (USD)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value as 'fixed' | 'hourly')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="fixed">Fixed price</option>
                    <option value="hourly">Per hour</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Estimated time (optional)</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 1 week"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Pitch (optional)</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why you're the right person for this gig…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Placing bid…' : 'Submit bid'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default BidModal;
