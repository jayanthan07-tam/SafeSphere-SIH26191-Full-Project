import { useCallback, useEffect, useRef, useState } from 'react';

export type LanguageCode = 'en-IN' | 'ta-IN';

export interface UseVoiceRecognitionOptions {
  language?: LanguageCode;
  onTranscript?: (transcript: string) => void;
  onEmergencyDetected?: (transcript: string) => void;
  onSafetyStatusDetected?: (status: 'SAFE' | 'NEED_HELP' | 'AT_SHELTER' | 'UNABLE_TO_MOVE', transcript: string) => void;
}

export function detectEmergencyIntent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const enKeywords = [
    'danger',
    'help',
    'emergency',
    'flood',
    'water rising',
    'trapped',
    'rescue',
    'send help',
    'need help',
    'fire',
    'cyclone',
    'landslide',
  ];
  const taKeywords = ['உதவி', 'ஆபத்து', 'காப்பாற்றுங்கள்', 'வெள்ளம்', 'அவசரம்', 'தீ'];

  return enKeywords.some(kw => lower.includes(kw)) || taKeywords.some(kw => text.includes(kw));
}

export function detectSafetyIntent(text: string): 'SAFE' | 'NEED_HELP' | 'AT_SHELTER' | 'UNABLE_TO_MOVE' | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Unable to move
  if (
    lower.includes('cannot move') ||
    lower.includes("can't move") ||
    lower.includes('unable to move') ||
    lower.includes('trapped') ||
    text.includes('நகர முடியவில்லை') ||
    text.includes('நகர இயலவில்லை')
  ) {
    return 'UNABLE_TO_MOVE';
  }

  // At shelter
  if (
    lower.includes('shelter') ||
    lower.includes('camp') ||
    lower.includes('at shelter') ||
    text.includes('முகாம்') ||
    text.includes('தங்குமிடம்')
  ) {
    return 'AT_SHELTER';
  }

  // Need help
  if (
    lower.includes('need help') ||
    lower.includes('danger') ||
    lower.includes('help me') ||
    text.includes('உதவி வேண்டும்') ||
    text.includes('ஆபத்து')
  ) {
    return 'NEED_HELP';
  }

  // Safe
  if (
    lower.includes('safe') ||
    lower.includes('i am safe') ||
    lower.includes('fine') ||
    lower.includes('okay') ||
    text.includes('பாதுகாப்பாக') ||
    text.includes('பாதுகாப்பு')
  ) {
    return 'SAFE';
  }

  return null;
}

export function speakText(text: string, lang: string = 'en-IN'): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>(options.language || 'en-IN');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice recognition unavailable in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onerror = (event: any) => {
        setListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser.');
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please try speaking closer to your microphone.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript || '';
        setTranscript(resultText);

        if (options.onTranscript) {
          options.onTranscript(resultText);
        }

        if (detectEmergencyIntent(resultText) && options.onEmergencyDetected) {
          options.onEmergencyDetected(resultText);
        }

        const safetyStatus = detectSafetyIntent(resultText);
        if (safetyStatus && options.onSafetyStatusDetected) {
          options.onSafetyStatusDetected(safetyStatus, resultText);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setListening(false);
      setError(err.message || 'Unable to start speech recognition.');
    }
  }, [language, options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  return {
    listening,
    transcript,
    error,
    isSupported,
    language,
    setLanguage,
    startListening,
    stopListening,
    speak: speakText,
  };
}
