
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../../types';
import { Menu, LogOut, Home, LayoutDashboard, BookOpen, Calendar, Users, Sparkles, FolderOpen, UserCircle } from 'lucide-react';

interface NavbarProps { 
  user: User | null; 
  onLogout: () => void; 
  toggleSidebar: () => void; 
  goHome: () => void; 
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, toggleSidebar, goHome }) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <nav className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 shadow-lg h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="lg:hidden text-white/80 hover:text-white p-1 transition-colors">
            <Menu />
          </button>
          
          {/* NEW GEOMETRIC LOGO - SUN & BOOK CONCEPT */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={goHome}>
            <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300 overflow-hidden relative border-2 border-amber-400">
                {/* Sun Background */}
                <div className="absolute inset-0 bg-amber-100"></div>
                {/* Book Icon */}
                <BookOpen className="relative z-10 text-indigo-600" size={20} strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
                <span className="text-xl font-extrabold text-white tracking-tight leading-none block">Zero Classes</span>
                <span className="text-[10px] text-indigo-200 uppercase tracking-[0.2em] font-medium block">Future of Learning</span>
            </div>
          </div>
        </div>

        {user && (
          <div className="relative" ref={profileMenuRef}>
            <div 
                className="flex items-center gap-3 cursor-pointer p-1 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
               <div className="text-right hidden sm:block">
                   <p className="text-sm font-bold text-white leading-tight">{user.name}</p>
                   <p className="text-[10px] text-indigo-100 uppercase tracking-wider">{user.role}</p>
               </div>
               {user.profileImage ? (
                 <img src={user.profileImage} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
               ) : (
                 <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm">
                    {user.name.charAt(0)}
                 </div>
               )}
            </div>

            {/* Mobile Profile Dropdown */}
            {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 sm:hidden bg-gray-50/50">
                        <p className="font-bold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <button onClick={onLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium">
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            )}
          </div>
        )}
      </nav>
    );
};

interface SidebarProps { 
  user: User; 
  currentView: string; 
  setView: (v: string) => void; 
  isOpen: boolean;
  onClose: () => void; 
}

export const Sidebar: React.FC<SidebarProps> = ({ user, currentView, setView, isOpen, onClose }) => {
  const menuItems = [
    { id: 'landing', label: 'Home Overview', icon: <Home size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'courses', label: 'My Learning', icon: <BookOpen size={20} />, roles: [UserRole.STUDENT] },
    { id: 'manage-courses', label: 'Course Manager', icon: <BookOpen size={20} />, roles: [UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'schedule', label: 'Live Classes', icon: <Calendar size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR] },
    { id: 'resources', label: 'Resource Library', icon: <FolderOpen size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'admin-users', label: 'User Control', icon: <Users size={20} />, roles: [UserRole.ADMIN] },
    { id: 'ai-tutor', label: 'AI Tutor', icon: <Sparkles size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR] },
    { id: 'profile', label: 'Profile Settings', icon: <UserCircle size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
        {/* Mobile Overlay */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />
        )}
        
        <aside className={`fixed inset-y-0 left-0 lg:static z-40 w-64 bg-white border-r border-gray-200 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-out flex flex-col h-full shadow-2xl lg:shadow-none`}>
          <div className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-gray-300"></span> Main Menu
            </div>
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentView === item.id 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                }`}
              >
                <span className={currentView === item.id ? 'text-indigo-600' : 'text-gray-400'}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">Zero Classes</p>
                  <p className="text-xs opacity-70">Empowering Education</p>
              </div>
          </div>
        </aside>
    </>
  );
};
