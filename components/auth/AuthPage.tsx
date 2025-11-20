
import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Input, Select, Card } from '../ui/Shared';
import { ShieldCheck, Lock, Smartphone, Mail, User as UserIcon } from 'lucide-react';

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

  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const handleSendOTP = async () => {
    if (!mobile || mobile.length < 10) {
      showToast('Please enter a valid mobile number', 'error');
      return;
    }
    setIsSendingOtp(true);
    try {
      await storageService.sendOTP(mobile);
      setShowOtpInput(true);
      showToast('OTP sent to mobile!', 'success');
    } catch (e) {
      showToast('Failed to send OTP', 'error');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        if (!email || !password) return showToast('Please fill all fields', 'error');
        
        const user = storageService.login(email, password);
        if (user) {
          onLogin(user);
          showToast(`Welcome back, ${user.name}!`, 'success');
        } else {
          showToast('Invalid email or password.', 'error');
        }
      } else {
        // Registration Validation
        if (!isMobileVerified) return showToast('Please verify your mobile number', 'error');
        if (!name || !email || !password) return showToast('Please fill all fields', 'error');

        const newUser = storageService.register({
          name,
          email,
          password,
          mobile,
          role
        });
        onLogin(newUser);
        showToast('Registration successful!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing request', 'error');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    // Reset Registration States
    setIsMobileVerified(false);
    setShowOtpInput(false);
    setOtpCode('');
    setMobile('');
    setName('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200 p-4">
      <Card className="w-full max-w-md shadow-xl" title={isLogin ? "Login to Zero Classes" : "Create Account"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
             <div className="relative">
                <UserIcon className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
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
            <Mail className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mobile Verification</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Smartphone className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                  <Input 
                    placeholder="Mobile Number" 
                    value={mobile} 
                    onChange={e => setMobile(e.target.value)} 
                    className="mb-0 pl-10"
                    disabled={isMobileVerified}
                  />
                  {isMobileVerified && <ShieldCheck className="absolute right-3 top-2.5 text-green-500 w-5 h-5" />}
                </div>
                {!isMobileVerified && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleSendOTP} 
                    disabled={isSendingOtp}
                    className="whitespace-nowrap"
                  >
                    {isSendingOtp ? 'Sending...' : 'Get OTP'}
                  </Button>
                )}
              </div>
              
              {showOtpInput && !isMobileVerified && (
                <div className="flex gap-2 animate-in slide-in-from-top-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <Input 
                    placeholder="Enter 4-digit code" 
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value)} 
                    className="mb-0 bg-white"
                  />
                  <Button type="button" onClick={handleVerifyOTP} variant="primary">Verify</Button>
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
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
            <Select 
              label="I want to join as:"
              options={[
                { value: UserRole.STUDENT, label: 'Student' },
                { value: UserRole.INSTRUCTOR, label: 'Instructor' }
              ]} 
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            />
          )}

          <Button type="submit" className="w-full py-3 text-lg mt-4" disabled={!isLogin && !isMobileVerified}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={switchMode} className="text-primary-600 hover:underline font-bold">
            {isLogin ? 'Register Now' : 'Login Here'}
          </button>
        </div>
        
        {isLogin && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-100">
            <p className="font-bold mb-2 flex items-center"><Lock className="w-3 h-3 mr-1"/> Demo Access:</p>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="font-semibold">Admin:</span> admin@zero.com</div>
              <div><span className="font-semibold">Pass:</span> password123</div>
              <div><span className="font-semibold">Instructor:</span> teach@zero.com</div>
              <div><span className="font-semibold">Pass:</span> password123</div>
              <div><span className="font-semibold">Student:</span> student@zero.com</div>
              <div><span className="font-semibold">Pass:</span> password123</div>
            </div>
          </div>
        )}
        {!isLogin && (
          <div className="mt-4 text-center text-xs text-gray-500 italic">
            * For demo purposes, the OTP code is always <strong>1234</strong>
          </div>
        )}
      </Card>
    </div>
  );
};
