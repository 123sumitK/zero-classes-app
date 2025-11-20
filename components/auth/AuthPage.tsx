
import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Input, Select, Card } from '../ui/Shared';
import { ShieldCheck, Lock, Smartphone, Mail, User as UserIcon, Key } from 'lucide-react';

interface AuthPageProps {
  onLogin: (u: User) => void;
  showToast: (msg: string, type: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [adminSecret, setAdminSecret] = useState(''); // For Restricted Admin Registration

  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Regex Validators
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidMobile = (m: string) => /^\d{10}$/.test(m);

  const handleSendOTP = async () => {
    if (!isValidMobile(mobile)) {
      showToast('Enter valid 10-digit mobile number', 'error');
      return;
    }
    setIsSendingOtp(true);
    try {
      await storageService.sendOTP(mobile, 'mobile'); 
      setShowOtpInput(true);
      showToast('OTP sent! (Check Server Console)', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to send OTP', 'error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) return;
    try {
      const isValid = await storageService.verifyOTP(mobile, otpCode);
      if (isValid) {
        setIsMobileVerified(true);
        setShowOtpInput(false);
        showToast('Mobile verified successfully', 'success');
      } else {
        showToast('Invalid OTP Code', 'error');
      }
    } catch (e) {
      showToast('Error verifying OTP', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    // Validation
    if (!isValidEmail(email)) return showToast('Invalid Email Address', 'error');
    if (password.length < 6) return showToast('Password must be at least 6 chars', 'error');

    setLoading(true);
    try {
      if (isLogin) {
        const user = await storageService.login(email, password);
        onLogin(user);
        showToast(`Welcome back, ${user.name}!`, 'success');
      } else {
        // Registration Validation
        if (!isMobileVerified) {
          setLoading(false);
          return showToast('Please verify your mobile number first', 'error');
        }
        if (!name) {
          setLoading(false);
          return showToast('Name is required', 'error');
        }

        // Pass extra data (adminSecret) if needed
        const registerData: any = {
          name,
          email,
          password,
          mobile,
          role
        };
        if (role === UserRole.ADMIN) {
          registerData.adminSecret = adminSecret;
        }

        const newUser = await storageService.register(registerData);
        onLogin(newUser);
        showToast('Registration successful!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setIsMobileVerified(false);
    setShowOtpInput(false);
    setOtpCode('');
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-gray-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl">Z</div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          {isLogin ? "Sign in to your account" : "Create a new account"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <button onClick={switchMode} className="font-medium text-primary-600 hover:text-primary-500">
            {isLogin ? 'register for free' : 'login existing account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {!isLogin && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-9 text-gray-400 w-5 h-5 z-10" />
                <Input 
                  label="Full Name"
                  placeholder="John Doe" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="pl-10"
                  required 
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-9 text-gray-400 w-5 h-5 z-10" />
              <Input 
                label="Email Address"
                type="email" 
                placeholder="user@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="pl-10"
                required 
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Verification</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-2.5 text-gray-400 w-5 h-5 z-10" />
                    <Input 
                      placeholder="Mobile (10 digits)" 
                      value={mobile} 
                      onChange={e => setMobile(e.target.value)} 
                      className="mb-0 pl-10"
                      disabled={isMobileVerified}
                      maxLength={10}
                    />
                    {isMobileVerified && <ShieldCheck className="absolute right-3 top-2.5 text-green-500 w-5 h-5 z-10" />}
                  </div>
                  {!isMobileVerified && (
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleSendOTP} 
                      disabled={isSendingOtp}
                      className="whitespace-nowrap h-[42px]"
                    >
                      {isSendingOtp ? '...' : 'Get OTP'}
                    </Button>
                  )}
                </div>
                
                {showOtpInput && !isMobileVerified && (
                  <div className="mt-2 flex gap-2 animate-in slide-in-from-top-2">
                    <Input 
                      placeholder="Enter 4-digit Code" 
                      value={otpCode} 
                      onChange={e => setOtpCode(e.target.value)} 
                      className="mb-0 bg-gray-50"
                    />
                    <Button type="button" onClick={handleVerifyOTP} variant="primary" className="h-[42px]">Verify</Button>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-9 text-gray-400 w-5 h-5 z-10" />
              <Input 
                label="Password"
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="pl-10"
                required 
              />
            </div>

            {!isLogin && (
              <>
                <Select 
                  label="I want to join as:"
                  options={[
                    { value: UserRole.STUDENT, label: 'Student' },
                    { value: UserRole.INSTRUCTOR, label: 'Instructor' },
                    { value: UserRole.ADMIN, label: 'Admin (Restricted)' }
                  ]} 
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                />

                {role === UserRole.ADMIN && (
                  <div className="relative animate-in fade-in slide-in-from-top-1 bg-purple-50 p-4 rounded-md border border-purple-200">
                    <Key className="absolute left-6 top-11 text-purple-500 w-5 h-5 z-10" />
                    <Input 
                      label="Admin Secret Key"
                      type="password" 
                      placeholder="Enter secret key" 
                      value={adminSecret} 
                      onChange={e => setAdminSecret(e.target.value)} 
                      className="pl-10 mb-0 border-purple-300 focus:ring-purple-500"
                      required={role === UserRole.ADMIN}
                    />
                    <p className="text-xs text-purple-700 mt-1">
                      * A secret key is required to create an Admin account.
                    </p>
                  </div>
                )}
              </>
            )}

            <Button type="submit" className="w-full py-3 text-lg shadow-sm" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Create Account')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
