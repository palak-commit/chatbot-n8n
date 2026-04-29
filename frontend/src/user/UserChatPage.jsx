import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/api';

const SESSION_KEY = 'chat_session_id';
const CHAT_HISTORY_KEY = 'chat_history';

function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function UserChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [
      { id: 1, role: 'bot', text: 'Hello! Hu tamaro chatbot assistant chu. Shu help joiye?' },
    ];
  });
  const [isSending, setIsSending] = useState(false);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMessage = { id: Date.now(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      setIsSending(true);
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: getSessionId(),
        }),
      });

      const data = await res.json();
      const botReply = data.reply || (res.ok ? 'Reply malyo nathi' : 'Server error aavyo');

      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'bot', text: botReply }]);

      if (data?.booking?.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            role: 'bot',
            text: `Appointment book thai gayu: ${data.booking.patientName} - ${data.booking.time}`,
          },
        ]);
      } else if (data?.booking?.success === false) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 3,
            role: 'bot',
            text: `Booking fail: ${data.booking.message}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 4, role: 'bot', text: 'Connection issue, please try again.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };


  return (
    <main className="mx-auto mt-4 flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl transition-all duration-300 sm:mt-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-50 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">Health Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
              <p className="text-xs font-medium text-green-600">Always active</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => {
            if(confirm('Chhat history clear karvi che?')) {
              setMessages([{ id: Date.now(), role: 'bot', text: 'Hello! Hu tamaro chatbot assistant chu. Shu help joiye?' }]);
              localStorage.removeItem('chat_history');
            }
          }}
          className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
          title="Clear Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </header>

      {/* Chat Messages */}
      <section className="flex-1 space-y-4 overflow-y-auto bg-[#f8fafc] p-6 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div
              className={`max-w-[85%] px-5 py-3.5 shadow-sm transition-all hover:shadow-md ${
                msg.role === 'user' 
                  ? 'rounded-3xl rounded-tr-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                  : 'rounded-3xl rounded-tl-sm bg-white text-gray-800 border border-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start animate-pulse">
            <div className="rounded-2xl bg-white px-5 py-3 border border-gray-100">
              <div className="flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Input Area */}
      <footer className="border-t border-gray-50 bg-white p-5">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your health concern..."
            className="w-full rounded-2xl border-0 bg-gray-100 px-5 py-4 pr-14 text-[15px] text-gray-900 placeholder-gray-500 ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
          <button
            type="submit"
            disabled={!canSend || isSending}
            className={`absolute right-2 rounded-xl p-2.5 transition-all duration-200 ${
              canSend && !isSending 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:scale-105 active:scale-95' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
        <p className="mt-3 text-center text-[11px] font-medium text-gray-400 uppercase tracking-widest">
          Powered by HealthCare Clinic AI
        </p>
      </footer>
    </main>
  );
}

export default UserChatPage;
