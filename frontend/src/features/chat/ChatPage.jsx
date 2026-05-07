import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';

const SESSION_ID_KEY = 'chat_session_id';
const CHAT_HISTORY_KEY = 'chat_history';

const getSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [
      { id: 1, role: 'bot', text: 'Hello! Hu tamaro chatbot assistant chu. Shu help joiye?' },
    ];
  });
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [voiceLanguage, setVoiceLanguage] = useState(null); // Stores the language used for voice input
  const { theme, toggle: toggleTheme } = useTheme();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // OneSignal External ID Setup
  useEffect(() => {
    const sessionId = getSessionId();
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
          safari_web_id: "web.onesignal.auto.10435956-71bd-428a-a386-8768ef95efa2",
          notifyButton: {
            enable: false,
          },
          allowLocalhostAsSecure: true,
        });

        await OneSignal.login(sessionId);

        setNotificationPermission(OneSignal.Notifications.permission ? 'granted' : 'default');

        OneSignal.Notifications.addEventListener('permissionChange', (isOptedIn) => {
          setNotificationPermission(isOptedIn ? 'granted' : 'denied');
        });
      } catch (err) {
        console.error('[OneSignal] Init error:', err);
      }
    });
  }, []);

  const handleNotificationClick = () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
      } catch (err) {
        console.error('[OneSignal] Permission request error:', err);
      }
    });
  };

  // Text-to-Speech (TTS) Setup using ElevenLabs with fallback to Google Translate
  const speak = useCallback(async (text, lang = 'gu-IN') => {
    // Clean text and format dates for natural speech
    let cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Emojis
      .replace(/\*\*/g, '') // Remove bold markdown (**)
      .replace(/[•*-]/g, '') // Bullet points
      .replace(/\s+/g, ' ') // Extra spaces/newlines
      .trim();

    // Natural Date Reading (handles YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY)
    const monthsGu = [
      'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
      'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
    ];

    // 1. Handle Combined Date and Time (e.g., 2026-05-02, 05:00AM)
    // Phrasing: 2026 મે મહિનો 2 તારીખે સવારે 5 વાગ્યે
    if (lang === 'gu-IN') {
      cleanText = cleanText.replace(/(\d{4})-(\d{2})-(\d{2}),?\s*(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (match, y, m, d, h, min, period) => {
        const day = parseInt(d, 10);
        const month = parseInt(m, 10);
        const hour = parseInt(h, 10);
        const p = period.toUpperCase();
        
        let timePrefix = '';
        if (p === 'AM') {
          if (hour >= 4 && hour < 12) timePrefix = 'સવારે';
          else if (hour >= 0 && hour < 4) timePrefix = 'મોડી રાત્રે';
        } else {
          if (hour === 12 || hour < 4) timePrefix = 'બપોરે';
          else if (hour >= 4 && hour < 7) timePrefix = 'સાંજે';
          else timePrefix = 'રાત્રે';
        }
        
        const timePart = timePrefix ? `${timePrefix} ${hour} વાગ્યે` : `${hour} વાગ્યે`;
        return `${y} ${monthsGu[month - 1]} મહિનો ${day} તારીખે ${timePart}`;
      });
    }

    // 2. Handle YYYY-MM-DD separately if not caught above
    cleanText = cleanText.replace(/(\d{4})-(\d{2})-(\d{2})/g, (match, y, m, d) => {
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      return lang === 'gu-IN' ? `${y} ${monthsGu[month - 1]} મહિનો ${day} તારીખે` : `${day} ${new Date(y, month - 1, day).toLocaleString('en-IN', { month: 'long' })} ${y}`;
    });

    // 2. Handle DD-MM-YYYY or DD/MM/YYYY
     cleanText = cleanText.replace(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/g, (match, d, m, y) => {
       const day = parseInt(d, 10);
       const month = parseInt(m, 10);
       return lang === 'gu-IN' ? `${day} ${monthsGu[month - 1]} ${y}` : `${day} ${new Date(y, month - 1, day).toLocaleString('en-IN', { month: 'long' })} ${y}`;
     });
 
     // 3. Natural Time Reading (e.g., 05:00 AM -> સવારે 5 વાગ્યે, 06:00 PM -> સાંજે 6 વાગ્યે)
     if (lang === 'gu-IN') {
       cleanText = cleanText.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (match, h, m, period) => {
         const hour = parseInt(h, 10);
         const p = period.toUpperCase();
         let timeStr;
         
         if (p === 'AM') {
           if (hour >= 4 && hour < 12) timeStr = `સવારે ${hour}`;
           else if (hour >= 0 && hour < 4) timeStr = `મોડી રાત્રે ${hour}`;
           else timeStr = `${hour}`;
         } else {
           if (hour === 12 || hour < 4) timeStr = `બપોરે ${hour}`;
           else if (hour >= 4 && hour < 7) timeStr = `સાંજે ${hour}`;
           else timeStr = `રાત્રે ${hour}`;
         }
         
         return `${timeStr} વાગ્યે`;
       });
     }
 
     // 4. CRITICAL: Remove any remaining leading zeros from any numbers (e.g., "05" -> "5")
     cleanText = cleanText.replace(/(^|[^\d])0(\d+)/g, '$1$2');
 
     if (!cleanText) return;

    const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
    const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'dVTC43Yewy5fAIcmsISI'; 

    console.log('TTS Debug:', { hasKey: !!ELEVENLABS_API_KEY, voiceId: VOICE_ID });

    if (ELEVENLABS_API_KEY) {
      try {
        console.log('Attempting ElevenLabs TTS...');
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true
            },
          }),
        });

        if (response.ok) {
          console.log('ElevenLabs TTS Success!');
          const blob = await response.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          await audio.play();
          return;
        } else {
          const errorData = await response.json();
          console.error('ElevenLabs API Error:', errorData);
          // If it's a 401, it means the API key is invalid
          if (response.status === 401) {
            console.warn('ElevenLabs API Key is invalid. Falling back to Google TTS.');
          }
        }
      } catch (err) {
        console.error('ElevenLabs Network/Fetch Error:', err);
      }
    } else {
      console.warn('ElevenLabs API Key missing, using fallback.');
    }

    console.log('Using Fallback TTS (Google/Browser)...');
    // Fallback to Google Translate TTS if ElevenLabs fails or API key is missing
    const languageCode = lang.split('-')[0];
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${languageCode}&client=tw-ob&ttsspeed=0.9`;

    const audio = new Audio(ttsUrl);
    audio.play().catch(err => {
      console.error('Google TTS Fallback error:', err);
      // Final fallback to Web Speech API
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        const gujaratiVoice = voices.find(v => v.lang.includes('gu') || v.name.toLowerCase().includes('gujarati'));
        if (gujaratiVoice) utterance.voice = gujaratiVoice;
        utterance.lang = lang;
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
      }
    });
  }, []);

  // Voice Recognition Setup
  const recognition = useMemo(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'gu-IN'; // This can be made dynamic later

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setVoiceLanguage(rec.lang); // Store the exact language used
      };
      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('માઇક્રોફોન વાપરવાની પરવાનગી નથી. કૃપા કરીને બ્રાઉઝર સેટિંગ્સમાં જઈને "Allow" કરો અને પેજ રિલોડ કરો.');
        } else {
          alert('વોઇસ ઇનપુટમાં સમસ્યા આવી: ' + event.error);
        }
      };
      return rec;
    }
    return null;
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert('તમારા બ્રાઉઝરમાં વોઇસ સપોર્ટ ઉપલબ્ધ નથી. કૃપા કરીને Google Chrome નો ઉપયોગ કરો.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const QUICK_REPLIES = [
    { label: '📅 એપોઈન્ટમેન્ટ બુક કરો', value: 'Appointment book karo' },
    { label: '🕒 ડૉક્ટરના સ્લોટ્સ કેટલા છે?', value: 'Doctor na slots ketla che?' },
  ];

  const handleSend = useCallback(async (e, directText = null) => {
    if (e) e.preventDefault();
    const text = (directText || input).trim();
    if (!text || isSending) return;

    // Use a timestamp that's generated once per call
    const timestamp = Date.now();
    const userMessage = { id: timestamp, role: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    
    const currentVoiceLang = voiceLanguage;
    setVoiceLanguage(null);

    try {
      setIsSending(true);
      const { ok, data } = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          sessionId: getSessionId(),
        }),
      });

      const botReply = data.reply || (ok ? 'Reply malyo nathi' : 'Server error aavyo');

      const botMessage = {
        id: timestamp + 1,
        role: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        booking: data.booking
      };

      // Update bot message with a unique ID based on the user message timestamp
      setMessages((p) => [...p, botMessage]);

      // Only speak the bot reply if the user used voice input
      if (ok && currentVoiceLang) {
        speak(botReply, currentVoiceLang);
      }

      if (data?.booking?.success) {
        setMessages((p) => [
          ...p,
          {
            id: timestamp + 2,
            role: 'bot',
            text: `Appointment book thai gayu: ${data.booking.patientName} - ${data.booking.time}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
        ]);
      } else if (data?.booking?.success === false) {
        setMessages((p) => [
          ...p,
          {
            id: timestamp + 3,
            role: 'bot',
            text: `Booking fail: ${data.booking.message}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
        ]);
      }
    } catch {
      setMessages((p) => [
        ...p,
        { id: timestamp + 4, role: 'bot', text: 'Connection issue, please try again.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, voiceLanguage, speak]);


  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl transition-all duration-300 sm:mt-8 sm:h-[90vh] sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-50 bg-white/80 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg sm:h-10 sm:w-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Health Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
              <p className="text-xs font-medium text-green-600">Always active</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNotificationClick}
            className={`rounded-xl p-2 transition-colors ${
              notificationPermission === 'granted' 
                ? 'text-green-500 cursor-default' 
                : 'text-gray-400 hover:bg-gray-100 hover:text-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400'
            }`}
            title={notificationPermission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
          >
            {notificationPermission === 'granted' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-500 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              if(confirm('Are you sure you want to clear chat history?')) {
                setMessages([{ id: Date.now(), role: 'bot', text: 'Hello! Hu tamaro chatbot assistant chu. Shu help joiye?' }]);
                localStorage.removeItem(CHAT_HISTORY_KEY);
              }
            }}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
            title="Clear Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <section className="flex-1 space-y-4 overflow-y-auto bg-[#f8fafc] p-3 scroll-smooth sm:p-6 dark:bg-slate-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div
              className={`max-w-[85%] px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm transition-all hover:shadow-md ${
                msg.role === 'user' 
                  ? 'rounded-3xl rounded-tr-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                  : 'rounded-3xl rounded-tl-sm bg-white text-gray-800 border border-gray-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
              }`}
            >
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {msg.text.replace(/\*/g, '')}
              </div>
              {msg.time && (
                <div className={`mt-1 text-[10px] opacity-70 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.time}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="rounded-3xl rounded-tl-sm bg-white px-6 py-4 border border-gray-100 shadow-lg dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-duration:1s]"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></div>
                </div>
                <span className="text-[13px] font-semibold text-blue-600 animate-pulse tracking-wide uppercase">AI Thinking</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* Input Area */}
      <footer className="border-t border-gray-50 bg-white p-3 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        {/* Quick Replies */}
        <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {QUICK_REPLIES.map((reply, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSend(null, reply.value)}
              className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              {reply.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your health concern..."
              className="w-full rounded-2xl border-0 bg-gray-100 px-4 py-3 pr-24 sm:px-5 sm:py-4 text-[15px] text-gray-900 placeholder-gray-500 ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:ring-slate-700 dark:focus:bg-slate-800"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                onClick={toggleListening}
                className={`rounded-xl p-2.5 transition-all duration-200 ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
                title={isListening ? 'Listening...' : 'Start Voice Input'}
              >
                {isListening ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                type="submit"
                disabled={!canSend || isSending}
                className={`rounded-xl p-2.5 transition-all duration-200 ${
                  canSend && !isSending 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:scale-105 active:scale-95' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
        <p className="mt-3 text-center text-[11px] font-medium text-gray-400 uppercase tracking-widest dark:text-slate-500">
          Powered by HealthCare Clinic AI
        </p>
      </footer>
    </main>
  );
}

export default ChatPage;
