import { useState } from 'react';
import {
  detectEmergencyIntent,
  LanguageCode,
  useVoiceRecognition,
} from '../hooks/useVoiceRecognition';

interface VoiceSOSProps {
  onTranscript?: (text: string) => void;
  onEmergencyConfirmed?: (transcript: string) => void;
  label?: string;
  language?: string;
  defaultLanguage?: LanguageCode;
  className?: string;
}

export function VoiceSOS({
  onTranscript,
  onEmergencyConfirmed,
  label = '🎙 Voice SOS',
  language,
  defaultLanguage = 'en-IN',
  className = '',
}: VoiceSOSProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [detectedText, setDetectedText] = useState('');
  const initialLang = (language as LanguageCode) || defaultLanguage;

  const {
    listening,
    transcript,
    error,
    isSupported,
    language: currentLanguage,
    setLanguage,
    startListening,
    stopListening,
  } = useVoiceRecognition({
    language: initialLang,
    onTranscript: text => {
      setDetectedText(text);
      if (onTranscript) onTranscript(text);
      if (detectEmergencyIntent(text)) {
        setShowConfirm(true);
      }
    },
    onEmergencyDetected: text => {
      setDetectedText(text);
      setShowConfirm(true);
    },
  });

  const handleToggle = () => {
    if (listening) {
      stopListening();
    } else {
      setShowConfirm(false);
      startListening();
    }
  };

  const confirmEmergency = () => {
    setShowConfirm(false);
    if (onEmergencyConfirmed) {
      onEmergencyConfirmed(detectedText || transcript);
    }
  };

  if (!isSupported) {
    return (
      <div className={`voice-sos-container ${className}`}>
        <button type="button" className="btn secondary" disabled title="Voice recognition is not supported in this browser.">
          🎙 Voice Unavailable
        </button>
        <small className="muted voice-error">Voice recognition unavailable in this browser.</small>
      </div>
    );
  }

  return (
    <div className={`voice-sos-wrapper ${className}`}>
      <div className="voice-controls-row">
        <button
          type="button"
          className={`btn ${listening ? 'danger pulse-active' : 'secondary'} voice-btn`}
          onClick={handleToggle}
          aria-pressed={listening}
        >
          {listening ? '🛑 Stop Listening…' : label}
        </button>

        <select
          className="voice-lang-select"
          value={currentLanguage}
          onChange={e => setLanguage(e.target.value as LanguageCode)}
          disabled={listening}
          aria-label="Voice Recognition Language"
        >
          <option value="en-IN">English (India)</option>
          <option value="ta-IN">தமிழ் (Tamil)</option>
        </select>
      </div>

      {listening && (
        <div className="voice-status-box">
          <span className="live-indicator"></span>
          <span>Listening… Speak now (e.g. “I need help” / “உதவி வேண்டும்”)</span>
        </div>
      )}

      {transcript && !listening && (
        <div className="voice-transcript-bubble">
          <small>Transcribed:</small> <b>"{transcript}"</b>
        </div>
      )}

      {error && <div className="voice-error-msg">{error}</div>}

      {showConfirm && (
        <div className="voice-emergency-modal-backdrop">
          <div className="voice-emergency-modal">
            <div className="modal-badge danger">EMERGENCY INTENT DETECTED</div>
            <h3>Activate Emergency SOS?</h3>
            <p className="intent-quote">"{detectedText || transcript}"</p>
            <p>Our voice system detected an urgent distress message. Would you like to transmit this emergency SOS to local authorities immediately?</p>
            <div className="modal-actions">
              <button type="button" className="btn danger" onClick={confirmEmergency}>
                Yes, Send Emergency SOS
              </button>
              <button type="button" className="btn ghost" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
