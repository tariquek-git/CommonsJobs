import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SubmitPage from './pages/SubmitPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/submit" element={<SubmitPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
