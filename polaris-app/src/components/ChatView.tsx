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

// Add new interfaces for audio handling
interface AudioState {
  isPlaying: boolean;
  currentAudio: HTMLAudioElement | null;
  currentUrl: string | null;  // Add tracking of current URL
}

const ChatView: React.FC<ChatViewProps> = ({ landmark, onBack }) => {
  const [landmarkData, setLandmarkData] = useState<LandmarkData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentTextRef = useRef<string>('');
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentAudio: null,
    currentUrl: null,
  });
  const [isMounted, setIsMounted] = useState(true);
  const pendingAudioRef = useRef<{ text: string; controller: AbortController } | null>(null);

  // Helper function to stop current audio playback and pending TTS request
  const stopCurrentAudioAndPendingTTS = () => {
    console.log('[Audio] stopCurrentAudioAndPendingTTS called');
    if (audioState.currentAudio) {
      console.log('[Audio] Pausing current audio');
      audioState.currentAudio.pause();
      // No need to nullify audioState.currentAudio here directly, 
      // setAudioState below will handle it.
    }
    if (audioState.currentUrl) {
      console.log('[Audio] Revoking object URL (from stopCurrentAudioAndPendingTTS):', audioState.currentUrl);
      URL.revokeObjectURL(audioState.currentUrl);
    }
    // Reset audio-specific parts of the state
    setAudioState({ isPlaying: false, currentAudio: null, currentUrl: null });

    if (pendingAudioRef.current) {
      console.log('[Audio] Aborting pending TTS request');
      pendingAudioRef.current.controller.abort();
      pendingAudioRef.current = null;
    }
  };

  // Check if user is at bottom of chat
  const checkIfAtBottom = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      setIsAtBottom(isBottom);
    }
  };

  // Scroll to bottom when messages change, but only if user was at bottom
  useEffect(() => {
    if (chatContainerRef.current && isAtBottom) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isAtBottom]);

  // Add scroll event listener
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkIfAtBottom);
      return () => container.removeEventListener('scroll', checkIfAtBottom);
    }
  }, []);

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
            } else {
              console.error(`No record found for ${landmark.name}`);
            }
          },
          error: (err: Error) => console.error("CSV parsing error:", err)
        });
      })
      .catch(error => {
        console.error("Error fetching or parsing CSV:", error);
      });
  }, [landmark.name]);

  // Function to stop all audio and streaming (now revised)
  const stopAll = () => {
    console.log('[System] stopAll called: Stopping all activities');
    
    // Stop current audio and any pending TTS request first
    stopCurrentAudioAndPendingTTS();

    // Stop text streaming interval
    if (streamIntervalRef.current) {
      console.log('[System] Clearing text stream interval');
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    // Abort chat API fetch request (abortControllerRef is for /api/chat)
    if (abortControllerRef.current) {
      console.log('[System] Aborting chat API request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // pendingAudioRef is handled by stopCurrentAudioAndPendingTTS

    setIsStreaming(false); // stopAll is responsible for resetting isStreaming
    console.log('[System] isStreaming set to false by stopAll');
  };

  // Function to play audio for a given text
  const playAudio = async (text: string) => {
    if (!isMounted) {
      console.log('[Audio] Component unmounted, skipping audio playback');
      return;
    }
    let capturedAudioUrl: string | null = null; // Declare here, initialize to null

    try {
      console.log('[Audio] playAudio starting for text:', text.substring(0, 50) + '...');
      
      // Stop any currently playing audio and pending TTS first, without affecting isStreaming
      stopCurrentAudioAndPendingTTS();

      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create a new abort controller for this TTS request
      const controller = new AbortController();
      pendingAudioRef.current = { text, controller };

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      // Check if component is still mounted
      if (!isMounted) {
        console.log('[Audio] Component unmounted during fetch, aborting');
        return;
      }

      if (!response.ok) throw new Error('Failed to generate audio');

      const isCached = response.headers.get('X-Cache') === 'HIT';
      console.log('[Audio] Response cache status:', isCached ? 'CACHED' : 'NEW');

      const audioBlob = await response.blob();
      
      if (!isMounted) { /* ... */ return; }

      const audioUrl = URL.createObjectURL(audioBlob);
      capturedAudioUrl = audioUrl; // Assign here
      console.log('[Audio] Created object URL:', capturedAudioUrl);

      const audio = new Audio(capturedAudioUrl); // Use capturedAudioUrl
      // const capturedAudioUrl = audioUrl; // This line is removed as it's defined and assigned above

      // Set up error handling
      audio.onerror = (e) => {
        console.error('[Audio] Playback error for URL:', capturedAudioUrl, e);
        setAudioState(prev => {
          if (prev.currentAudio === audio && prev.currentUrl === capturedAudioUrl) {
            if (capturedAudioUrl) URL.revokeObjectURL(capturedAudioUrl); // Check if capturedAudioUrl is not null
            return { isPlaying: false, currentAudio: null, currentUrl: null };
          }
          return prev;
        });
      };

      // Set up completion handling
      audio.onended = () => {
        console.log('[Audio] Playback naturally ended for URL:', capturedAudioUrl);
        setAudioState(prev => {
          if (prev.currentAudio === audio && prev.currentUrl === capturedAudioUrl) {
            if (capturedAudioUrl) URL.revokeObjectURL(capturedAudioUrl); // Check if capturedAudioUrl is not null
            return { isPlaying: false, currentAudio: null, currentUrl: null };
          }
          return prev;
        });
      };

      // Set up loading handling
      audio.onloadstart = () => console.log('[Audio] Loading started');
      audio.onloadeddata = () => console.log('[Audio] Data loaded');
      audio.oncanplay = () => console.log('[Audio] Can play');

      // Clear pending audio reference
      pendingAudioRef.current = null;

      // Set state before playing to prevent race conditions
      setAudioState({ isPlaying: true, currentAudio: audio, currentUrl: audioUrl });
      console.log('[Audio] State updated, attempting playback');
      
      // Play audio after state is set
      try {
        await audio.play();
        console.log('[Audio] Playback started successfully');
      } catch (playError) {
        console.error('[Audio] Play error:', playError);
        stopAll();
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[Audio] TTS Fetch request aborted for text:', text.substring(0, 50) + '...');
      } else {
        console.error('[Audio] Error in playAudio for text:', text.substring(0, 50) + '...', error);
      }
      // Do not call global stopAll here, just ensure local cleanup if needed.
      // stopCurrentAudioAndPendingTTS might have already been called by a subsequent playAudio call.
      // Ensure audio state is cleared if this specific audio attempt failed early.
      setAudioState(prev => {
        // If this text's pending ref was current when error occurred, and not cleared by a new call
        if (pendingAudioRef.current?.text === text) {
            pendingAudioRef.current = null;
        }
        // If an audio object was created and its URL is the one we captured for this attempt
        if (capturedAudioUrl && prev.currentUrl === capturedAudioUrl) { 
             URL.revokeObjectURL(capturedAudioUrl);
             return { isPlaying: false, currentAudio: null, currentUrl: null };
        }
        return prev;
      });
    }
  };

  // Modify streamDescription to prevent duplicate calls
  const streamDescription = (fullText: string) => {
    if (isStreaming) {
      console.log("Already streaming, ignoring request");
      return;
    }
    
    console.log('Starting streamDescription');
    setIsStreaming(true);
    currentTextRef.current = '';
    let position = 0;
    const fullTextLength = fullText.length;
    
    // Start playing audio for the full text
    playAudio(fullText);
    
    streamIntervalRef.current = setInterval(() => {
      currentTextRef.current += fullText[position];
      position++;
      
      setChatMessages(prev => {
        if (prev.length === 0 || prev[prev.length - 1].role !== 'assistant') {
          return [...prev, { role: 'assistant', content: currentTextRef.current }];
        }
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: currentTextRef.current
        };
        return updated;
      });
      
      if (position >= fullTextLength) {
        console.log('Streaming complete');
        clearInterval(streamIntervalRef.current!);
        streamIntervalRef.current = null;
        setIsStreaming(false);
      }
    }, 30);
  };

  // Add useEffect to handle initial description
  useEffect(() => {
    if (landmarkData && chatMessages.length === 0) {
      console.log('Initial description triggered');
      streamDescription(landmarkData.twoMinDescription);
    }
  }, [landmarkData, chatMessages.length]);

  // Modify startAIChat to include audio
  const startAIChat = async (question: string) => {
    if (isStreaming) {
      console.log("Already streaming, ignoring request");
      return;
    }
    
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const body = { landmarkName: landmarkData!.name, question, history: chatMessages };
    
    currentTextRef.current = '';
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
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
      let fullResponse = '';
      
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
                fullResponse += txt;
                currentTextRef.current += txt;
                
                setChatMessages(prev => {
                  const m = [...prev];
                  m[m.length - 1] = { 
                    role: 'assistant', 
                    content: currentTextRef.current
                  };
                  return m;
                });
              }
            } catch {}
          }
        }
      }

      // Play audio for the complete response
      if (fullResponse) {
        playAudio(fullResponse);
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
      stopAll();
    } else if (inputValue.trim() && landmarkData) {
      const q = inputValue.trim();
      setAskedQuestions(prev => new Set(prev).add(q));
      setInputValue('');
      startAIChat(q);
    }
  };

  // Setup and cleanup
  useEffect(() => {
    setIsMounted(true);
    return () => {
      console.log('[Audio] Component unmounting, cleaning up');
      setIsMounted(false);
      stopAll();
    };
  }, []);

  // Filter out already asked follow-up questions
  const availableFollowUps = landmarkData?.followUps.filter(
    fu => !askedQuestions.has(fu.q)
  ) || [];

  // Modify the back button to stop everything
  const handleBack = () => {
    console.log('[Audio] Back button clicked, cleaning up');
    stopAll();
    onBack();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white" style={{backgroundColor: "#fff"}}>
      {/* Header - Fixed positioning and proper layout */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 z-10 sticky top-0" style={{backgroundColor: "#fff"}}>
        <div className="flex-1" /> {/* Spacer */}
        <h1 className="text-sm font-bold text-black flex-1 text-center whitespace-nowrap px-2" style={{fontWeight: 500, color: "#000"}}>
          {landmark.name}
        </h1>
        <div className="flex-1 flex justify-end" style={{paddingRight: "16px"}}> {/* Right-aligned container */}
          <button 
            onClick={handleBack} 
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Close"
            style={{marginRight: "4px"}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>
      
      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white" 
        style={{backgroundColor: "#fff", overflowY: "auto"}}
        onScroll={checkIfAtBottom}
      >
        {chatMessages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            style={{marginBottom: "16px", marginTop: i === 0 ? "24px" : "0"}}
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
        <div className="px-4 py-4 border-t border-gray-200 bg-white" style={{backgroundColor: "#fff", padding: "32px 24px"}}>
          <div className="overflow-x-auto hide-scrollbar">
            <div className="flex space-x-8 py-2 w-max">
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
                    minHeight: "48px",
                    marginRight: "16px"
                  }}
                >
                  {fu.q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Input Area */}
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
            height: "50px",
            fontSize: "16px"
          }}
          placeholder="Ask about this landmark..."
        />
        
        <button 
          onClick={handleSend} 
          disabled={isStreaming && !inputValue.trim()}
          className="flex items-center justify-center ml-4 rounded-full" 
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