
import React, { useState } from 'react';
import { User, ThemeOption, UserRole } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Input, Select, Card } from '../ui/Shared';
import { Camera, User as UserIcon, Moon, Sun, Palette, Save, ShieldCheck } from 'lucide-react';

const CLOUD_NAME = 'dj0tdcc8f'; 
const UPLOAD_PRESET = 'zero_classes_preset';

interface ProfileManagerProps {
  user: User;
  refreshUser: () => void;
  showToast: (msg: string, type: any) => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({ user, refreshUser, showToast }) => {
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState<ThemeOption>(user.theme || 'bright');
  
  // Basic Edit Fields
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile || '');
  const [newMobile, setNewMobile] = useState('');
  const [showMobileUpdate, setShowMobileUpdate] = useState(false);
  
  // OTP State for Mobile
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Instructor Fields
  const [qual, setQual] = useState(user.instructorProfile?.qualification || '');
  const [exp, setExp] = useState(user.instructorProfile?.experience || '');
  const [bio, setBio] = useState(user.instructorProfile?.bio || '');

  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await storageService.uploadToCloudinary(file, CLOUD_NAME, UPLOAD_PRESET);
      await storageService.updateUser(user.id, { profileImage: url });
      await refreshUser();
      showToast('Profile picture updated!', 'success');
    } catch (e) {
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeOption) => {
    setTheme(newTheme);
    try {
      await storageService.updateUser(user.id, { theme: newTheme });
      await refreshUser();
      showToast('Theme updated', 'success');
    } catch (e) {
      showToast('Failed to update theme', 'error');
    }
  };

  // Mobile Update Logic
  const initiateMobileUpdate = async () => {
    if (!newMobile || newMobile.length < 10) return showToast('Invalid mobile number', 'error');
    try {
      await storageService.sendOTP(newMobile, 'mobile');
      setOtpSent(true);
      showToast('OTP sent to new number', 'success');
    } catch(e) { showToast('Failed to send OTP', 'error'); }
  };

  const verifyAndUpdateMobile = async () => {
    try {
      const verified = await storageService.verifyOTP(newMobile, otpCode);
      if(verified) {
        await storageService.updateUser(user.id, { mobile: newMobile });
        await refreshUser();
        setMobile(newMobile);
        setShowMobileUpdate(false);
        setOtpSent(false);
        showToast('Mobile Number Updated!', 'success');
      } else {
        showToast('Invalid OTP', 'error');
      }
    } catch(e) { showToast('Verification failed', 'error'); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
       const updates: Partial<User> = { name };
       if (user.role === UserRole.INSTRUCTOR) {
         updates.instructorProfile = { qualification: qual, experience: exp, bio };
       }
       await storageService.updateUser(user.id, updates);
       await refreshUser();
       showToast('Profile details saved', 'success');
    } catch(e) {
       showToast('Failed to save profile', 'error');
    } finally {
       setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card title="My Profile">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 mb-4">
            {user.profileImage ? (
              <img src={user.profileImage} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-primary-100" />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                <UserIcon size={48} />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-primary-500 text-white p-2 rounded-full cursor-pointer hover:bg-primary-600 transition-colors shadow-lg">
              <Camera size={16} />
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
            </label>
          </div>
          <p className="text-gray-500 uppercase text-sm tracking-wide font-bold">{user.role}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-bold text-gray-700 border-b pb-2">Basic Details</h4>
            <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Email" value={user.email} disabled className="bg-gray-100 text-gray-500" />
            
            <div className="relative">
               <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
               <div className="flex gap-2">
                 <input className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600" value={mobile} disabled />
                 <Button size="sm" variant="outline" onClick={() => setShowMobileUpdate(!showMobileUpdate)}>Update</Button>
               </div>
            </div>

            {showMobileUpdate && (
               <div className="p-4 bg-blue-50 rounded-md border border-blue-100 animate-in fade-in">
                  <h5 className="font-bold text-sm text-blue-800 mb-2">Update Mobile Number</h5>
                  <div className="flex gap-2 mb-2">
                     <Input placeholder="New Number" value={newMobile} onChange={e => setNewMobile(e.target.value)} className="mb-0" />
                     {!otpSent && <Button size="sm" onClick={initiateMobileUpdate}>Send OTP</Button>}
                  </div>
                  {otpSent && (
                    <div className="flex gap-2">
                       <Input placeholder="Enter OTP" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="mb-0" />
                       <Button size="sm" onClick={verifyAndUpdateMobile}>Verify & Save</Button>
                    </div>
                  )}
               </div>
            )}
          </div>

          {user.role === UserRole.INSTRUCTOR && (
             <div className="space-y-4">
               <h4 className="font-bold text-gray-700 border-b pb-2">Instructor Profile <span className="text-red-500 text-xs">*Mandatory</span></h4>
               <Input label="Qualification" placeholder="e.g. PhD in Physics" value={qual} onChange={e => setQual(e.target.value)} />
               <Input label="Experience" placeholder="e.g. 10 Years" value={exp} onChange={e => setExp(e.target.value)} />
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Me (Bio)</label>
                  <textarea className="w-full border rounded p-2 text-sm" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell students about yourself..."></textarea>
               </div>
             </div>
          )}
        </div>

        <Button onClick={handleSaveProfile} disabled={saving} className="w-full mt-6 flex items-center justify-center gap-2">
          {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
        </Button>
      </Card>

      <Card title="Appearance & Theme">
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'bright', label: 'Bright', icon: <Sun size={20} />, color: 'bg-white border-gray-200' },
            { id: 'light-bright', label: 'Warm', icon: <Palette size={20} />, color: 'bg-orange-50 border-orange-200' },
            { id: 'dark', label: 'Dark', icon: <Moon size={20} />, color: 'bg-gray-900 text-white border-gray-700' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id as ThemeOption)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${t.color} ${theme === t.id ? 'ring-2 ring-primary-500 ring-offset-2 border-primary-500' : 'hover:border-gray-300'}`}
            >
              <div className="mb-2">{t.icon}</div>
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
