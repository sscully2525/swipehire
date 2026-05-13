import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Match {
  id: string;
  startup_name: string;
  startup_logo?: string;
  startup_slug: string;
  startup_verified: boolean;
  job_title: string;
  salary_min: number;
  salary_max: number;
  job_location: string;
  remote_allowed: boolean;
  status: string;
  created_at: string;
  unread_count: number;
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

function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { accessToken, user } = useAuthStore();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchMatches();
  }, []);

  // Open specific chat from URL param ?chat=matchId
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && matches.length > 0) {
      const match = matches.find((m) => m.id === chatId);
      if (match) openChat(match);
    }
  }, [searchParams, matches]);

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

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/matches');
      setMatches(response.data);
    } catch {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (match: Match) => {
    // Leave previous room
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

    // Clear unread count locally
    setMatches((prev) => prev.map((m) => (m.id === match.id ? { ...m, unread_count: 0 } : m)));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-16">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl mb-4">💼</motion.div>
        <h2 className="text-2xl font-bold text-gray-900">No matches yet</h2>
        <p className="mt-2 text-gray-600">Keep swiping right to find your perfect match!</p>
        <Link to="/swipe" className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
          Start Swiping
        </Link>
      </div>
    );
  }

  const MatchList = (
    <div className="space-y-3">
      {matches.map((match) => (
        <motion.button
          key={match.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => openChat(match)}
          className={`w-full text-left bg-white rounded-xl shadow-sm border-2 p-4 transition-all ${
            selectedMatch?.id === match.id
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {match.startup_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-gray-900 truncate">{match.startup_name}</span>
                {match.startup_verified && (
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-500 truncate">{match.job_title}</p>
              <p className="text-xs text-gray-400">
                ${(match.salary_min / 1000).toFixed(0)}k–${(match.salary_max / 1000).toFixed(0)}k
                {match.remote_allowed && ' · Remote'}
              </p>
            </div>
            {match.unread_count > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                {match.unread_count}
              </span>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );

  const ChatPanel = selectedMatch ? (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 flex items-center space-x-3">
        <button
          onClick={() => setShowChatOnMobile(false)}
          className="md:hidden p-1 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
          {selectedMatch.startup_name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{selectedMatch.startup_name}</h3>
          <p className="text-sm text-gray-500">{selectedMatch.job_title}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          selectedMatch.status === 'interview_scheduled' ? 'bg-green-100 text-green-700' :
          selectedMatch.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {selectedMatch.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'candidate' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.sender_type === 'candidate' ? 'items-end' : 'items-start'} flex flex-col`}>
                {msg.sender_name && msg.sender_type === 'company' && (
                  <span className="text-xs text-gray-400 mb-1 px-1">{msg.sender_name}</span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl ${
                  msg.sender_type === 'candidate'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <span className={`text-xs mt-1 px-1 ${msg.sender_type === 'candidate' ? 'text-gray-400' : 'text-gray-400'}`}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  {msg.sender_type === 'candidate' && msg.read_at && (
                    <span className="ml-1 text-blue-400">· Read</span>
                  )}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
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
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
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
    <div className="hidden md:flex bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 h-[calc(100vh-180px)] min-h-[500px] items-center justify-center">
      <div className="text-center text-gray-400">
        <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="font-medium">Select a match to chat</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Matches</h1>

      {/* Desktop: side-by-side. Mobile: either list or chat */}
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

export default Matches;
