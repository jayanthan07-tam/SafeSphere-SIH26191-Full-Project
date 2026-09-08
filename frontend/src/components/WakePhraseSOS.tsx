import { useEffect, useRef, useState } from 'react';

interface Props {
  onWake: (transcript: string) => void;
}

const wakeWords = ['sos', 'emergency', 'help me', 'send help', 'உதவி', 'அவசரம்'];

export function WakePhraseSOS({ onWake }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState('Off');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) {
      recognitionRef.current?.stop?.();
      setStatus('Off');
      return;
    }

    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Unsupported');
      setEnabled(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus('Listening');
    recognition.onerror = (event: any) => {
      setStatus(event.error === 'not-allowed' ? 'Microphone permission denied' : 'Voice paused');
    };
    recognition.onresult = (event: any) => {
      const latest = event.results[event.results.length - 1]?.[0]?.transcript || '';
      const normalized = latest.toLowerCase();
      if (wakeWords.some(word => normalized.includes(word) || latest.includes(word))) {
        setStatus('SOS phrase detected');
        onWake(latest);
        recognition.stop();
        setEnabled(false);
      }
    };
    recognition.onend = () => {
      if (enabled) {
        try { recognition.start(); } catch { /* browser may be transitioning */ }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setStatus('Unable to start'); }

    return () => {
      recognition.onend = null;
      try { recognition.stop(); } catch { /* ignore */ }
    };
  }, [enabled, onWake]);

  return (
    <button
      type="button"
      className={`handsfree-toggle ${enabled ? 'active' : ''}`}
      onClick={() => setEnabled(v => !v)}
      title="Hands-free SOS works only while this page is open and microphone permission is granted."
    >
      <span className="handsfree-dot" />
      <span>
        <b>Hands-free SOS</b>
        <small>{status}</small>
      </span>
    </button>
  );
}
