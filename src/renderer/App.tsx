import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ConnectionPage from './pages/Connection/ConnectionPage';
import InputOutputPage from './pages/InputOutput/InputOutputPage';
import ScenesPage from './pages/Scenes/ScenesPage';
import SettingsPage from './pages/Settings/SettingsPage';
import SplicingPage from './pages/Splicing/SplicingPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InputOutputPage />} />
        <Route path="/scenes" element={<ScenesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/splicing" element={<SplicingPage />} />
        <Route path="/connection" element={<ConnectionPage />} />
      </Routes>
    </Router>
  );
}
