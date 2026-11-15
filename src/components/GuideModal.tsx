import React, { useEffect } from 'react';
import {
  X,
  Compass,
  Sliders,
  Radio,
  CheckCircle,
  Sparkles,
  Rocket,
  ShieldCheck,
  ExternalLink,
  Users,
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 font-medium">
              <Rocket className="w-3.5 h-3.5" />
              <span>NASA Space Apps Challenge — Kardashev One</span>
            </div>
            <h2 id="guide-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              ¿Cómo funciona HELIOS-LUNA?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Guía rápida de 1 minuto para dominar la planificación de misiones en el Polo Sur Lunar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            aria-label="Cerrar modal de guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Step Interactive Workflow */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Flujo de operación en 3 pasos
          </h3>

          <div className="grid grid-cols-1 gap-3.5">
            {/* Step 1 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-white/5 hover:border-purple-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-500/30">
                1
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-white text-sm">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <span>Selecciona un sitio de aterrizaje</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Elige entre el <strong>Cráter Shackleton</strong>, el <strong>Monte Malapert</strong> o la{' '}
                  <strong>Cresta de Conexión</strong> en el selector sobre el mapa 3D. Cada lugar posee ventajas
                  únicas de iluminación solar y reservas de hielo de agua.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-white/5 hover:border-cyan-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0 border border-cyan-500/30">
                2
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-white text-sm">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Simula el paso de 48 horas con el slider</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Arrastra la <strong>Línea de Tiempo</strong> o pulsa <strong>Reproducir</strong>. Observa cómo se
                  proyectan las sombras rasantes en el visor 3D y cómo varía la generación de energía solar (kW)
                  en tiempo real.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-white/5 hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500/30">
                3
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-white text-sm">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Supervisa la supervivencia y comunicación (DTE)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Verifica el semáforo de <strong>Comunicación Directa con la Tierra</strong>, el estado de la batería
                  y la <strong>Temperatura Superficial (-230°C a -40°C)</strong> para certificar la viabilidad de la
                  tripulación y los equipos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why this tool matters for NASA Artemis */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/40 to-cyan-950/40 border border-purple-500/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>¿Por qué el Polo Sur de la Luna es tan especial?</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            A diferencia del ecuador lunar donde las noches duran 14 días terrestres, las cumbres del Polo Sur
            reciben luz solar casi continua, mientras que los fondos de los cráteres están en oscuridad eterna
            preservando <strong>hielo de agua</strong>. HELIOS-LUNA traduce estos complejos cálculos astrodinámicos
            para que cualquier persona pueda explorarlos con claridad universal.
          </p>
        </div>

        {/* Team Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>
              Desarrollado por el equipo <strong>Kardashev One</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            Entendido, ¡iniciar exploración!
          </button>
        </div>
      </div>
    </div>
  );
};
