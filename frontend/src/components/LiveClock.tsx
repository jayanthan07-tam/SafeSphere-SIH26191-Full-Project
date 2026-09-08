import { useState, useEffect } from 'react';
import { useAppLanguage } from '../hooks/useAppLanguage';

interface LiveClockProps {
  className?: string;
  showDate?: boolean;
  showSeconds?: boolean;
}

export function LiveClock({ className = '', showDate = true, showSeconds = true }: LiveClockProps) {
  const [now, setNow] = useState<Date>(new Date());
  const { language } = useAppLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Map app language code to valid BCP-47 locale tag
  const localeMap: Record<string, string> = {
    en: 'en-IN',
    ta: 'ta-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ml: 'ml-IN',
    kn: 'kn-IN',
  };

  const locale = localeMap[language] || 'en-IN';

  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = now.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  return (
    <div className={`live-clock-pill ${className}`} title="System Synchronized Date & Time">
      <span className="live-clock-dot" aria-hidden="true" />
      {showDate && <span className="live-clock-date">{dateStr}</span>}
      {showDate && <span className="live-clock-sep">•</span>}
      <span className="live-clock-time">{timeStr}</span>
    </div>
  );
}
