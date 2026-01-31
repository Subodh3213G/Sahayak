
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';


import { useState, useEffect, useRef } from 'react';
import { Mic, Check, Loader2, ShieldCheck, ArrowRight, RefreshCcw, Phone, AlertTriangle } from 'lucide-react';

// Type definitions for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'verifying' | 'completed'>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<{ recipient: string; amount: string; upiLink: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const [interimText, setInterimText] = useState('');
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef('');

  const requestMicrophoneAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setError("Microphone permission denied. Check your browser settings.");
      return false;
    }
  };

  const startListening = async () => {
    // Explicitly request permission first
    const hasPermission = await requestMicrophoneAccess();
    if (!hasPermission) return;

    if (recognitionRef.current) {
      try {
        setInterimText('');
        transcriptRef.current = ''; // Reset ref
        setError(null);
        recognitionRef.current.start();
        
        // Safety: Mobile browsers sometimes hang. Force stop after 8 seconds if no result.
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        watchdogRef.current = setTimeout(() => {
            stopListening(); 
        }, 8000);
        
      } catch (e) {
        console.error(e);
        try { recognitionRef.current.stop(); } catch(err) { /* ignore */ }
      }
    } else {
      alert("Speech recognition not supported in this browser.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    // The actual state change happens in onend
  };

  const processCommand = async (text: string) => {
    if (!text || text.trim().length === 0) return;

    // 1. Lock UI immediately
    setStatus('processing');
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Failed to process");

      const data = await response.json();
      setResult(data);
      setStatus('verifying');
      
      // Voice Verification
      speakVerification(data.recipient, data.amount);

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
      const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;
      
      if (SpeechRecognitionConstructor) {
        recognitionRef.current = new SpeechRecognitionConstructor();
        recognitionRef.current.continuous = false; // Mobile: often better as false
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'hi-IN'; 

        recognitionRef.current.onstart = () => {
          setStatus('listening');
          setError(null);
        };

        recognitionRef.current.onresult = (event: any) => {
           if (watchdogRef.current) clearTimeout(watchdogRef.current);
           
           let finalTranscript = '';
           let interimTranscript = '';

           for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
           }
           
           // Update UI
           setInterimText(finalTranscript || interimTranscript);
           
           // Update Ref for safety
           const currentBestText = finalTranscript || interimTranscript;
           if (currentBestText) {
               transcriptRef.current = currentBestText;
           }

           // If we got a final result, we can try to process immediately, 
           // BUT on mobile sometimes it's safer to wait for onend or user stop 
           // to avoid cutting them off. 
           // However, for "One Shot" commands like this, immediate processing on final is good.
           if (finalTranscript) {
               processCommand(finalTranscript);
           }
        };

        recognitionRef.current.onerror = (event: any) => {
          // Ignore errors if we have text captured already, we will try to use it in onend
          console.error("Speech recognition error", event.error);
          if (event.error === 'not-allowed') {
             setStatus('idle');
             setError("Microphone access denied. Use HTTPS.");
          }
        };

        recognitionRef.current.onend = () => {
           // GREEDY SRATEGY: If we have text in the ref, USE IT.
           // Don't just go back to idle.
           const collectedText = transcriptRef.current;
           
           setStatus(prev => {
             // If already processing, do nothing
             if (prev === 'processing' || prev === 'verifying' || prev === 'completed') return prev;
             
             // If we have text, PROCESS IT
             if (collectedText && collectedText.trim().length > 0) {
                 processCommand(collectedText);
                 return 'processing'; // Switch state optimistically
             }
             
             // Otherwise go idle
             return 'idle';
           });
        };
      } else {
        setError("Your browser does not support voice recognition.");
      }
    }
  }, []);

  const speakVerification = (recipient: string, amount: string) => {
    if ('speechSynthesis' in window) {
      // "Pay 500 to Raju" - Simple English verification for clarity, or Hinglish if needed.
      // Prompt says: "Safety Check: The button displays 'Pay ₹500 to Raju'. This gives the senior a moment to verify details."
      // "verification of voice by read loudly"
      const text = `Pay ${amount} rupees to ${recipient}`;
      const utterance = new SpeechSynthesisUtterance(text);
      // specific voice selection could be added here preferably Indian English
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleConfirm = () => {
    if (result?.upiLink) {
      window.location.href = result.upiLink;
      setStatus('completed');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setTranscript('');
    setResult(null);
    setError(null);
  };

  const handleEmergency = () => {
    setStatus('processing');
    
    const triggerSMS = (lat: number | null, long: number | null) => {
        let message = "EMERGENCY! I need help.";
        if (lat && long) {
            const mapLink = `https://maps.google.com/?q=${lat},${long}`;
            message += ` My current location: ${mapLink}`;
        }
        
        // Detect Mobile OS for SMS separator
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const separator = isIOS ? '&' : '?';
        
        // 1. Open Native SMS App (User MUST hit send due to browser security)
        window.location.href = `sms:8866278406${separator}body=${encodeURIComponent(message)}`;
        
        // 2. Also log to backend for demo purposes
        fetch('/api/emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, long }),
        }).catch(e => console.error("Backend log failed", e));
        
        setStatus('idle');
    };

    if (!navigator.geolocation) {
        triggerSMS(null, null);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            triggerSMS(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            console.error(error);
            triggerSMS(null, null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleCall = () => {
      window.location.href = "tel:8866278406";
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-200 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[600px] flex flex-col">
        {/* Header */}
        <header className="bg-blue-600 text-white p-6 text-center">
          <h1 className="text-2xl font-bold tracking-wide">Sahayak <span className="font-light opacity-80">AI</span></h1>
          <p className="text-blue-100 text-sm mt-1">Digital Inclusion for Everyone</p>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 text-center">
            
            {/* IDLE STATE */}
            {status === 'idle' && (
                <>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-slate-800">Who do you want to pay?</h2>
                    <p className="text-slate-500 text-lg">Tap the button and say, <br/> <span className="italic text-slate-800">"Raju ko 500 rupaye bhejo"</span></p>
                  </div>
            
                  <button 
                    onClick={startListening}
                    className="relative group transition-all duration-300 active:scale-95 touch-manipulation"
                    aria-label="Start Listening"
                  >
                    <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 group-hover:scale-110 transition-transform duration-500" />
                    <div className="w-32 h-32 bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-200 group-hover:bg-green-500 transition-colors">
                      <Mic className="w-12 h-12 text-white" />
                    </div>
                  </button>
                  
                  <div className="flex gap-4 mt-8 w-full px-8">
                     <button
                        onClick={handleEmergency}
                        className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white p-4 rounded-xl shadow-lg shadow-red-200 flex flex-col items-center gap-2 transition-all"
                     >
                        <AlertTriangle className="w-8 h-8" />
                        <span className="font-bold">SOS Help</span>
                     </button>
                     
                     <button
                        onClick={handleCall}
                        className="flex-1 bg-white border-2 border-green-500 text-green-600 active:scale-95 p-4 rounded-xl shadow-sm flex flex-col items-center gap-2 transition-all hover:bg-green-50"
                     >
                        <Phone className="w-8 h-8" />
                        <span className="font-bold">Call</span>
                     </button>
                  </div>
                  
                  {error && <p className="text-red-500 font-medium animate-pulse mt-4">{error}</p>}
                </>
            )}

            {/* LISTENING STATE */}
            {status === 'listening' && (
                <>
                  <div className="space-y-4">
                     <h2 className="text-2xl font-semibold text-blue-600 animate-pulse">Listening...</h2>
                     {interimText && <p className="text-slate-500 font-medium px-4">"{interimText}"</p>}
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse-ring opacity-50" />
                    <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                      <Mic className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  
                  <button onClick={stopListening} className="text-slate-400 text-sm underline z-20 p-2">
                    Stop Listening
                  </button>
                </>
            )}

            {/* PROCESSING STATE */}
            {status === 'processing' && (
                <div className="flex flex-col items-center space-y-6">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                    <h2 className="text-xl font-medium text-slate-600">Processing your request...</h2>
                    {transcript && <p className="text-slate-400 italic">"{transcript}"</p>}
                </div>
            )}

            {/* VERIFYING STATE */}
            {status === 'verifying' && result && (
                <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex justify-center mb-2">
                             <ShieldCheck className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-700">Please Confirm</h2>
                        <div className="space-y-1">
                            <p className="text-4xl font-bold text-slate-900">₹{result.amount}</p>
                            <p className="text-lg text-slate-500">to <span className="font-bold text-slate-800">{result.recipient}</span></p>
                        </div>
                    </div>

                    <div className="space-y-3 w-full">
                        <button 
                          onClick={handleConfirm}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                          <span>Confirm & Pay </span>
                          <ArrowRight className="w-6 h-6" />
                        </button>

                        <button 
                           onClick={handleReset}
                           className="w-full bg-white border-2 border-slate-200 text-slate-500 font-semibold py-4 rounded-2xl hover:bg-slate-50 transition-colors"
                        >
                           Cancel
                        </button>
                    </div>
                </div>
            )}
            
            {/* COMPLETED/ACTION STATE */}
            {status === 'completed' && (
                 <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Opening Payment App...</h2>
                    <button onClick={handleReset} className="flex items-center justify-center gap-2 text-blue-600 font-medium mx-auto mt-8">
                        <RefreshCcw className="w-4 h-4" /> Start Over
                    </button>
                 </div>
            )}

        </div>
        
        <footer className="p-4 border-t border-slate-100 text-center text-slate-400 text-xs">
             Sahayak AI Hackathon Demo
        </footer>
      </div>
    </main>
  );
}
