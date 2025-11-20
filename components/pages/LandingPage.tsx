
import React from 'react';
import { User, UserRole } from '../../types';
import { Button } from '../ui/Shared';
import { BookOpen, Calendar, Sparkles } from 'lucide-react';

interface LandingPageProps {
  user: User;
  setView: (v: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ user, setView }) => (
  <div className="flex flex-col gap-8 animate-in fade-in duration-500">
    {/* Hero Section */}
    <div className="relative rounded-2xl overflow-hidden h-[500px] shadow-2xl group">
      <img 
        src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80" 
        alt="Learning Background" 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-transparent flex flex-col justify-center px-8 md:px-16">
        <div className="max-w-2xl space-y-6">
          <div className="inline-block bg-primary-500/20 backdrop-blur-sm border border-primary-500/50 text-primary-200 px-4 py-1 rounded-full text-sm font-medium">
            #1 E-Learning Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Welcome to <span className="text-primary-400">Zero Classes</span>
          </h1>
          <p className="text-lg text-gray-200 leading-relaxed">
            Embark on a journey of limitless learning. Access world-class courses, 
            connect with expert instructors, and master new skills with our 
            AI-powered ecosystem.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Button onClick={() => setView('dashboard')} className="px-8 py-3 text-lg rounded-full shadow-lg shadow-primary-900/20">
              Go to Dashboard
            </Button>
            {user.role === UserRole.STUDENT && (
              <button 
                onClick={() => setView('courses')}
                className="px-8 py-3 text-lg font-medium text-white border-2 border-white/30 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                My Courses
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Quick Access Grid */}
    <div className="grid md:grid-cols-3 gap-6">
      {[
        { 
          title: user.role === UserRole.STUDENT ? 'Browse Catalog' : 'Manage Courses', 
          desc: user.role === UserRole.STUDENT ? 'Discover new skills and enroll in expert-led courses.' : 'Create and update your course content.', 
          icon: <BookOpen className="w-8 h-8 text-blue-500" />, 
          action: () => setView('dashboard'),
          color: 'bg-blue-50 border-blue-100'
        },
        { 
          title: 'Live Schedule', 
          desc: 'Check your upcoming classes and join live video sessions instantly.', 
          icon: <Calendar className="w-8 h-8 text-green-500" />, 
          action: () => setView('schedule'),
          color: 'bg-green-50 border-green-100'
        },
        { 
          title: 'AI Tutor Assistant', 
          desc: 'Stuck? Get instant help and explanations from our Gemini AI tutor.', 
          icon: <Sparkles className="w-8 h-8 text-purple-500" />, 
          action: () => setView('ai-tutor'),
          color: 'bg-purple-50 border-purple-100'
        }
      ].map((item, i) => (
        <div 
          key={i} 
          onClick={item.action}
          className={`p-6 rounded-xl border ${item.color} cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group`}
        >
          <div className="mb-4 p-3 bg-white rounded-lg w-fit shadow-sm group-hover:scale-110 transition-transform">
            {item.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
          <p className="text-gray-600 leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
);
