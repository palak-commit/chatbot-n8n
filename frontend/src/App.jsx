import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './features/chat/ChatPage';
import SlotPage from './features/doctor/SlotPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/doctor" element={<SlotPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
