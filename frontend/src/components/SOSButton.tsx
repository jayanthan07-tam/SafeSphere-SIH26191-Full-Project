import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { speakText } from '../hooks/useVoiceRecognition';
import { sosService } from '../services/sos';
import { useAuth } from '../context/AuthContext';

interface SOSButtonProps {
  className?: string;
  onActivated?: () => void;
}

export function SOSButton({ className = '', onActivated }: SOSButtonProps) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const HOLD_DURATION_MS = 3000;

  const startHold = () => {
    setHolding(true);
    setProgress(0);
    setError(null);
    startTimeRef.current = Date.now();

    const interval = window.setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
      setProgress(pct);

      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(interval);
        triggerSOS();
      }
    }, 50);

    timerRef.current = interval;
  };

  const cancelHold = () => {
    setHolding(false);
    setProgress(0);
    startTimeRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const triggerSOS = async () => {
    cancelHold();
    setActivating(true);

    try {
      // 1. Request GPS Coordinates
      let lat = 13.0827; // fallback default
      let lng = 80.2707;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Proceed with best effort / fallback
        }
      }

      // 2. Submit SOS Request
      if (user) {
        await sosService.createSOS({
          latitude: lat,
          longitude: lng,
          caller_name: user.full_name,
          phone: user.phone || user.mobile_number || '',
          message: 'EMERGENCY SOS: Activated via 3-second hold emergency button.',
          special_needs: [],
          people_count: 1,
        });
      } else {
        await sosService.createPublicSOS({
          latitude: lat,
          longitude: lng,
          caller_name: 'Emergency User',
          phone: '9999999999',
          message: 'EMERGENCY SOS: Activated via 3-second hold emergency button.',
          special_needs: [],
          people_count: 1,
        });
      }

      // 3. Confirm via speech synthesis
      speakText('Your SOS request has been created.');

      if (onActivated) {
        onActivated();
      } else {
        nav(user ? '/sos' : '/emergency-loginless');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit emergency SOS.');
      // If direct submission fails, still route to SOS page
      nav(user ? '/sos' : '/emergency-loginless');
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className={`sos-hold-container ${className}`}>
      <button
        type="button"
        className={`floating-sos ${holding ? 'holding' : ''} ${activating ? 'activating' : ''}`}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={e => e.preventDefault()}
        aria-label="Press and hold 3 seconds for SOS"
      >
        <div
          className="hold-progress-ring"
          style={{
            background: `conic-gradient(#ffffff ${progress * 3.6}deg, rgba(255,255,255,0.2) 0deg)`,
          }}
        >
          <div className="hold-inner-btn">
            {activating ? (
              <span>SENDING…</span>
            ) : holding ? (
              <span className="hold-text">{Math.ceil((HOLD_DURATION_MS - (progress / 100) * HOLD_DURATION_MS) / 1000)}s</span>
            ) : (
              <span>🆘 SOS</span>
            )}
          </div>
        </div>
      </button>
      {holding && <div className="hold-tooltip">Hold 3 seconds to activate SOS…</div>}
      {error && <div className="sos-error-toast">{error}</div>}
    </div>
  );
}
