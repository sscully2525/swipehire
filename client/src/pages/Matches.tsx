import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/api';
import { joinMatchRoom, leaveMatchRoom } from '../lib/socket';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
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

function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (accessToken) {
      const newSocket = io('/', {
        auth: { token: accessToken },
        transports: ['websocket'],
      });
      setSocket(newSocket);

      newSocket.on('new_message', (message) => {
        setMessages((prev) => {
          // Check if message already exists (by id or content+timestamp for temp messages)
          const exists = prev.some(m => 
            m.id === message.id || 
            (m.content === message.content && m.sender_id === message.sender_id && 
             Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000)
          );
          if (exists) return prev;
          return [...prev, message];
        });
      });

      return () => {
        newSocket.close();
      };
    }
  }, [accessToken]);

  useEffect(() => {
    if (selectedMatch && socket) {
      joinMatchRoom(socket, selectedMatch.id);
      fetchMessages(selectedMatch.id);

      return () => {
        leaveMatchRoom(socket, selectedMatch.id);
      };
    }
  }, [selectedMatch, socket]);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/matches');
      setMatches(response.data);
    } catch (err) {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (matchId: string) => {
    try {
      const response = await api.get(`/matches/${matchId}/messages`);
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send via API - server will handle socket broadcast
      const response = await api.post(`/chat/${selectedMatch.id}/messages`, {
        content: messageContent,
      });

      // Add message locally (server broadcasts to others, not sender)
      setMessages(prev => {
        // Check if already exists
        const exists = prev.some(m => m.id === response.data.id);
        if (exists) return prev;
        return [...prev, response.data];
      });
    } catch (err) {
      toast.error('Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-16">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-4"
        >
          💼
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900">No matches yet</h2>
        <p className="mt-2 text-gray-600">Keep swiping right to find your perfect match!</p>
        <Link
          to="/swipe"
          className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
        >
          Start Swiping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Matches</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Matches List */}
        <div className="space-y-4">
          {matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedMatch(match)}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all ${
                selectedMatch?.id === match.id
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {match.startup_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {match.startup_name}
                    </h3>
                    {match.startup_verified && (
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{match.job_title}</p>
                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                    <span>${(match.salary_min / 1000).toFixed(0)}k - ${(match.salary_max / 1000).toFixed(0)}k</span>
                    {match.remote_allowed && <span>• Remote</span>}
                  </div>
                </div>
                {match.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {match.unread_count}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chat Panel */}
        <div className="hidden md:block">
          {selectedMatch ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{selectedMatch.startup_name}</h3>
                <p className="text-sm text-gray-500">{selectedMatch.job_title}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'candidate' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          msg.sender_type === 'candidate'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 h-[600px] flex items-center justify-center">
              <div className="text-center text-gray-400">
                <span className="text-4xl">💬</span>
                <p className="mt-2">Select a match to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Matches;