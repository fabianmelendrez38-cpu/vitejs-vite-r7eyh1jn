import React, { useState, useEffect, useRef } from 'react';
import { Send, Minus, HelpCircle, Sparkles } from 'lucide-react';
import { EphemerisData, LunarSite } from '../lib/nasaApi';

export type HeliMood = 'normal' | 'happy' | 'alert' | 'surprised' | 'thinking' | 'wink';

interface ChatMessage {
  id: string;
  sender: 'heli' | 'user';
  text: string;
}

interface MascotAssistantProps {
  mood?: HeliMood;
  selectedSite: LunarSite;
  currentTelemetry: EphemerisData;
  missionDate: string;
  onOpenGuide: () => void;
}

const QUICK_QUESTIONS = [
  '¿Qué pasa aquí ahora?',
  '¿Hay energía solar?',
  '¿Tenemos señal DTE?',
];

export const MascotAssistant: React.FC<MascotAssistantProps> = ({
  mood = 'normal',
  selectedSite,
  currentTelemetry,
  missionDate,
  onOpenGuide,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [internalMood, setInternalMood] = useState<HeliMood | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'heli',
      text: `¡Hola! Soy HELI, tu guía en el Polo Sur Lunar. Ahora mismo observamos ${selectedSite.name}. ¿En qué te ayudo?`,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const internalMoodTimerRef = useRef<number | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const replyTimerRef = useRef<number | null>(null);

  // Automatic blinking every ~3.2s for 160ms
  useEffect(() => {
    let blinkTimeout: number;
    const interval = window.setInterval(() => {
      setIsBlinking(true);
      blinkTimeout = window.setTimeout(() => {
        setIsBlinking(false);
      }, 160);
    }, 3200);

    return () => {
      clearInterval(interval);
      clearTimeout(blinkTimeout);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (internalMoodTimerRef.current) clearTimeout(internalMoodTimerRef.current);
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  // Auto-scroll chat history
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Effective expression priority: internal chat/interaction mood > hover wink > external app mood
  const activeMood: HeliMood =
    internalMood ?? (isHovered && mood === 'normal' ? 'wink' : mood);

  const shouldWave =
    activeMood === 'happy' || activeMood === 'wink' || isSpeaking;

  const setTemporaryInternalMood = (nextMood: HeliMood | null, durationMs?: number) => {
    if (internalMoodTimerRef.current) {
      clearTimeout(internalMoodTimerRef.current);
      internalMoodTimerRef.current = null;
    }
    setInternalMood(nextMood);
    if (nextMood && durationMs) {
      internalMoodTimerRef.current = window.setTimeout(() => {
        setInternalMood(null);
      }, durationMs);
    }
  };

  const triggerSpeakingWave = (durationMs = 2200) => {
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    setIsSpeaking(true);
    speakingTimerRef.current = window.setTimeout(() => {
      setIsSpeaking(false);
    }, durationMs);
  };

  const buildContextualReply = (question: string): string => {
    const q = question.toLowerCase();
    const solarElev = currentTelemetry.solarElevationDeg ?? currentTelemetry.solarElevation;
    const earthElev = currentTelemetry.earthElevationDeg ?? currentTelemetry.earthElevation;
    const power = currentTelemetry.solarPowerKw;
    const dteStatus = currentTelemetry.earthLinkStatus ?? (currentTelemetry.isDTEAvailable ? 'ACTIVA' : 'SIN LÍNEA DE VISTA');
    const signalPct = currentTelemetry.earthSignalPercent ?? (currentTelemetry.isDTEAvailable ? 95 : 0);
    const temp = currentTelemetry.surfaceTemperatureC ?? -130;
    const battery = currentTelemetry.batteryPercent ?? 84.3;

    if (q.includes('qué pasa') || q.includes('que pasa') || q.includes('resumen') || q.includes('ahora') || q.includes('estado')) {
      return `En ${selectedSite.name} (${currentTelemetry.time}), el Sol está a ${solarElev > 0 ? `+${solarElev}` : solarElev}° generando ${power} kW, la superficie está a ${temp}°C y la señal DTE está ${dteStatus === 'ACTIVA' ? `activa (${signalPct}%)` : dteStatus.toLowerCase()}. Viabilidad: ${currentTelemetry.missionViability ?? 'Óptima'}.`;
    }

    if (q.includes('energía') || q.includes('energia') || q.includes('solar') || q.includes('sol') || q.includes('luz') || q.includes('batería') || q.includes('bateria')) {
      if (solarElev > 0.1) {
        return `¡Sí! El ángulo solar es de +${solarElev}° sobre el horizonte. Los paneles producen ${power} kW ahora mismo y nuestra batería de reserva está al ${battery}%.`;
      }
      return `Ahora mismo el Sol está bajo el horizonte (${solarElev}°), en zona de sombra. Generamos 0 kW solares, pero la batería al ${battery}% mantiene activos los calentadores.`;
    }

    if (q.includes('señal') || q.includes('senal') || q.includes('dte') || q.includes('tierra') || q.includes('comunicación') || q.includes('comunicacion')) {
      if (dteStatus === 'ACTIVA') {
        return `¡Enlace DTE firme al ${signalPct}%! La Tierra se ve a +${earthElev}° sobre el horizonte polar, así que podemos enviar telemetría y voz directo a la NASA.`;
      }
      if (dteStatus === 'DEGRADADA') {
        return `Señal DTE marginal (${signalPct}%). La Tierra está muy baja (${earthElev}°) cerca de las crestas del Polo Sur; conviene vigilar obstáculos topográficos.`;
      }
      return `¡Alerta! Sin línea de vista DTE (${earthElev}°). La Tierra quedó oculta tras el horizonte lunar; necesitamos esperar libración o usar un satélite repetidor.`;
    }

    if (q.includes('hielo') || q.includes('agua') || q.includes('cráter') || q.includes('crater') || q.includes('sitio') || q.includes('lugar')) {
      return `${selectedSite.name} tiene probabilidad de hielo "${selectedSite.iceProbability}". ${selectedSite.whyItMatters}`;
    }

    if (q.includes('temperatura') || q.includes('frío') || q.includes('frio') || q.includes('calor') || q.includes('clima')) {
      return `El suelo lunar marca ${temp}°C en ${selectedSite.name}. Sin atmósfera, las sombras polares llegan a -230°C y preservan hielo antiguo.`;
    }

    if (q.includes('fecha') || q.includes('día') || q.includes('dia') || q.includes('hora') || q.includes('tiempo')) {
      return `Simulamos la misión del ${missionDate} en el paso ${currentTelemetry.time}. Usa el deslizador de 48h para ver cómo giran las sombras rasantes en 3D.`;
    }

    if (q.includes('ayuda') || q.includes('tutorial') || q.includes('cómo') || q.includes('como') || q.includes('usar')) {
      return `Es súper fácil: 1) Elige un sitio en el mapa 3D, 2) Mueve la línea de tiempo de 48h, y 3) Revisa energía y señal DTE. Pulsa el botón "?" arriba si quieres ver la guía visual.`;
    }

    return `Sobre ${selectedSite.name}: ángulo solar ${solarElev > 0 ? `+${solarElev}` : solarElev}° (${power} kW), temperatura ${temp}°C y enlace con la Tierra ${dteStatus} (${earthElev}°). ¿Quieres revisar energía, señal DTE o hielo?`;
  };

  const handleSendMessage = (rawText?: string) => {
    const text = (rawText ?? inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!rawText) setInputText('');

    // Thinking expression while processing
    setTemporaryInternalMood('thinking');

    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = window.setTimeout(() => {
      const replyText = buildContextualReply(text);
      const heliMsg: ChatMessage = {
        id: `heli-${Date.now()}`,
        sender: 'heli',
        text: replyText,
      };
      setMessages((prev) => [...prev, heliMsg]);

      const dteLost =
        !currentTelemetry.isDTEAvailable ||
        currentTelemetry.earthLinkStatus === 'SIN LÍNEA DE VISTA';

      if (dteLost && (text.toLowerCase().includes('dte') || text.toLowerCase().includes('señal'))) {
        setTemporaryInternalMood('alert', 2400);
      } else {
        setTemporaryInternalMood('happy', 2400);
      }
      triggerSpeakingWave(2200);
    }, 420);
  };

  const handleToggleMascot = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setTemporaryInternalMood('wink', 1600);
      triggerSpeakingWave(1800);
    } else {
      setTemporaryInternalMood(null);
    }
  };

  const renderEyes = () => {
    if (isBlinking) {
      return (
        <g stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M 73 96 Q 82 101 91 96" />
          <path d="M 129 96 Q 138 101 147 96" />
        </g>
      );
    }

    switch (activeMood) {
      case 'happy':
        return (
          <g stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M 73 98 Q 82 86 91 98" />
            <path d="M 129 98 Q 138 86 147 98" />
          </g>
        );
      case 'wink':
        return (
          <g>
            {/* Left eye: complicit closed arch */}
            <path
              d="M 73 97 Q 82 88 91 97"
              stroke="#0f172a"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right eye: bright open */}
            <circle cx="138" cy="95" r="9.5" fill="#0f172a" />
            <circle cx="135" cy="91.5" r="3.4" fill="#ffffff" />
            <circle cx="141.5" cy="98" r="1.6" fill="#ffffff" />
          </g>
        );
      case 'surprised':
        return (
          <g>
            <circle cx="82" cy="95" r="11.5" fill="#0f172a" />
            <circle cx="78.5" cy="91" r="4.2" fill="#ffffff" />
            <circle cx="86" cy="99" r="1.8" fill="#ffffff" />

            <circle cx="138" cy="95" r="11.5" fill="#0f172a" />
            <circle cx="134.5" cy="91" r="4.2" fill="#ffffff" />
            <circle cx="142" cy="99" r="1.8" fill="#ffffff" />
          </g>
        );
      case 'thinking':
        return (
          <g>
            {/* Eyes looking upward */}
            <circle cx="82" cy="92" r="9" fill="#0f172a" />
            <circle cx="80" cy="88" r="3.2" fill="#ffffff" />
            <circle cx="85" cy="93.5" r="1.4" fill="#ffffff" />

            <circle cx="138" cy="92" r="9" fill="#0f172a" />
            <circle cx="136" cy="88" r="3.2" fill="#ffffff" />
            <circle cx="141" cy="93.5" r="1.4" fill="#ffffff" />
          </g>
        );
      case 'alert':
        return (
          <g>
            {/* Worried tilted eyebrows */}
            <path d="M 71 84 L 91 88" stroke="#9f1239" strokeWidth="3" strokeLinecap="round" />
            <path d="M 149 84 L 129 88" stroke="#9f1239" strokeWidth="3" strokeLinecap="round" />
            {/* Tense eyes */}
            <circle cx="82" cy="96" r="8.5" fill="#0f172a" />
            <circle cx="79.5" cy="93" r="2.8" fill="#ffffff" />
            <circle cx="138" cy="96" r="8.5" fill="#0f172a" />
            <circle cx="135.5" cy="93" r="2.8" fill="#ffffff" />
          </g>
        );
      case 'normal':
      default:
        return (
          <g>
            <circle cx="82" cy="95" r="9.5" fill="#0f172a" />
            <circle cx="78.5" cy="91.5" r="3.4" fill="#ffffff" />
            <circle cx="85" cy="98.5" r="1.6" fill="#ffffff" />

            <circle cx="138" cy="95" r="9.5" fill="#0f172a" />
            <circle cx="134.5" cy="91.5" r="3.4" fill="#ffffff" />
            <circle cx="141" cy="98.5" r="1.6" fill="#ffffff" />
          </g>
        );
    }
  };

  const renderMouth = () => {
    switch (activeMood) {
      case 'happy':
        return (
          <g>
            <path
              d="M 101 105 Q 110 119 119 105 Z"
              fill="#9f1239"
              stroke="#0f172a"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M 105 111 Q 110 109 115 111 Q 110 115 105 111 Z" fill="#fda4af" />
          </g>
        );
      case 'surprised':
        return (
          <ellipse
            cx="110"
            cy="110"
            rx="5.2"
            ry="6.5"
            fill="#9f1239"
            stroke="#0f172a"
            strokeWidth="2.6"
          />
        );
      case 'alert':
        return (
          <path
            d="M 102 113 Q 110 105 118 113"
            fill="none"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      case 'thinking':
        return (
          <path
            d="M 104 110 Q 110 108 116 111"
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        );
      case 'wink':
        return (
          <path
            d="M 103 106 Q 110 115 117 105"
            fill="none"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      case 'normal':
      default:
        return (
          <path
            d="M 103.5 106 Q 110 114 116.5 106"
            fill="none"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none select-none">
      {/* =========================================================================
          MINI-VENTANA DE CHAT FLOTANTE COMPACTA (encima de HELI)
          ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Asistente de chat HELI"
          className="pointer-events-auto mb-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-amber-300/30 rounded-3xl shadow-2xl overflow-hidden text-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header compacto */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/70 border-b border-amber-300/15">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              <div>
                <div className="text-xs font-bold text-amber-200 leading-none flex items-center gap-1">
                  <span>HELI</span>
                  <Sparkles className="w-3 h-3 text-amber-300" />
                </div>
                <span className="text-[10px] text-slate-400">Guía Lunar en vivo</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setTemporaryInternalMood('happy', 1800);
                  onOpenGuide();
                }}
                className="w-6 h-6 rounded-full bg-slate-800/90 hover:bg-purple-600/40 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                title="Abrir guía rápida (?)"
                aria-label="Abrir guía rápida de uso"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                title="Minimizar chat"
                aria-label="Minimizar chat de HELI"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Historial de mensajes (h-40) */}
          <div className="h-40 overflow-y-auto px-3 py-2.5 space-y-2 text-[11px] leading-relaxed">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-purple-600/80 text-white rounded-br-sm border border-purple-400/30'
                      : 'bg-slate-800/90 text-slate-200 rounded-bl-sm border border-amber-300/20'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {activeMood === 'thinking' && (
              <div className="flex justify-start">
                <div className="px-2.5 py-1 rounded-2xl bg-slate-800/80 border border-amber-300/20 text-[10px] text-amber-200 italic">
                  HELI está analizando telemetría...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 3 Píldoras de preguntas rápidas sugeridas */}
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="px-2 py-0.5 rounded-full bg-amber-300/10 hover:bg-amber-300/20 text-amber-200 border border-amber-300/25 text-[10px] font-medium transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Campo de texto */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="px-2.5 pb-2.5 pt-1 flex items-center gap-1.5 border-t border-white/5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregúntale a HELI..."
              aria-label="Escribe una pregunta para HELI"
              className="flex-1 bg-slate-950/90 text-white placeholder-slate-500 text-[11px] px-3 py-1.5 rounded-full border border-white/10 focus:outline-none focus:border-amber-300/60"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label="Enviar pregunta"
              className="w-7 h-7 rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          BOTÓN / PERSONAJE HELI (SIEMPRE VISIBLE EN ESQUINA INFERIOR DERECHA)
          ========================================================================= */}
      <button
        type="button"
        onClick={handleToggleMascot}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isOpen ? 'Minimizar asistente HELI' : 'Abrir chat con HELI, tu asistente lunar'}
        className="pointer-events-auto relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-full p-0.5"
      >
        {/* Dynamic Aura Glow behind HELI */}
        <div
          className={`absolute inset-1 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
            activeMood === 'alert'
              ? 'bg-rose-500/55 animate-pulse scale-110'
              : activeMood === 'happy'
              ? 'bg-amber-300/40 scale-105'
              : activeMood === 'surprised'
              ? 'bg-cyan-400/35 scale-105'
              : activeMood === 'thinking'
              ? 'bg-purple-400/35'
              : 'bg-amber-300/20 group-hover:bg-amber-300/35'
          }`}
        />

        {/* Small floating prompt pill when chat is closed & hovered */}
        {!isOpen && (
          <span className="absolute -top-6 right-2 px-2 py-0.5 rounded-full bg-slate-900/90 border border-amber-300/30 text-[10px] font-semibold text-amber-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
            {activeMood === 'alert' ? '¡Alerta DTE!' : '¡Pregúntame!'}
          </span>
        )}

        {/* 100% Pure Vector SVG Illustration of HELI */}
        <svg
          viewBox="0 0 220 205"
          className="relative w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_8px_18px_rgba(0,0,0,0.65)] animate-heli-float transition-transform duration-200 group-hover:scale-105"
          aria-hidden="true"
        >
          <defs>
            {/* Translucent blue-tinted glass lens */}
            <linearGradient id="heliLensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.48" />
              <stop offset="55%" stopColor="#e0f2fe" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.42" />
            </linearGradient>

            {/* Subtle warm golden shading for the moon body */}
            <radialGradient id="heliBodyGrad" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="65%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fde047" />
            </radialGradient>
          </defs>

          {/* LEFT ARM (Raised waving, oscillates when happy/wink/speaking) */}
          <g
            className={shouldWave ? 'animate-heli-wave' : ''}
            style={{ transformOrigin: '49px 107px' }}
          >
            <path
              d="M 49 107 Q 31 104 28 86"
              fill="none"
              stroke="#c9a24b"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <circle
              cx="25"
              cy="81"
              r="9.5"
              fill="#fef08a"
              stroke="#c9a24b"
              strokeWidth="3.2"
            />
            <circle cx="22.5" cy="77.5" r="2.2" fill="#fef9c3" />
          </g>

          {/* RIGHT ARM (Relaxed pointing down) */}
          <g>
            <path
              d="M 171 107 Q 189 111 191 127"
              fill="none"
              stroke="#c9a24b"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <circle
              cx="192"
              cy="132"
              r="9.5"
              fill="#fef08a"
              stroke="#c9a24b"
              strokeWidth="3.2"
            />
            <circle cx="189.5" cy="128.5" r="2.2" fill="#fef9c3" />
          </g>

          {/* TWO SHORT LEGS WITH CIRCULAR FEET */}
          <g>
            {/* Left leg */}
            <line
              x1="90"
              y1="158"
              x2="86"
              y2="176"
              stroke="#c9a24b"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <circle
              cx="85"
              cy="182"
              r="9.5"
              fill="#fef08a"
              stroke="#c9a24b"
              strokeWidth="3.2"
            />
            <circle cx="82.5" cy="178.5" r="2.2" fill="#fef9c3" />

            {/* Right leg */}
            <line
              x1="130"
              y1="158"
              x2="134"
              y2="176"
              stroke="#c9a24b"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <circle
              cx="135"
              cy="182"
              r="9.5"
              fill="#fef08a"
              stroke="#c9a24b"
              strokeWidth="3.2"
            />
            <circle cx="132.5" cy="178.5" r="2.2" fill="#fef9c3" />
          </g>

          {/* MAIN ROUND MOON BODY */}
          <circle
            cx="110"
            cy="98"
            r="64"
            fill="url(#heliBodyGrad)"
            stroke="#c9a24b"
            strokeWidth="3.5"
          />

          {/* Warm lower-right crescent inner shadow */}
          <path
            d="M 62 140 A 61 61 0 0 0 164 66 A 63 63 0 0 1 62 140 Z"
            fill="#eab308"
            opacity="0.22"
          />

          {/* Curved highlight on the left edge */}
          <path
            d="M 55 82 A 57 57 0 0 1 92 43"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4.2"
            strokeLinecap="round"
            opacity="0.72"
          />

          {/* OVAL CRATERS (#e5c16c) */}
          <g>
            {/* Top-left large crater */}
            <ellipse
              cx="81"
              cy="53"
              rx="10.5"
              ry="7"
              transform="rotate(-28 81 53)"
              fill="#e5c16c"
              stroke="#d4ac54"
              strokeWidth="1.4"
            />
            <circle cx="67" cy="61" r="2.6" fill="#e5c16c" />

            {/* Top-right crater */}
            <ellipse
              cx="136"
              cy="51"
              rx="9"
              ry="5.8"
              transform="rotate(20 136 51)"
              fill="#e5c16c"
              stroke="#d4ac54"
              strokeWidth="1.2"
            />
            <circle cx="151" cy="62" r="2.8" fill="#e5c16c" />

            {/* Bottom-left crater */}
            <ellipse
              cx="74"
              cy="132"
              rx="7.5"
              ry="5.5"
              transform="rotate(30 74 132)"
              fill="#e5c16c"
              stroke="#d4ac54"
              strokeWidth="1.2"
            />
            <ellipse
              cx="94"
              cy="146"
              rx="4.5"
              ry="2.8"
              transform="rotate(-10 94 146)"
              fill="#e5c16c"
            />

            {/* Bottom-right crater */}
            <ellipse
              cx="136"
              cy="137"
              rx="10"
              ry="6.8"
              transform="rotate(-22 136 137)"
              fill="#e5c16c"
              stroke="#d4ac54"
              strokeWidth="1.3"
            />
            <circle cx="153" cy="127" r="2.5" fill="#e5c16c" />
          </g>

          {/* TRANSLUCENT GLASSES LENSES (drawn behind facial features or eyes inside lenses) */}
          <g>
            <rect
              x="57"
              y="72"
              width="46"
              height="44"
              rx="14"
              fill="url(#heliLensGrad)"
            />
            <rect
              x="117"
              y="72"
              width="46"
              height="44"
              rx="14"
              fill="url(#heliLensGrad)"
            />
            {/* Diagonal soft specular reflections on lenses */}
            <path
              d="M 66 76 L 78 76 L 64 111 L 59 111 Z"
              fill="#ffffff"
              opacity="0.3"
            />
            <path
              d="M 126 76 L 138 76 L 124 111 L 119 111 Z"
              fill="#ffffff"
              opacity="0.3"
            />
          </g>

          {/* ROSY CHEEKS (#fda4af) */}
          <ellipse cx="72" cy="107" rx="7" ry="4" fill="#fda4af" opacity="0.88" />
          <ellipse cx="148" cy="107" rx="7" ry="4" fill="#fda4af" opacity="0.88" />

          {/* REACTIVE EYES & BLINKING */}
          {renderEyes()}

          {/* REACTIVE MOUTH */}
          {renderMouth()}

          {/* SIGNATURE BLUE GLASSES FRAME (#3b6cb7) */}
          <g>
            {/* Outer dark navy stroke for crisp contrast */}
            <path
              d="M 46 74 Q 46 66 80 67 Q 103 68 106 78 Q 110 76 114 78 Q 117 68 140 67 Q 174 66 174 74 L 174 82 Q 168 83 166 96 Q 164 120 140 120 Q 116 120 113 94 Q 110 89 107 94 Q 104 120 80 120 Q 56 120 54 96 Q 52 83 46 82 Z
                 M 59 79 Q 58 113 80 113 Q 101 113 102 88 Q 102 74 80 74 Q 60 74 59 79 Z
                 M 161 79 Q 160 74 140 74 Q 118 74 118 88 Q 119 113 140 113 Q 162 113 161 79 Z"
              fill="#3b6cb7"
              fillRule="evenodd"
              stroke="#274c87"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />

            {/* Soft top frame highlight */}
            <path
              d="M 55 71 Q 80 69 98 72"
              fill="none"
              stroke="#7ca6e8"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M 122 72 Q 140 69 165 71"
              fill="none"
              stroke="#7ca6e8"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* Yellow Star on top-left corner of frame */}
            <polygon
              points="52,70 53.6,73.5 57.5,73.9 54.6,76.5 55.4,80.3 52,78.3 48.6,80.3 49.4,76.5 46.5,73.9 50.4,73.5"
              fill="#fde047"
              stroke="#ca8a04"
              strokeWidth="0.7"
            />
            {/* Tiny sparkles near top-left star */}
            <circle cx="59" cy="71" r="1.2" fill="#ffffff" />
            <circle cx="57" cy="83" r="0.9" fill="#fef08a" />

            {/* Mini Moon on top-right corner of frame */}
            <g transform="translate(166, 76)">
              <circle cx="0" cy="0" r="4.6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.7" />
              <circle cx="-1.4" cy="-1.2" r="1.1" fill="#cbd5e1" />
              <circle cx="1.6" cy="1.1" r="0.9" fill="#cbd5e1" />
              <circle cx="0.8" cy="-1.8" r="0.6" fill="#cbd5e1" />
            </g>
            {/* Tiny star & sparkles near top-right mini moon */}
            <circle cx="158.5" cy="72" r="1.2" fill="#fde047" />
            <circle cx="163" cy="85" r="0.9" fill="#ffffff" />
            <circle cx="155" cy="112" r="1.1" fill="#fde047" />
          </g>

          {/* Optional small thinking dots when mood === 'thinking' */}
          {activeMood === 'thinking' && (
            <g fill="#fde047">
              <circle cx="174" cy="48" r="3" opacity="0.7" />
              <circle cx="183" cy="41" r="4" opacity="0.85" />
              <circle cx="194" cy="33" r="5" />
            </g>
          )}
        </svg>
      </button>
    </div>
  );
};
