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

interface ChatViewProps {
  landmark: { name: string };
  onBack: () => void;
}

interface CSVRecord {
  Name: string;
  '2MinDescription': string;
  FollowUpQ1: string;
  FollowUpA1: string;
  FollowUpQ2: string;
  FollowUpA2: string;
}

const ChatView: React.FC<ChatViewProps> = ({ landmark, onBack }) => {
  const [landmarkData, setLandmarkData] = useState<LandmarkData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // For scrolling to bottom

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    setChatMessages([]);
    setInputValue('');
    fetch('/Harvard_Yard_KB_AI_Tour.csv')
      .then(res => {
        if (!res.ok) {
          console.error(`Failed to fetch CSV: ${res.status}`);
          throw new Error(`Failed to fetch CSV: ${res.status}`);
        }
        return res.text();
      })
      .then(csvText => {
        console.log("CSV data fetched successfully");
        Papa.parse<CSVRecord>(csvText, {
          header: true,
          complete: (results) => {
            console.log("CSV parsed, records:", results.data.length);
            const record = results.data.find(r => r.Name === landmark.name);
            if (record) {
              console.log(`Found record for ${landmark.name}`);
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
            } else {
              console.error(`No record found for ${landmark.name}`);
            }
          },
          error: (err) => console.error("CSV parsing error:", err)
        });
      })
      .catch(error => {
        console.error("Error fetching or parsing CSV:", error);
      });
  }, [landmark.name]);

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
    // Same implementation as before
    // ...
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

  // Icons (same as before)
  const BackIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
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
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <button onClick={onBack} className="p-2">
          <BackIcon />
        </button>
        <h2 className="text-lg font-medium">{landmark.name}</h2>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`max-w-[75%] px-4 py-2 rounded-lg ${
            msg.role === 'assistant' ? 'bg-gray-100 self-start' : 'bg-blue-500 text-white self-end'
          }`}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Empty div for scrolling to bottom */}
      </div>
      
      {landmarkData && (
        <div className="px-4 py-2 border-t">
          <div className="flex space-x-2 overflow-x-auto py-1">
            {landmarkData.followUps.map((fu, idx) => (
              <button 
                key={idx} 
                onClick={() => handleFollowUp(fu.q)} 
                disabled={isStreaming}
                className="flex-shrink-0 h-8 flex items-center px-3 bg-gray-200 rounded-full text-sm whitespace-nowrap hover:bg-gray-300"
              >
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
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={isStreaming}
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about this landmark..."
        />
        <button onClick={handleSend} className="p-2">
          {isStreaming ? <StopIcon /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
};

export default ChatView;