import React from 'react';
import { AlertCircle, CheckCircle, Info, X, Check, User, Edit3, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ToastMessage, UserRole } from '../../types';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle = "rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";
  const variants = {
    primary: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border-2 border-amber-500 text-amber-600 hover:bg-amber-50 focus:ring-amber-500",
    accent: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500" // New Vibrant Color
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- PAGE HEADER ---
interface PageHeaderProps {
  title: string;
  description: string;
  imageSrc?: string;
  icon?: React.ReactNode;
  theme?: 'blue' | 'purple' | 'amber' | 'green';
}
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, imageSrc, icon, theme = 'blue' }) => {
  const themes = {
    blue: 'from-blue-600 to-indigo-700',
    purple: 'from-purple-600 to-pink-600',
    amber: 'from-amber-500 to-orange-600',
    green: 'from-emerald-500 to-teal-600',
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-xl mb-8 bg-gradient-to-r ${themes[theme]}`}>
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="text-center md:text-left max-w-2xl">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2 text-white/80">
            {icon}
            <span className="text-sm font-bold uppercase tracking-wider">Zero Classes</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">{title}</h1>
          <p className="text-white/90 text-lg leading-relaxed">{description}</p>
        </div>
        {imageSrc && (
          <div className="hidden md:block shrink-0">
            <img src={imageSrc} alt="Header Illustration" className="h-32 w-auto drop-shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500" />
          </div>
        )}
      </div>
    </div>
  );
};

// --- BADGE ---
export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'blue' | 'red' | 'yellow' | 'gray'; className?: string }> = ({ children, color = 'gray', className = '' }) => {
  const colors = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[color]} ${className}`}>{children}</span>;
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all ${className}`}
      {...props}
    />
  </div>
);

// --- SEARCH INPUT ---
export const SearchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <div className={`relative ${className}`}>
    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
    <input
      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-full shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm transition-all focus:w-full md:focus:w-64"
      placeholder="Search..."
      {...props}
    />
  </div>
);

// --- CHECKBOX ---
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', ...props }) => (
  <label className={`flex items-center space-x-2 cursor-pointer ${className}`}>
    <div className="relative">
      <input type="checkbox" className="peer sr-only" {...props} />
      <div className="w-5 h-5 border-2 border-gray-300 rounded bg-white peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-all"></div>
      <Check className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
    </div>
    {label && <span className="text-sm text-gray-700 select-none">{label}</span>}
  </label>
);

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}
export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${className}`}
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- CARD ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
}
export const Card: React.FC<CardProps> = ({ children, className = '', title, ...props }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`} {...props}>
    {title && <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-50 pb-2">{title}</h3>}
    {children}
  </div>
);

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          {title && <h3 className="font-bold text-lg text-gray-800">{title}</h3>}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 shadow-sm">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- PAGINATION ---
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
        Page {currentPage} / {totalPages}
      </span>
      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

// --- SKELETON ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// --- PROGRESS BAR ---
export const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <div className={`w-full bg-gray-100 rounded-full h-3 ${className}`}>
    <div 
      className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-1000 ease-out shadow-sm" 
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    ></div>
  </div>
);

// --- AUDIT TAG ---
interface AuditTagProps {
  createdBy?: string;
  lastEditedBy?: string;
  updatedAt?: string;
  userRole: UserRole;
}
export const AuditTag: React.FC<AuditTagProps> = ({ createdBy, lastEditedBy, updatedAt, userRole }) => {
  if (userRole === UserRole.STUDENT) return null;
  if (!createdBy && !lastEditedBy) return null;

  return (
    <div className="flex items-center gap-3 mt-3 text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
      {lastEditedBy ? (
        <div className="flex items-center gap-1">
          <Edit3 size={12} /> Edited by {lastEditedBy}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <User size={12} /> Created by {createdBy}
        </div>
      )}
      {updatedAt && (
        <span>• {new Date(updatedAt).toLocaleDateString()}</span>
      )}
    </div>
  );
};

// --- TOAST ---
export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-2xl text-white min-w-[320px] animate-bounce-in border border-white/20 backdrop-blur-md
            ${toast.type === 'success' ? 'bg-green-600/90' : toast.type === 'error' ? 'bg-red-600/90' : 'bg-blue-600/90'}
          `}
        >
          {toast.type === 'success' && <CheckCircle className="w-6 h-6 mr-3" />}
          {toast.type === 'error' && <AlertCircle className="w-6 h-6 mr-3" />}
          {toast.type === 'info' && <Info className="w-6 h-6 mr-3" />}
          <span className="flex-1 font-medium">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-3 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
};