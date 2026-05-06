import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import SlotList from './components/SlotList';
import AppointmentList from './components/AppointmentList';

const AUTH_KEY = 'doctorAuth';

const formatTimeTo12Hour = (value) => {
  const [hoursText, minutes] = value.split(':');
  const hours = Number(hoursText);
  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${String(normalizedHours).padStart(2, '0')}:${minutes} ${period}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

function SlotPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem(AUTH_KEY)));
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeTab, setActiveTab] = useState('slots'); // 'slots' or 'appointments'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorInfo, setDoctorInfo] = useState(() => {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    return auth.doctor || { name: 'Doctor' };
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsLoggedIn(false);
    setSlots([]);
    setAppointments([]);
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
      const url = doctorId ? `/slots?doctorId=${doctorId}` : `/slots`;
      const { data } = await apiFetch(url);
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      showMessage('Slots load nathi thata', true);
    }
  }, [showMessage]);

  const loadAppointments = useCallback(async () => {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
      const doctorId = auth.doctorId;
      const url = doctorId ? `/appointments?doctorId=${doctorId}` : `/appointments`;
      const { data } = await apiFetch(url);
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    } catch {
      showMessage('Appointments load nathi thati', true);
    }
  }, [showMessage]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const timeoutId = setTimeout(() => {
      void loadSlots();
      void loadAppointments();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [isLoggedIn, loadSlots, loadAppointments]);

  const handleLogin = async (e) => {
    e.preventDefault();
    showMessage('');

    try {
      const { data } = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!data.success) {
        showMessage('Login failed', true);
        return;
      }

      const loggedInDoctor = { 
        name: data.doctorName || 'Doctor',
        specialization: data.specialization || 'Specialist'
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify({ 
        token: data.token, 
        doctorId: data.doctorId,
        doctor: loggedInDoctor
      }));
      setDoctorInfo(loggedInDoctor);
      setIsLoggedIn(true);
      await loadSlots();
      await loadAppointments();
    } catch {
      showMessage('Login request fail thai', true);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (isAddingSlot) return;
    
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
      setIsAddingSlot(true);
      const { ok, data } = await apiFetch('/slots', {
        method: 'POST',
        body: JSON.stringify({ date: newSlotDate, time, available: true, doctorId }),
      });

      if (!ok) {
        showMessage(data.message || 'Slot add nathi thayu', true);
        return;
      }

      setNewSlotDate('');
      setNewSlotTime('');
      showMessage('Slot add thai gayu');
      await loadSlots();
    } catch {
      showMessage('Slot add request fail thai', true);
    } finally {
      setIsAddingSlot(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 sm:p-6 dark:bg-slate-950">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 dark:bg-slate-900 dark:border-slate-800 dark:shadow-black/40">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-6 sm:p-8 text-white text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.196-8.236A9.974 9.974 0 003.33 21m15.34-11.429A9.974 9.974 0 0120.67 21m-8.34-10a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Doctor Portal</h2>
              <p className="mt-2 text-blue-100 text-sm font-medium">Manage your schedule with ease</p>
            </div>
            
            <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border-0 bg-gray-50 py-4 pl-12 pr-4 text-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:ring-slate-700 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border-0 bg-gray-50 py-4 pl-12 pr-4 text-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:ring-slate-700 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all">
                Sign In
              </button>
              
              {message && (
                <div className={`flex items-center gap-2 rounded-xl p-4 text-sm animate-in slide-in-from-top-2 duration-300 ${isError ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' : 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'}`}>
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
          <p className="mt-8 text-center text-sm text-gray-500 font-medium tracking-wide dark:text-slate-500">
            © 2026 HealthCare Clinic Management System
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header
          greeting={getGreeting()}
          doctorInfo={doctorInfo}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white capitalize tracking-tight">
              {activeTab === 'slots' ? 'Manage Availability' : 'Confirmed Appointments'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {activeTab === 'slots' 
                ? 'Update your schedule and time slots for patients.' 
                : 'View and manage your upcoming patient visits.'}
            </p>
          </div>

          {activeTab === 'slots' ? (
            <SlotList 
              slots={slots}
              newSlotDate={newSlotDate}
              setNewSlotDate={setNewSlotDate}
              newSlotTime={newSlotTime}
              setNewSlotTime={setNewSlotTime}
              handleAddSlot={handleAddSlot}
              isAddingSlot={isAddingSlot}
              message={message}
              isError={isError}
            />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <AppointmentList appointments={appointments} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default SlotPage;
