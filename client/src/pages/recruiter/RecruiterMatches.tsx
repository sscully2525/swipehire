import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface RecruiterMatch {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  title?: string;
  avatar_url?: string;
  skills?: string[];
  linkedin_url?: string;
  startup_name: string;
  startup_logo?: string;
  job_title: string;
  salary_min: number;
  salary_max: number;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: 'candidate' | 'company';
  sender_name?: string;
  created_at: string;
  read_at?: string;
}

const STATUS_OPTIONS = ['pending', 'contacted', 'interview_scheduled', 'hired', 'rejected'];

function RecruiterMatches() {
  const [matches, setMatches] = useState<RecruiterMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<RecruiterMatch | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { accessToken, user } = useAuthStore();

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const sock = io('/', { auth: { token: accessToken }, transports: ['websocket'] });
    setSocket(sock);

    sock.on('new_message', (message: Message) => {
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === message.id ||
            (m.content === message.content &&
              m.sender_id === message.sender_id &&
              Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000)
        );
        return exists ? prev : [...prev, message];
      });
    });

    sock.on('typing', ({ userId, userName, isTyping }: { userId: string; userName: string; isTyping: boolean }) => {
      if (userId === user?.id) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(userName || userId);
        else next.delete(userName || userId);
        return next;
      });
    });

    return () => { sock.close(); };
  }, [accessToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/recruiter/matches');
      setMatches(response.data);
    } catch {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (match: RecruiterMatch) => {
    if (selectedMatch && socket) {
      socket.emit('leave_match', selectedMatch.id);
    }
    setSelectedMatch(match);
    setMessages([]);
    setShowChatOnMobile(true);

    try {
      const response = await api.get(`/chat/${match.id}/messages`);
      setMessages(response.data);
    } catch {
      toast.error('Failed to load messages');
    }

    if (socket) {
      socket.emit('join_match', match.id);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    if (socket) socket.emit('typing', { matchId: selectedMatch.id, isTyping: false });

    try {
      const response = await api.post(`/chat/${selectedMatch.id}/messages`, { content });
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === response.data.id);
        return exists ? prev : [...prev, response.data];
      });
    } catch {
      toast.error('Failed to send message');
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (!socket || !selectedMatch) return;
    socket.emit('typing', { matchId: selectedMatch.id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { matchId: selectedMatch.id, isTyping: false });
    }, 2000);
  };

  const updateStatus = async (matchId: string, status: string) => {
    try {
      // Use recruiter matches endpoint — we need to update via a generic matches status call
      // Since the candidate's matches/:id/status endpoint checks user_id ownership,
      // we handle it via a direct query through recruiter matches
      await api.put(`/matches/${matchId}/status`, { status });
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status } : m)));
      if (selectedMatch?.id === matchId) {
        setSelectedMatch((prev) => prev ? { ...prev, status } : prev);
      }
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredMatches = statusFilter === 'all'
    ? matches
    : matches.filter((m) => m.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      contacted: 'bg-blue-100 text-blue-700',
      interview_scheduled: 'bg-green-100 text-green-700',
      hired: 'bg-purple-100 text-purple-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const MatchList = (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {filteredMatches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No matches found</p>
        </div>
      ) : (
        filteredMatches.map((match) => (
          <motion.button
            key={match.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => openChat(match)}
            className={`w-full text-left bg-white rounded-xl shadow-sm border-2 p-4 transition-all ${
              selectedMatch?.id === match.id
                ? 'border-indigo-500 ring-2 ring-indigo-100'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {match.first_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {match.first_name} {match.last_name}
                </p>
                <p className="text-sm text-gray-500 truncate">{match.title || 'Candidate'}</p>
                <p className="text-xs text-gray-400 truncate">{match.job_title} · {match.startup_name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusColor(match.status)}`}>
                {match.status.replace(/_/g, ' ')}
              </span>
            </div>
          </motion.button>
        ))
      )}
    </div>
  );

  const ChatPanel = selectedMatch ? (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowChatOnMobile(false)}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
            {selectedMatch.first_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{selectedMatch.first_name} {selectedMatch.last_name}</h3>
            <p className="text-sm text-gray-500">{selectedMatch.job_title}</p>
          </div>
          {/* Status selector */}
          <select
            value={selectedMatch.status}
            onChange={(e) => updateStatus(selectedMatch.id, e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Candidate quick info */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {selectedMatch.linkedin_url && (
            <a
              href={selectedMatch.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>
          )}
          {selectedMatch.skills && selectedMatch.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{skill}</span>
          ))}
          {selectedMatch.skills && selectedMatch.skills.length > 4 && (
            <span className="text-xs text-gray-400">+{selectedMatch.skills.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="font-medium">Start the conversation</p>
            <p className="text-sm mt-1">Send a message to {selectedMatch.first_name}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'company' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col ${msg.sender_type === 'company' ? 'items-end' : 'items-start'}`}>
                {msg.sender_name && msg.sender_type === 'candidate' && (
                  <span className="text-xs text-gray-400 mb-1 px-1">{msg.sender_name}</span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl ${
                  msg.sender_type === 'company'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1 px-1">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  {msg.sender_type === 'company' && msg.read_at && (
                    <span className="ml-1 text-indigo-400">· Read</span>
                  )}
                </span>
              </div>
            </div>
          ))
        )}

        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                <div className="flex space-x-1 items-center h-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2 items-end">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`Message ${selectedMatch.first_name}...`}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="hidden md:flex bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 h-[calc(100vh-200px)] min-h-[500px] items-center justify-center">
      <div className="text-center text-gray-400">
        <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="font-medium">Select a match to chat</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
        <span className="text-sm text-gray-500">{matches.length} total</span>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <div className={`md:col-span-2 ${showChatOnMobile ? 'hidden md:block' : 'block'}`}>
          {MatchList}
        </div>
        <div className={`md:col-span-3 ${showChatOnMobile ? 'block' : 'hidden md:block'}`}>
          {ChatPanel}
        </div>
      </div>
    </div>
  );
}

export default RecruiterMatches;
