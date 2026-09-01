import { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import LoggerPage from './pages/LoggerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HistoryPage from './pages/HistoryPage';
import ApiKeySettings from './components/settings/ApiKeySettings';
import UpdateToast from './components/common/UpdateToast';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showApiSettings, setShowApiSettings] = useState(false);

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onTabChange={setActiveTab} />;
      case 'logger':
        return <LoggerPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'history':
        return <HistoryPage />;
      default:
        return <HomePage onTabChange={setActiveTab} />;
    }
  };

  return (
    <>
      <AppLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setShowApiSettings(true)}
      >
        {renderPage()}
      </AppLayout>

      {/* Global Settings Modal */}
      <ApiKeySettings
        isOpen={showApiSettings}
        onClose={() => setShowApiSettings(false)}
      />

      <UpdateToast />
    </>
  );
}
