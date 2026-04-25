import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UserChatPage from './user/UserChatPage';
import DoctorSlotPage from './doctor/DoctorSlotPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserChatPage />} />
        <Route path="/doctor" element={<DoctorSlotPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
