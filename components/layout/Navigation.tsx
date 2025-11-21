
import React from 'react';
import { User, UserRole } from '../../types';
import { Button } from '../ui/Shared';
import { Menu, LogOut, Home, LayoutDashboard, BookOpen, Calendar, Users, Sparkles, FolderOpen, UserCircle } from 'lucide-react';

interface NavbarProps { 
  user: User | null; 
  onLogout: () => void; 
  toggleSidebar: () => void; 
  goHome: () => void; 
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, toggleSidebar, goHome }) => (
  <nav className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
    <div className="flex items-center gap-3">
      <button onClick={toggleSidebar} className="lg:hidden text-gray-500 hover:text-primary-600">
        <Menu />
      </button>
      <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold">Z</div>
        <span className="text-xl font-bold text-gray-800 hidden sm:block">Zero Classes</span>
      </div>
    </div>
    {user && (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
           {user.profileImage ? (
             <img src={user.profileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
           ) : (
             <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-sm font-bold">
                {user.name.charAt(0)}
             </div>
           )}
           <span className="text-sm text-gray-600 hidden sm:block">
             <span className="font-semibold text-gray-900">{user.name}</span>
           </span>
        </div>
        <Button variant="outline" onClick={onLogout} className="text-sm px-3 py-1">
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    )}
  </nav>
);

interface SidebarProps { 
  user: User; 
  currentView: string; 
  setView: (v: string) => void; 
  isOpen: boolean; 
}

export const Sidebar: React.FC<SidebarProps> = ({ user, currentView, setView, isOpen }) => {
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
    <aside className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0 z-20 w-64 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out pt-16 lg:pt-0`}>
      <div className="p-4 space-y-1">
        {filteredItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === item.id 
                ? 'bg-primary-50 text-primary-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
};
