import React, { useState, useRef, useEffect } from 'react';
import {
  HelpCircle,
  X,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  plainMeaning: string;
  whyItMatters: string;
  nominalRange?: string;
  ariaLabel?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  plainMeaning,
  whyItMatters,
  nominalRange,
  ariaLabel = 'Más información',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="w-5 h-5 rounded-full bg-slate-800/80 hover:bg-purple-900/60 text-slate-400 hover:text-purple-300 border border-slate-700/60 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        aria-label={`${ariaLabel}: ${title}`}
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 bg-slate-900/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl shadow-2xl text-left text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
              aria-label="Cerrar explicación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Plain Meaning */}
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 block mb-0.5">
              ¿Qué significa?
            </span>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              {plainMeaning}
            </p>
          </div>

          {/* Why it Matters */}
          <div className="bg-purple-950/40 border border-purple-800/40 p-2 rounded-xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1 mb-0.5">
              <ShieldAlert className="w-3 h-3 text-amber-400 inline" />
              Impacto en la misión lunar
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {whyItMatters}
            </p>
          </div>

          {/* Nominal range */}
          {nominalRange && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Rango nominal: {nominalRange}</span>
            </div>
          )}

          {/* Tiny arrow indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 pointer-events-none" />
        </div>
      )}
    </div>
  );
};
