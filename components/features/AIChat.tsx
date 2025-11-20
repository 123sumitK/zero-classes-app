
import React, { useState } from 'react';
import { askTutor } from '../../services/geminiService';
import { Button, Input, Card } from '../ui/Shared';
import { Sparkles } from 'lucide-react';

export const AIChat: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query) return;
    setLoading(true);
    const answer = await askTutor(query, "General programming and course logistics");
    setResponse(answer);
    setLoading(false);
  };

  return (
    <Card title="AI Tutor Assistant" className="h-full flex flex-col min-h-[500px]">
      <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto max-h-[400px] border border-gray-200">
        {response ? (
          <div className="flex gap-3 animate-in fade-in">
             <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
                <Sparkles size={16} />
             </div>
             <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm border border-gray-100">
                <p className="text-gray-700 text-sm leading-relaxed">{response}</p>
             </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Sparkles className="w-12 h-12 mb-2 opacity-20" />
            <p>Ask me anything about your courses!</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Input 
          placeholder="How do I structure a React component?" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="mb-0"
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
        />
        <Button onClick={handleAsk} disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </Button>
      </div>
    </Card>
  );
};
