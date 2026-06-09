import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, ArrowRight, HandCoins, MessageSquare, Sparkles,
  PenTool, Code2, Megaphone, CalendarClock,
} from 'lucide-react';

const display = { fontFamily: '"Bricolage Grotesque", system-ui, sans-serif' };

/** Floating gig cards in the hero — the swipe deck is the product's soul. */
const HERO_GIGS = [
  {
    title: 'Build a Stripe checkout flow',
    poster: 'Atlas Labs',
    price: '$800',
    tag: 'fixed',
    time: '1 week',
    icon: Code2,
    rotate: -7,
    x: 0,
    y: 26,
    z: 30,
    delay: 0.15,
  },
  {
    title: 'Brand refresh for our beta launch',
    poster: 'Hearth & Co',
    price: '$65/hr',
    tag: 'hourly',
    time: '~15 hours',
    icon: PenTool,
    rotate: 4,
    x: 150,
    y: -10,
    z: 20,
    delay: 0.3,
  },
  {
    title: 'Write 4 launch-week posts',
    poster: 'Driftwave',
    price: '$350',
    tag: 'fixed',
    time: '3 days',
    icon: Megaphone,
    rotate: 11,
    x: 290,
    y: 48,
    z: 10,
    delay: 0.45,
  },
];

const FREELANCER_STEPS = [
  { n: '01', title: 'Swipe through gigs', body: 'Every card is a scoped gig with a real price on it. No 40-page job descriptions.' },
  { n: '02', title: 'Bid your price', body: 'One tap to make an offer — your rate, your timeline, a two-line pitch.' },
  { n: '03', title: 'Chat and ship', body: 'Bid accepted? Chat opens instantly. Agree on details, do the work, get paid directly.' },
];

const CLIENT_STEPS = [
  { n: '01', title: 'Post a gig with a price', body: 'Title, scope, budget, deadline. Takes two minutes — seriously.' },
  { n: '02', title: 'Bids come to you', body: 'Freelancers who actually want the work bid with their price and pitch.' },
  { n: '03', title: 'Pick one, start today', body: 'Accept a bid and you are in a chat with your freelancer. No middleman.' },
];

function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight" style={display}>
            Gig<span className="text-blue-600">ly</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            Log in
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-100 rounded-full px-3 py-1.5 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            No platform fees while in beta
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-6xl sm:text-7xl font-extrabold text-slate-900 leading-[0.95] tracking-tight"
            style={display}
          >
            Swipe.
            <br />
            Bid.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Ship.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 text-lg text-slate-600 max-w-md leading-relaxed"
          >
            Scoped gigs for indie makers and small teams. Post a gig with a
            price, get bids in hours — not proposals in weeks. Keep 100% of
            what you earn.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-shadow"
            >
              Find gigs
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/recruiter-signup"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-semibold hover:border-slate-900 transition-colors"
            >
              <HandCoins className="w-4 h-4 text-blue-600" />
              Post a gig
            </Link>
          </motion.div>
        </div>

        {/* The deck */}
        <div className="relative h-[420px] hidden lg:block select-none" aria-hidden>
          {HERO_GIGS.map((gig) => (
            <motion.div
              key={gig.title}
              initial={{ opacity: 0, y: 40, rotate: 0 }}
              animate={{ opacity: 1, y: gig.y, rotate: gig.rotate }}
              transition={{ delay: gig.delay, type: 'spring', stiffness: 120, damping: 16 }}
              whileHover={{ y: gig.y - 12, rotate: gig.rotate / 2, zIndex: 40 }}
              className="absolute w-64 bg-white rounded-3xl shadow-xl border border-slate-100 p-5 cursor-default"
              style={{ left: gig.x, zIndex: gig.z }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <gig.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                  gig.tag === 'fixed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {gig.tag}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 leading-snug" style={display}>{gig.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{gig.poster}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xl font-extrabold text-slate-900" style={display}>{gig.price}</span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {gig.time}
                </span>
              </div>
            </motion.div>
          ))}
          {/* Bid chip floating over the deck */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
            className="absolute left-44 top-[245px] z-40 bg-slate-900 text-white text-sm font-semibold rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2"
          >
            <HandCoins className="w-4 h-4 text-blue-400" />
            You bid $700 · accepted 🎉
          </motion.div>
        </div>
      </section>

      {/* Niche statement band */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400 mb-4">Why Gigly</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight max-w-3xl" style={display}>
            Built for the <span className="text-blue-400">small, scoped gig</span> the big platforms ignore.
          </h2>
          <div className="grid sm:grid-cols-3 gap-10 mt-14">
            {[
              { stat: '0%', label: 'platform fees — you agree on a price, you keep it' },
              { stat: '2 min', label: 'to post a gig with a budget and deadline' },
              { stat: '1 tap', label: 'to bid — no proposals, no cover letters' },
            ].map((item) => (
              <div key={item.stat} className="border-t border-slate-800 pt-6">
                <p className="text-5xl font-extrabold text-white" style={display}>{item.stat}</p>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — two sides */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center mb-16" style={display}>
          Two sides. One handshake.
        </h2>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Freelancer column */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg" style={display}>For freelancers</h3>
                <p className="text-xs text-slate-400">Find your next gig tonight</p>
              </div>
            </div>
            <ol className="space-y-6">
              {FREELANCER_STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="text-sm font-extrabold text-blue-600 pt-0.5" style={display}>{s.n}</span>
                  <div>
                    <p className="font-bold text-slate-900">{s.title}</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:gap-3 transition-all"
            >
              Start swiping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Client column */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center">
                <HandCoins className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg" style={display}>For gig posters</h3>
                <p className="text-xs text-slate-400">Indie makers, startups, small teams</p>
              </div>
            </div>
            <ol className="space-y-6">
              {CLIENT_STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="text-sm font-extrabold text-indigo-600 pt-0.5" style={display}>{s.n}</span>
                  <div>
                    <p className="font-bold text-slate-900">{s.title}</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/recruiter-signup"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:gap-3 transition-all"
            >
              Post your first gig <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl px-8 py-14 shadow-xl shadow-blue-600/20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white" style={display}>
            The work is out there.
          </h2>
          <p className="text-blue-100 mt-3 max-w-md mx-auto">
            Free while in beta. Takes a minute to join, and the chat does the rest.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/signup"
              className="px-6 py-3 bg-white text-blue-700 rounded-2xl font-bold hover:bg-blue-50 transition-colors"
            >
              Join as a freelancer
            </Link>
            <Link
              to="/recruiter-signup"
              className="px-6 py-3 bg-blue-500/30 text-white border border-blue-300/40 rounded-2xl font-bold hover:bg-blue-500/50 transition-colors"
            >
              Post a gig
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span>© {new Date().getFullYear()} Gigly. Payments are arranged directly between parties.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-slate-700 transition-colors">Terms</Link>
            <Link to="/login" className="hover:text-slate-700 transition-colors">Log in</Link>
            <a href="#" className="flex items-center gap-1 hover:text-slate-700 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Feedback
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
