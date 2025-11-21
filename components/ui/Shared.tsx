
import React from 'react';
import { AlertCircle, CheckCircle, Info, X, Check, User, Edit3 } from 'lucide-react';
import { ToastMessage, UserRole } from '../../types';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle = "rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-500"
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

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
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
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`} {...props}>
    {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}
    {children}
  </div>
);

// --- SKELETON ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// --- PROGRESS BAR ---
export const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
    <div 
      className="bg-primary-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
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
  if (userRole === UserRole.STUDENT) return null; // Hide from students
  
  if (!createdBy && !lastEditedBy) return null;

  return (
    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
      {lastEditedBy ? (
        <div className="flex items-center gap-1">
          <Edit3 size={10} /> Edited by <span className="font-medium">{lastEditedBy}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <User size={10} /> Created by <span className="font-medium">{createdBy}</span>
        </div>
      )}
      {updatedAt && (
        <span className="text-gray-400">
          • {new Date(updatedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};


// --- TOAST ---
export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center p-4 rounded-lg shadow-lg text-white min-w-[300px] animate-bounce-in
            ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}
          `}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 mr-3" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 mr-3" />}
          {toast.type === 'info' && <Info className="w-5 h-5 mr-3" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-3 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
