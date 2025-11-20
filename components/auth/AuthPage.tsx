
import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Input, Select } from '../ui/Shared';
import { ShieldCheck, Lock, Smartphone, Mail, User as UserIcon, Key, Globe } from 'lucide-react';

interface AuthPageProps {
  onLogin: (u: User) => void;
  showToast: (msg: string, type: any) => void;
}

const COUNTRY_CODES = [
  { code: '+91', label: 'IN (+91)', len: 10 },
  { code: '+1',  label: 'US (+1)',  len: 10 },
  { code: '+44', label: 'UK (+44)', len: 10 },
  { code: '+61', label: 'AU (+61)', len: 9 },
];

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [adminSecret, setAdminSecret] = useState(''); 

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation Helpers
  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p: string) => {
    // Min 6 chars, 1 letter, 1 number
    return p.length >= 6 && /[a-zA-Z]/.test(p) && /\d/.test(p);
  };
  
  const getPhoneLength = () => COUNTRY_CODES.find(c => c.code === countryCode)?.len || 10;

  const handleSendOTP = async () => {
    const reqLen = getPhoneLength();
    if (!mobile || mobile.length !== reqLen) {
      setErrors(prev => ({ ...prev, mobile: `Mobile number must be ${reqLen} digits for ${countryCode}` }));
      return;
    } else {
      setErrors(prev => ({ ...prev, mobile: '' }));
    }

    setIsSendingOtp(true);
    try {
      await storageService.sendOTP(mobile, 'mobile'); 
      setShowOtpInput(true);
      showToast('OTP sent! (Check Render Server Logs)', 'success');
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
        setErrors(prev => ({ ...prev, mobile: '' }));
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

    // Clear prev errors
    const newErrors: Record<string, string> = {};
    
    // Validate
    if (!validateEmail(email)) newErrors.email = "Invalid email format";
    if (!validatePassword(password)) newErrors.password = "Password must be 6+ chars with letters & numbers";
    
    if (!isLogin) {
       if (!name.trim()) newErrors.name = "Name is required";
       if (!isMobileVerified) newErrors.mobile = "Please verify mobile number first";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const user = await storageService.login(email, password);
        onLogin(user);
        showToast(`Welcome back, ${user.name}!`, 'success');
      } else {
        // Registration
        const registerData: any = {
          name,
          email,
          password,
          mobile,
          countryCode,
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
      if (err.message.includes('email')) setErrors(prev => ({ ...prev, email: err.message }));
      if (err.message.includes('Secret')) setErrors(prev => ({ ...prev, admin: err.message }));
    } finally {
      setLoading(false);
    }
  };

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
          <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary-600 hover:text-primary-500">
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
                  className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
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
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Verification</label>
                <div className="flex gap-2">
                  <div className="w-28">
                    <Select 
                      options={COUNTRY_CODES.map(c => ({ value: c.code, label: c.label }))}
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="mb-0"
                    />
                  </div>
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-2.5 text-gray-400 w-5 h-5 z-10" />
                    <Input 
                      placeholder="Mobile Number" 
                      value={mobile} 
                      onChange={e => setMobile(e.target.value.replace(/\D/g,''))} 
                      className={`mb-0 pl-10 ${errors.mobile ? 'border-red-500' : ''}`}
                      disabled={isMobileVerified}
                      maxLength={15}
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
                {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
                
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
                className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
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
                    {errors.admin && <p className="text-xs text-red-500 mt-1">{errors.admin}</p>}
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
