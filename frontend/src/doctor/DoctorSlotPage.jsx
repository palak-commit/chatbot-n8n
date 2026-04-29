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
      <main className="mx-auto mt-20 max-w-md rounded-xl bg-white p-6 shadow">
        <h2 className="mb-5 text-2xl font-bold text-gray-800">Doctor Login</h2>
        <form onSubmit={handleLogin} className="grid gap-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          />
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            Login
          </button>
        </form>
        {message ? (
          <p className={`mt-3 text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto mt-10 max-w-2xl rounded-xl bg-white p-6 shadow">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Doctor Slot Add Panel</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      <form onSubmit={handleAddSlot} className="mb-4 flex flex-wrap gap-2">
        <input
          type="date"
          value={newSlotDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setNewSlotDate(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
        />
        <input
          type="time"
          step="1800"
          value={newSlotTime}
          onChange={(e) => setNewSlotTime(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
        />
        <button type="submit" className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
          Add Slot
        </button>
      </form>

      {message ? <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p> : null}

      <div className="mt-4 grid gap-5">
        {Object.entries(
          slots.reduce((acc, slot) => {
            const key = slot.date || 'No date';
            (acc[key] = acc[key] || []).push(slot);
            return acc;
          }, {})
        )
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([date, dateSlots]) => (
            <section key={date}>
              <h3 className="mb-2 text-lg font-semibold text-gray-700">{date}</h3>
              <div className="grid gap-2">
                {dateSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="font-medium text-gray-800">{slot.time}</span>
                    <strong className={slot.available ? 'text-green-600' : 'text-red-600'}>
                      {slot.available ? 'Available' : 'Booked'}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    </main>
  );
}

export default DoctorSlotPage;
