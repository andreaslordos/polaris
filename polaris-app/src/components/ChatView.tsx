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
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    // Don't reset chat messages to preserve history
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
              
              // Only stream the description if no chat messages exist
              if (chatMessages.length === 0) {
                streamDescription(data.twoMinDescription);
              }
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

  // Character-by-character streaming
  const streamDescription = (text: string) => {
    setIsStreaming(true);
    
    // Add a new message
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    // Stream the text one character at a time
    let currentText = '';
    let i = 0;
    
    const streamCharacters = () => {
      if (i < text.length) {
        currentText += text.charAt(i);
        setChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: currentText };
          return updated;
        });
        i++;
        streamTimeoutRef.current = setTimeout(streamCharacters, 15); // Faster streaming
      } else {
        setIsStreaming(false);
      }
    };
    
    streamCharacters();
  };

  const startAIChat = async (question: string) => {
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const body = { landmarkName: landmarkData!.name, question, history: chatMessages };
    
    try {
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
                  const m = [...prev];
                  m[aiIndex] = { 
                    role: 'assistant', 
                    content: m[aiIndex]?.content + txt || txt 
                  };
                  return m;
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('Error in chat API:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFollowUp = (q: string) => {
    // Add to asked questions set
    setAskedQuestions(prev => new Set(prev).add(q));
    
    // Add user question to chat
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
      setAskedQuestions(prev => new Set(prev).add(q));
      setChatMessages(prev => [...prev, { role: 'user', content: q }]);
      setInputValue('');
      startAIChat(q);
    }
  };

  useEffect(() => () => { 
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current); 
  }, []);

  // Filter out already asked follow-up questions
  const availableFollowUps = landmarkData?.followUps.filter(
    fu => !askedQuestions.has(fu.q)
  ) || [];

  return (
    <div className="flex flex-col h-screen w-full bg-white" style={{backgroundColor: "#fff"}}>
      {/* Header - with X at top right instead of back arrow */}
      <header className="flex items-center justify-center px-4 py-3 bg-white border-b border-gray-200 z-10 relative" style={{backgroundColor: "#fff"}}>
        <h1 className="text-lg font-bold text-black" style={{fontWeight: 700, color: "#000", position: "absolute", left: "50%", transform: "translateX(-50%)"}}>
          {landmark.name}
        </h1>
        <button 
          onClick={onBack} 
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors absolute right-4"
          aria-label="Close"
          style={{marginTop: "4px", marginRight: "4px"}}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>
      
      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white" 
        style={{backgroundColor: "#fff", overflowY: "auto"}}
      >
        {chatMessages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            style={{marginBottom: "16px"}}
          >
            <div 
              className={`max-w-[85%] rounded-[20px] ${
                msg.role === 'assistant' 
                  ? 'bg-blue-100 text-blue-900 rounded-tl-sm' 
                  : 'bg-[#0B5CD5] text-white rounded-tr-sm'
              }`}
              style={{
                backgroundColor: msg.role === 'assistant' ? "#EBF2FE" : "#0B5CD5", 
                color: msg.role === 'assistant' ? "#1e3a8a" : "#ffffff",
                padding: "16px 20px",
                marginLeft: msg.role === 'assistant' ? "4px" : "auto",
                marginRight: msg.role === 'assistant' ? "auto" : "4px"
              }}
            >
              <p className="text-[16px] leading-[24px]" style={{fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"}}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>
      
      {/* Quick Reply Buttons - only show if there are available follow-ups */}
      {availableFollowUps.length > 0 && (
        <div className="px-4 py-4 border-t border-gray-200 bg-white" style={{backgroundColor: "#fff"}}>
          <div className="overflow-x-auto hide-scrollbar">
            <div className="flex space-x-4 py-2 w-max">
              {availableFollowUps.map((fu, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleFollowUp(fu.q)} 
                  disabled={isStreaming}
                  className="flex-shrink-0 flex items-center whitespace-nowrap transition-colors disabled:opacity-50 font-medium"
                  style={{
                    backgroundColor: "#E6EFFD", 
                    color: "#0B5CD5",
                    padding: "14px 20px",
                    borderRadius: "24px",
                    fontSize: "15px",
                    fontWeight: 500,
                    minHeight: "48px"
                  }}
                >
                  {fu.q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Input Area - slightly shorter, more space between input and button */}
      <div className="flex items-center px-4 py-4 border-t border-gray-200 bg-white" style={{backgroundColor: "#fff"}}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={isStreaming}
          className="flex-1 border border-gray-300 rounded-full text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{
            backgroundColor: "white", 
            color: "#374151",
            padding: "12px 20px",
            height: "50px", // Slightly shorter
            fontSize: "16px"
          }}
          placeholder="Ask about this landmark..."
        />
        
        <button 
          onClick={handleSend} 
          disabled={isStreaming && !inputValue.trim()}
          className="flex items-center justify-center ml-4 rounded-full" // More space between input and button
          style={{
            backgroundColor: isStreaming ? "#ef4444" : "#0B5CD5",
            width: "42px",
            height: "42px"
          }}
          aria-label={isStreaming ? "Stop" : "Send"}
        >
          {isStreaming ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Global styles */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        body, html, div {
          background-color: inherit;
        }
      `}</style>
    </div>
  );
};

export default ChatView;