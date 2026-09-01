import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

export default function AppLayout({ activeTab, onTabChange, onOpenSettings, children }) {
  return (
    <div className="min-h-dvh relative">
      {/* Animated background */}
      <div className="app-bg" />

      {/* Desktop Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onOpenSettings={onOpenSettings} />

      {/* Main Content */}
      <main
        className="
          md:ml-64
          pb-24 md:pb-6
          px-4 md:px-8
          pt-4 md:pt-6
          max-w-3xl
          md:max-w-4xl
          mx-auto
        "
      >
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} onOpenSettings={onOpenSettings} />
    </div>
  );
}
