import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HandCoins, Clock, CheckCircle, XCircle, Undo2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Bid {
  id: string;
  job_id: string;
  gig_title: string;
  amount: number;
  currency: string;
  pricing_type: 'fixed' | 'hourly';
  message?: string;
  estimated_duration?: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  created_at: string;
}

const STATUS_STYLES: Record<Bid['status'], { label: string; classes: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700', icon: Clock },
  accepted: { label: 'Accepted', classes: 'bg-green-50 text-green-700', icon: CheckCircle },
  declined: { label: 'Declined', classes: 'bg-red-50 text-red-600', icon: XCircle },
  withdrawn: { label: 'Withdrawn', classes: 'bg-slate-100 text-slate-500', icon: Undo2 },
};

function MyBids() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = useCallback(async () => {
    try {
      const res = await api.get('/bids/mine');
      setBids(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load your bids');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const withdrawBid = async (id: string) => {
    try {
      await api.delete(`/bids/${id}`);
      toast.success('Bid withdrawn');
      fetchBids();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to withdraw bid');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Bids</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Offers you've made on gigs — an accepted bid means the client wants to work with you.
        </p>
      </div>

      {bids.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HandCoins className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No bids yet</h2>
          <p className="text-sm text-slate-500">
            Find a gig you like in Discover and place your first bid.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => {
            const status = STATUS_STYLES[bid.status] ?? STATUS_STYLES.pending;
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={bid.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{bid.gig_title}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">
                      ${bid.amount.toLocaleString()}
                      {bid.pricing_type === 'hourly' ? '/hr' : ' fixed'}
                      {bid.estimated_duration ? ` · ${bid.estimated_duration}` : ''}
                    </p>
                    {bid.message && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{bid.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${status.classes}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                    {bid.status === 'pending' && (
                      <button
                        onClick={() => withdrawBid(bid.id)}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Placed {new Date(bid.created_at).toLocaleDateString()}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyBids;
