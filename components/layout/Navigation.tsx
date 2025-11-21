
import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { Button } from '../ui/Shared';
import { Menu, LogOut, Home, LayoutDashboard, BookOpen, Calendar, Users, Sparkles, FolderOpen, UserCircle } from 'lucide-react';

interface NavbarProps { 
  user: User | null; 
  onLogout: () => void; 
  toggleSidebar: () => void; 
  goHome: () => void; 
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, toggleSidebar, goHome }) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    return (
      <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="lg:hidden text-white/80 hover:text-white p-1">
            <Menu />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white font-bold border border-white/30">Z</div>
            <span className="text-xl font-bold text-white hidden sm:block tracking-tight">Zero Classes</span>
          </div>
        </div>
        {user && (
          <div className="relative">
            <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
               <div className="text-right hidden sm:block">
                   <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
                   <p className="text-xs text-indigo-100 capitalize">{user.role.toLowerCase()}</p>
               </div>
               {user.profileImage ? (
                 <img src={user.profileImage} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-white/50 hover:border-white transition-colors" />
               ) : (
                 <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white font-bold border border-white/30">
                    {user.name.charAt(0)}
                 </div>
               )}
            </div>

            {/* Mobile Profile Dropdown */}
            {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 animate-in fade-in zoom-in-95 border border-gray-100">
                    <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                        <p className="font-bold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut size={16} /> Logout
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
    { id: 'landing', label: 'Home', icon: <Home size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'profile', label: 'My Profile', icon: <UserCircle size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'courses', label: 'My Courses', icon: <BookOpen size={20} />, roles: [UserRole.STUDENT] },
    { id: 'schedule', label: 'Schedule', icon: <Calendar size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR] },
    { id: 'resources', label: 'Shared Resources', icon: <FolderOpen size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'manage-courses', label: 'Manage Courses', icon: <BookOpen size={20} />, roles: [UserRole.INSTRUCTOR, UserRole.ADMIN] },
    { id: 'admin-users', label: 'Manage Users', icon: <Users size={20} />, roles: [UserRole.ADMIN] },
    { id: 'ai-tutor', label: 'AI Assistant', icon: <Sparkles size={20} />, roles: [UserRole.STUDENT, UserRole.INSTRUCTOR] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
        {/* Mobile Overlay */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
        )}
        
        <aside className={`fixed inset-y-0 left-0 lg:static z-30 w-64 bg-white border-r border-gray-200 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col h-full shadow-2xl lg:shadow-none`}>
          <div className="p-4 space-y-1 flex-1 overflow-y-auto">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</div>
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === item.id 
                    ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 text-center font-medium">Zero Classes v1.0</p>
              </div>
          </div>
        </aside>
    </>
  );
};
