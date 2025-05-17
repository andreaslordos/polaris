'use client';

import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';

interface FollowUp {
  q: string;
  a: string;
}

interface LandmarkData {
  name: string;
  twoMinDescription: string;
  followUps: FollowUp[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatModalProps {
  isOpen: boolean;
  landmark: { name: string } | null;
  onClose: () => void;
}

interface CSVRecord {
  Name: string;
  '2MinDescription': string;
  FollowUpQ1: string;
  FollowUpA1: string;
  FollowUpQ2: string;
  FollowUpA2: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, landmark, onClose }) => {
  const [landmarkData, setLandmarkData] = useState<LandmarkData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && landmark) {
      setChatMessages([]);
      setInputValue('');
      fetch('/Harvard_Yard_KB_AI_Tour.csv')
        .then(res => res.text())
        .then(csvText => {
          Papa.parse<CSVRecord>(csvText, {
            header: true,
            complete: (results) => {
              const record = results.data.find(r => r.Name === landmark.name);
              if (record) {
                const data: LandmarkData = {
                  name: record.Name,
                  twoMinDescription: record['2MinDescription'],
                  followUps: [
                    { q: record.FollowUpQ1, a: record.FollowUpA1 },
                    { q: record.FollowUpQ2, a: record.FollowUpA2 },
                  ],
                };
                setLandmarkData(data);
                streamDescription(data.twoMinDescription);
              }
            },
          });
        });
    }
  }, [isOpen, landmark]);

  const streamDescription = (text: string) => {
    setIsStreaming(true);
    let idx = 0;
    const words = text.split(' ');
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    const step = () => {
      if (idx < words.length) {
        setChatMessages(prev => {
          const last = { ...prev[prev.length - 1] };
          last.content += (idx === 0 ? '' : ' ') + words[idx];
          return [...prev.slice(0, prev.length - 1), last];
        });
        if (navigator.vibrate) navigator.vibrate(10);
        idx++;
        streamTimeoutRef.current = setTimeout(step, 100);
      } else {
        setIsStreaming(false);
      }
    };
    step();
  };

  const startAIChat = async (question: string) => {
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const body = { landmarkName: landmarkData!.name, question, history: chatMessages };
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error('Chat API error');
      setIsStreaming(false);
      return;
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let done = false;
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    const aiIndex = chatMessages.length;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) {
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data:'));
        for (const l of lines) {
          const data = l.replace(/^data: /, '').trim();
          if (data === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(data);
            const txt = parsed.choices[0].delta?.content;
            if (txt) {
              setChatMessages(prev => {
                const m = { ...prev[aiIndex] };
                m.content += txt;
                return [...prev.slice(0, aiIndex), m, ...prev.slice(aiIndex+1)];
              });
              if (navigator.vibrate) navigator.vibrate(10);
            }
          } catch {}
        }
      }
    }
    setIsStreaming(false);
  };

  const handleFollowUp = (q: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: q }]);
    const fu = landmarkData?.followUps.find(f => f.q === q);
    if (fu) streamDescription(fu.a);
    else startAIChat(q);
  };

  const handleSend = () => {
    if (isStreaming) {
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    } else if (inputValue.trim() && landmarkData) {
      const q = inputValue.trim();
      setChatMessages(prev => [...prev, { role: 'user', content: q }]);
      setInputValue('');
      startAIChat(q);
    }
  };

  useEffect(() => () => { if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current); }, []);

  if (!isOpen || !landmark) return null;

  const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
  const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 rotate-90" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
  const StopIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
    </svg>
  );
  const MicIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10a7 7 0 01-14 0" />
      <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="12" y1="18" x2="12" y2="23" />
      <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className={`transform ${isOpen ? 'translate-y-0' : 'translate-y-full'} transition-transform duration-300 ease-in-out w-full max-h-[95vh] bg-white rounded-t-3xl shadow-xl flex flex-col overflow-hidden`}>
        <div className="w-12 h-1 bg-gray-300 rounded-full self-center mt-2" />
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h2 className="text-lg font-medium">{landmark.name}</h2>
          <button onClick={onClose} className="p-2"><CloseIcon /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`max-w-[75%] px-4 py-2 rounded-lg ${msg.role==='assistant'?'bg-gray-100 self-start':'bg-blue-500 text-white self-end'}`}>{msg.content}</div>
          ))}
        </div>
        {landmarkData && (
          <div className="px-4 py-2 border-t">
            <div className="flex space-x-2 overflow-x-auto py-1">
              {landmarkData.followUps.map((fu, idx)=>(
                <button key={idx} onClick={()=>handleFollowUp(fu.q)} disabled={isStreaming}
                  className="flex-shrink-0 h-8 flex items-center px-3 bg-gray-200 rounded-full text-sm whitespace-nowrap hover:bg-gray-300">
                  {fu.q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center space-x-2 px-4 py-2 border-t">
          <button disabled className="p-2"><MicIcon /></button>
          <input
            type="text"
            value={inputValue}
            onChange={e=>setInputValue(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')handleSend();}}
            disabled={isStreaming}
            className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSend} className="p-2">{isStreaming?<StopIcon/>:<SendIcon/>}</button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal; 