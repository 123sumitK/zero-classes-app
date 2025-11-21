
import React, { useState, useEffect } from 'react';
import { User, UserRole, ToastMessage } from './types';
import { storageService } from './services/storage';
import { Navbar, Sidebar } from './components/layout/Navigation';
import { LandingPage } from './components/pages/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { StudentView } from './components/dashboard/StudentView';
import { InstructorView } from './components/dashboard/InstructorView';
import { AdminView } from './components/dashboard/AdminView';
import { ResourceView } from './components/dashboard/ResourceView';
import { AIChat } from './components/features/AIChat';
import { ProfileManager } from './components/features/ProfileManager';
import { ToastContainer } from './components/ui/Shared';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState('landing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('zero_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('zero_user');
      }
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleLogin = (u: User) => {
      localStorage.setItem('zero_user', JSON.stringify(u));
      setUser(u);
      setView('landing');
  };

  const handleLogout = () => {
    localStorage.removeItem('zero_user');
    setUser(null); 
    setView('landing');
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const freshUser = await storageService.getUser(user.id);
      setUser(freshUser);
      localStorage.setItem('zero_user', JSON.stringify(freshUser));
    } catch (e) {
      console.error("Failed to refresh user", e);
    }
  };

  // Theme Logic
  const getThemeClass = () => {
     if (!user) return 'bg-gray-50';
     switch(user.theme) {
       case 'dark': return 'bg-gray-900 text-gray-100 dark-mode';
       case 'light-bright': return 'bg-orange-50 text-gray-900';
       default: return 'bg-gray-50 text-gray-900';
     }
  };

  const renderContent = () => {
    if (!user) return <AuthPage onLogin={handleLogin} showToast={showToast} />;

    if (view === 'landing') return <LandingPage user={user} setView={setView} />;
    if (view === 'ai-tutor') return <AIChat />;
    if (view === 'resources') return <ResourceView user={user} />;
    if (view === 'profile') return <ProfileManager user={user} refreshUser={refreshUser} showToast={showToast} />;
    if (view === 'admin-users' && user.role === UserRole.ADMIN) return <AdminView showToast={showToast} />;
    
    if (['manage-courses', 'schedule', 'dashboard'].includes(view) && (user.role === UserRole.INSTRUCTOR || user.role === UserRole.ADMIN)) {
      return <InstructorView user={user} view={view} showToast={showToast} />;
    }
    
    return <StudentView user={user} view={view} showToast={showToast} refreshUser={refreshUser} />;
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${getThemeClass()}`}>
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        goHome={() => setView('landing')}
      />
      
      <div className="flex flex-1 relative">
        {user && (
          <Sidebar 
            user={user} 
            currentView={view} 
            setView={(v) => { setView(v); setSidebarOpen(false); }} 
            isOpen={sidebarOpen} 
          />
        )}

        <main className={`flex-1 p-4 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden ${!user ? 'flex items-center justify-center' : ''}`}>
          {renderContent()}
        </main>
      </div>

      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
