import { useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/api';

const SESSION_KEY = 'chat_session_id';

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
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: 'Hello! Hu tamaro chatbot assistant chu. Shu help joiye?' },
  ]);
  const [isSending, setIsSending] = useState(false);

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
    <main className="mx-auto mt-8 flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-gray-200 bg-white shadow">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">User Chatbot</h1>
          <p className="text-xs text-gray-500">Default chat UI</p>
        </div>
        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Online</span>
      </header>

      <section className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-200 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!canSend || isSending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </main>
  );
}

export default UserChatPage;
