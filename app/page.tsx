/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, AlertTriangle, Phone, Check, Loader2, X, Users } from 'lucide-react';

// Types
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

type Status = 'idle' | 'listening' | 'processing' | 'verifying' | 'scam' | 'completed';
type Intent = 'pay' | 'call' | 'scam' | 'unknown';

interface Result {
  intent: Intent;
  details: {
    amount?: string;
    recipient?: string;
    number?: string;
    // UPI app deep links
    phonepeLink?: string;
    gpayLink?: string;
    paytmLink?: string;
    upiLink?: string; // Generic UPI fallback
    upiId?: string;
    // Contact/phone deep links
    deepLink?: string; // Android intent for contacts search
    telLink?: string; // Direct tel fallback
  };
  warning?: string;
  originalText: string;
}

interface Contact {
  name: string;
  tel: string;
  upiId?: string; // UPI VPA from email field
}

export default function Home() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [hasContactPermission, setHasContactPermission] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // Check if Contact Picker API is supported
  useEffect(() => {
    if ('contacts' in navigator) {
      setHasContactPermission(true);
      console.log("✅ Contact Picker API is available");
    } else {
      console.log("⚠️ Contact Picker API not supported - will use fallback contacts");
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (!Recognition) {
      setError("Voice not supported in this browser");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // English-India for Roman script
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎤 RECORDING...");
      setStatus('listening');
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      console.log("🎤 HEARD:", text);
      setTranscript(text);
      processCommand(text);
    };

    recognition.onerror = (event: any) => {
      console.error("🎤 ERROR:", event.error);
      setStatus('idle');
      
      if (event.error === 'not-allowed') {
        setError("Microphone blocked. Please allow access.");
      } else if (event.error === 'network') {
        setError("Network error. Check internet connection.");
      } else if (event.error !== 'no-speech') {
        setError("Could not hear you. Try again.");
      }
    };

    recognition.onend = () => {
      console.log("🎤 STOPPED");
    };

    recognitionRef.current = recognition;
  }, []);

  // Load device contacts
  const loadContacts = async () => {
    if (!('contacts' in navigator)) {
      alert("Contact access not supported on this browser. Using fallback contacts.");
      return;
    }

    try {
      const props = ['name', 'tel', 'email']; // Added email for UPI IDs
      // @ts-ignore - Contact Picker API
      const selectedContacts = await navigator.contacts.select(props, { multiple: true });
      
      const formattedContacts: Contact[] = selectedContacts
        .filter((c: any) => c.name && c.tel && c.tel.length > 0)
        .map((c: any) => ({
          name: c.name[0].toLowerCase(),
          tel: c.tel[0],
          upiId: c.email && c.email.length > 0 ? c.email[0] : undefined // Store UPI ID from email
        }));
      
      setContacts(formattedContacts);
      const withUpi = formattedContacts.filter(c => c.upiId).length;
      
      console.log("📇 ═══════════════════════════");
      console.log("📇 CONTACTS LOADED");
      console.log("📇 Total:", formattedContacts.length);
      console.log("📇 With UPI IDs:", withUpi);
      console.log("📇 Sample contacts:");
      formattedContacts.slice(0, 5).forEach(c => {
        console.log(`   - ${c.name}: ${c.tel}${c.upiId ? ' [UPI: ' + c.upiId + ']' : ' [No UPI]'}`);
      });
      console.log("📇 ═══════════════════════════");
      
      alert(`✅ Loaded ${formattedContacts.length} contacts!\n${withUpi} contacts have UPI IDs.`);
    } catch (err) {
      console.error("Failed to load contacts:", err);
      alert("Could not load contacts. Please try again or use fallback mode.");
    }
  };

  // Process command
  const processCommand = async (text: string) => {
    console.log("\n⚙️ ═══════════════════════════");
    console.log("⚙️ PROCESSING COMMAND");
    console.log("⚙️ Text received:", text);
    console.log("⚙️ Available contacts:", contacts.length);
    console.log("⚙️ ═══════════════════════════\n");
    setStatus('processing');

    try {
      // Send both text and contacts to backend
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          contacts: contacts // Send user's contacts
        }),
      });

      const data: Result = await res.json();
      console.log("\n📦 ═══════════════════════════");
      console.log("📦 API RESPONSE");
      console.log("📦 Intent:", data.intent);
      console.log("📦 Details:", data.details);
      console.log("📦 Warning:", data.warning);
      console.log("📦 ═══════════════════════════\n");
      
      setResult(data);

      if (data.intent === 'scam') {
        console.log("⚠️ SCAM PATH");
        setStatus('scam');
        speak(data.warning || "SCAM ALERT!");
      } else if (data.intent === 'unknown') {
        console.log("❓ UNKNOWN PATH");
        setStatus('idle');
        setError(data.warning || "I didn't understand");
        speak(data.warning || "I didn't understand");
      } else {
        console.log("✅ VALID INTENT PATH - Going to VERIFYING");
        setStatus('verifying');
        
        // Speak verification
        if (data.intent === 'pay') {
          let msg = `I am ready to pay ${data.details.amount} rupees to ${data.details.recipient}. Is this correct?`;
          if (data.warning) {
            msg += ` Warning: ${data.warning}`;
          }
          console.log("💰 PAYMENT verification:", msg);
          speak(msg);
        } else if (data.intent === 'call') {
          const msg = `I am ready to call ${data.details.recipient}. Is this correct?`;
          console.log("📞 CALL verification:", msg);
          speak(msg);
        }
      }
    } catch (err) {
      console.error("💥 ERROR:", err);
      setStatus('idle');
      setError("Network error. Try again.");
    }
  };

  // Text to Speech
  const speak = (text: string) => {
    console.log("🔊 SPEAKING:", text);
    
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => console.log("🔊 STARTED");
      utterance.onend = () => console.log("🔊 ENDED");
      utterance.onerror = () => console.log("🔊 FAILED (continuing...)");
      
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  // Actions
  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log("Restarting...");
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 100);
      }
    }
  };

  const handleConfirm = () => {
    if (!result) return;

    if (result.intent === 'pay') {
      // Try UPI app deep links in order: PhonePe > GPay > Paytm > Generic UPI
      // The first installed app will open
      const links = [
        result.details.phonepeLink,
        result.details.gpayLink,
        result.details.paytmLink,
        result.details.upiLink
      ].filter(Boolean); // Remove undefined values
      
      if (links.length > 0) {
        console.log("🔗 Trying UPI deep links:", links);
        // Try the first available link
        window.location.href = links[0]!;
      }
    } else if (result.intent === 'call') {
      // Try contacts search deep link first, then fallback to tel:
      if (result.details.deepLink) {
        console.log("📞 Trying contacts search intent:", result.details.deepLink);
        window.location.href = result.details.deepLink;
        
        // Set a timeout to try tel: link if intent doesn't work
        setTimeout(() => {
          if (result.details.telLink) {
            console.log("📞 Fallback to tel link:", result.details.telLink);
            window.location.href = result.details.telLink;
          }
        }, 1000);
      } else if (result.details.telLink || result.details.number) {
        // Direct tel: link fallback
        const telLink = result.details.telLink || `tel:${result.details.number}`;
        console.log("📞 Using direct tel link:", telLink);
        window.location.href = telLink;
      }
    }
    
    setStatus('completed');
  };

  const handleCancel = () => {
    setStatus('idle');
    setResult(null);
    setTranscript('');
    speak("Cancelled");
  };

  const handleSOS = () => {
    const message = "EMERGENCY! I need help.";
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const link = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          window.location.href = `https://wa.me/?text=${encodeURIComponent(message + " Location: " + link)}`;
        },
        () => {
          window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
        }
      );
    } else {
      window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }
  };

  // Render
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 shadow-lg">
        <h1 className="text-4xl font-bold text-center">सहायक Sahayak</h1>
        <p className="text-center text-blue-100 text-lg mt-1">आपका Voice Assistant</p>
        
        {/* Contact Load Button */}
        <div className="flex justify-center mt-3">
          <button
            onClick={loadContacts}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
          >
            <Users className="w-4 h-4" />
            {contacts.length > 0 ? `${contacts.length} संपर्क loaded` : 'Load संपर्क / Contacts'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">

          {/* IDLE */}
          {status === 'idle' && (
            <div className="text-center space-y-8 animate-in fade-in duration-500">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">बटन दबाएं और बोलें</h2>
                <p className="text-xl text-gray-600">"Raju ko 500 rupaye bhejo"</p>
                <p className="text-xl text-gray-600">"Doctor ko call karo"</p>
                {contacts.length > 0 && (
                  <p className="text-sm text-green-600 mt-2">✓ {contacts.length} contacts ready</p>
                )}
              </div>

              <button
                onClick={startListening}
                className="w-64 h-64 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full shadow-2xl hover:shadow-blue-500/50 active:scale-95 transition-all mx-auto flex items-center justify-center"
              >
                <Mic className="w-32 h-32 text-white" />
              </button>

              {error && (
                <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-xl text-lg font-medium">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* LISTENING */}
          {status === 'listening' && (
            <div className="text-center space-y-8">
              <h2 className="text-4xl font-bold text-blue-600 animate-pulse">सुन रहे हैं...</h2>
              
              <div className="relative">
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-50" />
                <div className="relative w-64 h-64 bg-red-500 rounded-full shadow-2xl mx-auto flex items-center justify-center">
                  <Mic className="w-32 h-32 text-white" />
                </div>
              </div>

              {transcript && (
                <p className="text-xl text-gray-600 italic px-4">"{transcript}"</p>
              )}
            </div>
          )}

          {/* PROCESSING */}
          {status === 'processing' && (
            <div className="text-center space-y-6">
              <Loader2 className="w-24 h-24 text-blue-600 animate-spin mx-auto" />
              <h2 className="text-2xl font-semibold text-gray-700">समझ रहे हैं...</h2>
              {transcript && <p className="text-lg text-gray-500 italic">"{transcript}"</p>}
            </div>
          )}

          {/* VERIFYING */}
          {status === 'verifying' && result && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
              <div className="bg-yellow-50 p-6 border-b-2 border-yellow-200">
                <h2 className="text-2xl font-bold text-center text-yellow-800">कृपया Confirm करें</h2>
              </div>

              <div className="p-8 text-center space-y-6">
                {result.intent === 'pay' && (
                  <>
                    <div className="text-7xl font-bold text-gray-900">₹{result.details.amount}</div>
                    <div className="text-2xl text-gray-600">
                      को <span className="font-bold text-black">{result.details.recipient}</span>
                    </div>
                    {result.details.upiId && (
                      <div className="text-lg text-gray-500 bg-gray-50 p-3 rounded-lg">
                        UPI: <span className="font-mono font-semibold">{result.details.upiId}</span>
                      </div>
                    )}
                  </>
                )}

                {result.intent === 'call' && (
                  <>
                    <Phone className="w-24 h-24 text-green-600 mx-auto" />
                    <div className="text-3xl font-bold text-gray-900">{result.details.recipient} को Call करें?</div>
                    <div className="text-xl text-gray-500">{result.details.number}</div>
                  </>
                )}

                {/* Warning message if present */}
                {result.warning && (
                  <div className="bg-orange-100 border-2 border-orange-300 text-orange-800 p-4 rounded-xl text-base">
                    ⚠️ {result.warning}
                  </div>
                )}

                <div className="space-y-3 pt-4">
                  <button
                    onClick={handleConfirm}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-2xl font-bold py-6 rounded-2xl shadow-xl active:scale-95 transition-all"
                  >
                    ✓ हाँ, भेजें / Yes
                  </button>

                  <button
                    onClick={handleCancel}
                    className="w-full bg-white border-2 border-gray-300 text-gray-700 text-xl font-semibold py-4 rounded-2xl hover:bg-gray-50"
                  >
                    <X className="inline w-6 h-6 mr-2" />
                    नहीं / Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCAM ALERT */}
          {status === 'scam' && result && (
            <div className="bg-red-50 border-4 border-red-600 rounded-3xl p-8 text-center space-y-6 animate-in shake">
              <AlertTriangle className="w-32 h-32 text-red-600 mx-auto" />
              <h2 className="text-4xl font-bold text-red-800">⚠️ खतरा! SCAM!</h2>
              <p className="text-2xl text-red-700 font-medium leading-relaxed">
                {result.warning}
              </p>
              <button
                onClick={handleCancel}
                className="w-full bg-red-600 text-white text-xl font-bold py-4 rounded-xl shadow-lg"
              >
                समझ गया / I Understand
              </button>
            </div>
          )}

          {/* COMPLETED */}
          {status === 'completed' && (
            <div className="text-center space-y-6">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">App खोल रहे हैं...</h2>
              <button
                onClick={handleCancel}
                className="text-blue-600 text-xl font-medium underline"
              >
                फिर से शुरू करें / Start Over
              </button>
            </div>
          )}

        </div>
      </div>

      {/* SOS Footer */}
      <footer className="p-4 bg-white border-t-2 border-gray-200 shadow-lg">
        <button
          onClick={handleSOS}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-2xl py-5 rounded-xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <AlertTriangle className="w-8 h-8" />
          SOS EMERGENCY
        </button>
      </footer>

    </main>
  );
}
