import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/api';

const AUTH_KEY = 'doctorAuth';

const formatTimeTo12Hour = (value) => {
  const [hoursText, minutes] = value.split(':');
  const hours = Number(hoursText);
  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${String(normalizedHours).padStart(2, '0')}:${minutes} ${period}`;
};

function DoctorSlotPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem(AUTH_KEY)));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsLoggedIn(false);
    setSlots([]);
    setUsername('');
    setPassword('');
  };

  const showMessage = useCallback((text, error = false) => {
    setMessage(text);
    setIsError(error);
  }, []);

  const loadSlots = useCallback(async () => {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
      const doctorId = auth.doctorId;
      const url = doctorId ? `${API_BASE_URL}/slots?doctorId=${doctorId}` : `${API_BASE_URL}/slots`;
      const res = await fetch(url);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      showMessage('Slots load nathi thata', true);
    }
  }, [showMessage]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const timeoutId = setTimeout(() => {
      void loadSlots();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [isLoggedIn, loadSlots]);

  const handleLogin = async (e) => {
    e.preventDefault();
    showMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!data.success) {
        showMessage('Login failed', true);
        return;
      }

      localStorage.setItem(AUTH_KEY, JSON.stringify({ token: data.token, doctorId: data.doctorId }));
      setIsLoggedIn(true);
      await loadSlots();
    } catch {
      showMessage('Login request fail thai', true);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    showMessage('');

    if (!newSlotDate) {
      showMessage('Date select karo', true);
      return;
    }
    if (!newSlotTime) {
      showMessage('Slot time select karo', true);
      return;
    }
    const time = formatTimeTo12Hour(newSlotTime);
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    const doctorId = auth.doctorId;

    try {
      const res = await fetch(`${API_BASE_URL}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newSlotDate, time, available: true, doctorId }),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || 'Slot add nathi thayu', true);
        return;
      }

      setNewSlotDate('');
      setNewSlotTime('');
      showMessage('Slot add thai gayu');
      await loadSlots();
    } catch {
      showMessage('Slot add request fail thai', true);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-8 text-white text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.196-8.236A9.974 9.974 0 003.33 21m15.34-11.429A9.974 9.974 0 0120.67 21m-8.34-10a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Doctor Portal</h2>
              <p className="mt-2 text-blue-100 text-sm font-medium">Manage your schedule with ease</p>
            </div>
            
            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border-0 bg-gray-50 py-4 pl-12 pr-4 text-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border-0 bg-gray-50 py-4 pl-12 pr-4 text-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all">
                Sign In
              </button>
              
              {message && (
                <div className={`flex items-center gap-2 rounded-xl p-4 text-sm animate-in slide-in-from-top-2 duration-300 ${isError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                  {isError ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {message}
                </div>
              )}
            </form>
          </div>
          <p className="mt-8 text-center text-sm text-gray-500 font-medium tracking-wide">
            © 2026 HealthCare Clinic Management System
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Slot Manager</h1>
              <p className="text-xs font-medium text-gray-400">Manage availability</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 hover:scale-105 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="mx-auto mt-8 max-w-5xl px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Sidebar: Add Slot Form */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-3xl bg-white p-6 shadow-xl shadow-blue-900/5 border border-gray-100">
            <h3 className="mb-6 text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </span>
              Add New Slot
            </h3>
            
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Date</label>
                <input
                  type="date"
                  value={newSlotDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewSlotDate(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-gray-50 px-4 py-3.5 text-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-green-500 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Time</label>
                <input
                  type="time"
                  step="1800"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-gray-50 px-4 py-3.5 text-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-green-500 transition-all outline-none"
                />
              </div>
              <button type="submit" className="w-full mt-2 rounded-2xl bg-green-600 py-4 font-bold text-white shadow-lg shadow-green-100 hover:bg-green-700 hover:scale-[1.02] active:scale-95 transition-all">
                Save Slot
              </button>
            </form>
            
            {message && (
              <div className={`mt-6 flex items-center gap-2 rounded-xl p-4 text-xs font-medium animate-in slide-in-from-top-2 duration-300 ${isError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {message}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content: Slots Display */}
        <section className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">Your Availability</h3>
            <div className="rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-600 border border-blue-100 uppercase tracking-wide">
              {slots.length} Total Slots
            </div>
          </div>

          {slots.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-xl shadow-blue-900/5 border border-gray-100">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-800">No slots found</h4>
              <p className="text-sm text-gray-500 mt-1">Start by adding your first availability on the left.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(
                slots.reduce((acc, slot) => {
                  const key = slot.date || 'No date';
                  (acc[key] = acc[key] || []).push(slot);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                .map(([date, dateSlots]) => (
                  <div key={date} className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200"></div>
                      <span className="rounded-full bg-white px-4 py-1 text-sm font-black text-blue-600 border border-blue-50 shadow-sm uppercase tracking-wider">
                        {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="h-px flex-1 bg-gray-200"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dateSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="group relative flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-inner ${slot.available ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[15px] font-bold text-gray-800">{slot.time}</p>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${slot.available ? 'text-green-500' : 'text-red-500'}`}>
                                {slot.available ? 'Available' : 'Booked'}
                              </span>
                            </div>
                          </div>
                          
                          {slot.available && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md">Edit</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default DoctorSlotPage;
