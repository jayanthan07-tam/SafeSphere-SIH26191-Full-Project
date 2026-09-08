import { useState, useRef, useEffect } from 'react';
import { useAppLanguage } from '../hooks/useAppLanguage';

interface LanguageSelectorProps {
  compact?: boolean;  // icon-only mode for tight spaces
  className?: string;
}

export function LanguageSelector({ compact = false, className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, supportedLanguages } = useAppLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = supportedLanguages.find(l => l.code === language) ?? supportedLanguages[0];

  return (
    <div className={`lang-selector${open ? ' open' : ''} ${className}`} ref={ref}>
      <button
        className="lang-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Select language"
        id="btn-lang-selector"
        type="button"
      >
        {compact ? '🌐' : <><span className="lang-current-label">{current.label}</span><span className="lang-chevron">{open ? '▲' : '▼'}</span></>}
      </button>
      {open && (
        <ul className="lang-dropdown" role="listbox" aria-label="Language options">
          {supportedLanguages.map(lang => (
            <li
              key={lang.code}
              role="option"
              aria-selected={lang.code === language}
              className={lang.code === language ? 'selected' : ''}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
            >
              {lang.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
