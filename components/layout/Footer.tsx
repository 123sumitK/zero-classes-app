import React, { useEffect, useState } from 'react';
import { Twitter, Facebook, Linkedin, Instagram, Heart } from 'lucide-react';
import { storageService } from '../../services/storage';
import { PlatformSettings } from '../../types';

export const Footer: React.FC = () => {
    const [settings, setSettings] = useState<PlatformSettings>({
        copyrightText: '© 2025 Zero Classes. All rights reserved.',
        version: '1.0.0',
        socialLinks: {}
    });

    useEffect(() => {
        const loadSettings = async () => {
            const s = await storageService.getPlatformSettings();
            // Merge with defaults to ensure socialLinks exists even if API returns partial data
            if(s) {
                setSettings(prev => ({
                    ...prev,
                    ...s,
                    socialLinks: s.socialLinks || {}
                }));
            }
        };
        loadSettings();
    }, []);

    return (
        <footer className="bg-white border-t border-gray-200 mt-auto py-6 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-500">
                    {settings.copyrightText}
                </div>

                <div className="flex items-center gap-4">
                    {settings.socialLinks?.twitter && (
                        <a href={settings.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors"><Twitter size={18} /></a>
                    )}
                    {settings.socialLinks?.facebook && (
                        <a href={settings.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors"><Facebook size={18} /></a>
                    )}
                    {settings.socialLinks?.linkedin && (
                        <a href={settings.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-700 transition-colors"><Linkedin size={18} /></a>
                    )}
                    {settings.socialLinks?.instagram && (
                        <a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors"><Instagram size={18} /></a>
                    )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">Made with <Heart size={12} className="text-red-400 fill-red-400" /> by Zero Team</span>
                    <span>v{settings.version}</span>
                </div>
            </div>
        </footer>
    );
};