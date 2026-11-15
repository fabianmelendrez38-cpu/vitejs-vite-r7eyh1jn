/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HELIOS-LUNA — Explorador de Misiones al Polo Sur Lunar
 * Desarrollado por Kardashev One para el NASA Space Apps Challenge
 */

 import React, { useState, useEffect, useMemo, useRef } from 'react';
 import {
   Compass,
   Radio,
   Sun,
   BatteryCharging,
   Gauge,
   ThermometerSnowflake,
   ShieldCheck,
   ShieldAlert,
   Play,
   Pause,
   RotateCcw,
   FileText,
   Clock,
   Layers,
   Volume2,
   VolumeX,
   Satellite,
   Activity,
   Zap,
 } from 'lucide-react';
 import {
   LUNAR_SITES,
   LunarSite,
   fetchJPLHorizonsData,
   EphemerisData,
   NasaApiResponse,
 } from './lib/nasaApi.ts';
 import { TerrainViewer } from './components/TerrainViewer';
 import { InfoTooltip } from './components/InfoTooltip';
 import { GuideModal } from './components/GuideModal';
 import { WaveVisualizer } from './components/WaveVisualizer';
 import { MascotAssistant, HeliMood } from './components/MascotAssistant';
 
 export default function App() {
   // Sitio de aterrizaje seleccionado
   const [selectedSite, setSelectedSite] = useState<LunarSite>(LUNAR_SITES[0]);
 
   // Selector de fecha de misión
   const [missionDate, setMissionDate] = useState<string>('2026-11-12');
   const [dataSource, setDataSource] = useState<'LIVE_JPL_API' | 'LOCAL_ANALYTICAL_MODEL'>('LIVE_JPL_API');
   const [isLoading, setIsLoading] = useState<boolean>(false);
   const [jplResponse, setJplResponse] = useState<NasaApiResponse | null>(null);
 
   // Línea de tiempo de simulación: 0 a 48h
   const [currentHour, setCurrentHour] = useState<number>(12);
   const [isPlaying, setIsPlaying] = useState<boolean>(false);
   const [simSpeed, setSimSpeed] = useState<number>(1);
 
   // Datos de efemérides
   const [timelineData, setTimelineData] = useState<EphemerisData[]>([]);
 
   // Modales y estado de HELI
   const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
   const [audioFeedback, setAudioFeedback] = useState<boolean>(false);
   const [transientMood, setTransientMood] = useState<HeliMood | null>(null);
   const moodTimerRef = useRef<number | null>(null);
 
   // Reloj Mission Elapsed Time (MET)
   const [metSeconds, setMetSeconds] = useState<number>(275308);
 
   useEffect(() => {
     let isMounted = true;
     async function loadData() {
       setIsLoading(true);
       try {
         const response = await fetchJPLHorizonsData(missionDate);
         if (isMounted) {
           setTimelineData(response.data);
           setDataSource(response.source);
           setJplResponse(response);
         }
       } catch (err) {
         console.error('Error cargando efemérides:', err);
       } finally {
         if (isMounted) {
           setIsLoading(false);
         }
       }
     }
     loadData();
     return () => {
       isMounted = false;
     };
   }, [missionDate]);
 
   const currentTelemetry: EphemerisData = useMemo(() => {
     if (!timelineData || timelineData.length === 0) {
       return {
         time: `T+${String(currentHour).padStart(2, '0')}:00h`,
         solarElevation: 1.2,
         earthElevation: 5.4,
         isDTEAvailable: true,
         solarPowerKw: 3.4,
         solarElevationDeg: 1.2,
         solarAzimuthDeg: 45,
         earthElevationDeg: 5.4,
         earthAzimuthDeg: 12.4,
         earthSignalPercent: 98,
         earthLinkStatus: 'ACTIVA',
         batteryPercent: 84.3,
         surfaceTemperatureC: -130,
         missionViability: 'Óptima',
         missionViabilityReason: 'Suministro eléctrico garantizado y enlace de radio directo con la Tierra.',
         shadowCondition: 'Iluminación directa',
       };
     }
     return timelineData[currentHour] || timelineData[0];
   }, [timelineData, currentHour]);
 
   useEffect(() => {
     const timer = setInterval(() => {
       setMetSeconds((prev) => prev + 1);
     }, 1000);
     return () => clearInterval(timer);
   }, []);
 
   const formattedMET = useMemo(() => {
     const days = Math.floor(metSeconds / 86400);
     const hours = Math.floor((metSeconds % 86400) / 3600);
     const mins = Math.floor((metSeconds % 3600) / 60);
     const secs = metSeconds % 60;
     return `MET ${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
   }, [metSeconds]);
 
   useEffect(() => {
     if (!isPlaying) return;
 
     const intervalMs = Math.max(120, 1000 / (simSpeed * 1.5));
     const interval = setInterval(() => {
       setCurrentHour((prev) => (prev >= 48 ? 0 : prev + 1));
     }, intervalMs);
 
     return () => clearInterval(interval);
   }, [isPlaying, simSpeed]);
 
   const playClickSound = () => {
     if (!audioFeedback) return;
     try {
       const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
       const osc = audioCtx.createOscillator();
       const gain = audioCtx.createGain();
       osc.type = 'sine';
       osc.frequency.setValueAtTime(680, audioCtx.currentTime);
       osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
       gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
       gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
       osc.connect(gain);
       gain.connect(audioCtx.destination);
       osc.start();
       osc.stop(audioCtx.currentTime + 0.08);
     } catch {
       // Contexto de audio restringido
     }
   };
 
   useEffect(() => {
     return () => {
       if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
     };
   }, []);
 
   const triggerHeliMood = (nextMood: HeliMood, durationMs = 2400) => {
     if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
     setTransientMood(nextMood);
     moodTimerRef.current = window.setTimeout(() => {
       setTransientMood(null);
     }, durationMs);
   };
 
   const isDTELost =
     !currentTelemetry.isDTEAvailable ||
     currentTelemetry.earthLinkStatus === 'SIN LÍNEA DE VISTA';
 
   const heliMood: HeliMood = isDTELost ? 'alert' : transientMood ?? 'normal';
 
   const handleSiteChange = (site: LunarSite) => {
     setSelectedSite(site);
     triggerHeliMood('happy');
     playClickSound();
   };
 
   const togglePlay = () => {
     const nextPlaying = !isPlaying;
     setIsPlaying(nextPlaying);
     if (nextPlaying) {
       triggerHeliMood('surprised', 2000);
     }
     playClickSound();
   };
 
   const handleOpenGuide = () => {
     setIsGuideOpen(true);
     triggerHeliMood('happy');
   };
 
   const handleDateChange = (newDate: string) => {
     setMissionDate(newDate);
     triggerHeliMood('surprised', 2200);
   };
 
   return (
     <div className="min-h-screen bg-[#050730] text-[#EAE4C2] overflow-x-hidden p-3 sm:p-5 lg:p-6 font-sans selection:bg-[#0089C9] selection:text-[#EAE4C2]">
       {/* Modal de Guía Técnica */}
       <GuideModal
         isOpen={isGuideOpen}
         onClose={() => setIsGuideOpen(false)}
       />
 
       {/* =========================================================================
           1. BARRA SUPERIOR DE CONTROL DE MISIÓN
           ========================================================================= */}
       <header className="rounded bg-[#05487B]/65 border border-[#0089C9]/40 px-4 sm:px-5 py-3 mb-3 flex flex-wrap items-center justify-between gap-4">
         {/* Identidad del Sistema con tu Logo */}
         <div className="flex items-center gap-3.5">
           <div className="w-10 h-10 rounded bg-[#050730] border border-[#0089C9] flex items-center justify-center shrink-0 overflow-hidden p-1">
             <img
               src="/logo.png"
               alt="Logo HELIOS-LUNA"
               className="w-full h-full object-contain"
             />
           </div>
 
           <div>
             <div className="flex items-center gap-2.5">
               <h1 className="text-sm sm:text-base font-bold tracking-wider text-[#EAE4C2] uppercase">
                 HELIOS-LUNA
               </h1>
               <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#050730] border border-[#0089C9]/60 text-[#0089C9]">
                 POLO SUR LUNAR // 89°S
               </span>
             </div>
             <p className="text-[11px] text-[#C4BAA6] font-mono">
               CONSOLA DE TELEMETRÍA Y ANÁLISIS TOPOGRÁFICO &bull; ARTEMIS / CLPS
             </p>
           </div>
         </div>
 
         {/* Controles, Reloj MET y Créditos */}
         <div className="flex items-center flex-wrap gap-2.5">
           <button
             onClick={() => setAudioFeedback(!audioFeedback)}
             className="p-2 rounded bg-[#050730] hover:bg-[#0089C9]/20 text-[#C4BAA6] hover:text-[#EAE4C2] transition-colors border border-[#0089C9]/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0089C9]"
             title={audioFeedback ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'}
             aria-label="Alternar sonido"
           >
             {audioFeedback ? <Volume2 className="w-4 h-4 text-[#0089C9]" /> : <VolumeX className="w-4 h-4" />}
           </button>
 
           {/* Reloj MET */}
           <div
             className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#050730] border border-[#0089C9]/50 text-xs font-mono tabular-nums text-[#EAE4C2]"
             title="Mission Elapsed Time — Tiempo transcurrido de misión"
           >
             <Clock className="w-3.5 h-3.5 text-[#0089C9]" />
             <span>{formattedMET}</span>
           </div>
 
           {/* Botón Guía Operativa */}
           <button
             onClick={handleOpenGuide}
             className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0089C9] hover:bg-[#009CE6] text-[#EAE4C2] text-xs font-bold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EAE4C2]"
             aria-label="Abrir manual operativo"
           >
             <FileText className="w-3.5 h-3.5" />
             <span>Manual Operativo</span>
           </button>
 
           {/* Identificador de Equipo */}
           <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#050730] border border-[#0089C9]/40 text-[11px] font-mono text-[#C4BAA6]">
             <span className="font-semibold text-[#EAE4C2]">KARDASHEV ONE</span>
             <span>/</span>
             <span>NASA SPACE APPS</span>
           </div>
         </div>
       </header>
 
       {/* =========================================================================
           BARRA DE PARÁMETROS DE EFEMÉRIDES Y FUENTES DE DATOS
           ========================================================================= */}
       <div className="flex flex-wrap items-center justify-between gap-3 bg-[#05487B]/50 border border-[#0089C9]/35 rounded px-4 py-2.5 mb-4">
         <div className="flex items-center gap-2.5">
           <label htmlFor="mission-date" className="text-[11px] font-mono uppercase tracking-wider text-[#C4BAA6]">
             Fecha de Misión (UTC):
           </label>
           <input
             id="mission-date"
             type="date"
             value={missionDate}
             onChange={(e) => handleDateChange(e.target.value)}
             className="bg-[#050730] text-xs font-mono text-[#EAE4C2] border border-[#0089C9]/60 rounded px-2.5 py-1 outline-none focus:border-[#EAE4C2] cursor-pointer"
           />
         </div>
 
         {/* Indicadores de Fuente de Datos */}
         <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
           <span
             className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
               isLoading
                 ? 'bg-[#050730] text-[#C4BAA6] border-[#0089C9]/40'
                 : dataSource === 'LIVE_JPL_API'
                 ? 'bg-[#050730] text-[#0089C9] border-[#0089C9]'
                 : 'bg-[#050730] text-[#EAE4C2] border-[#C4BAA6]/60'
             }`}
           >
             <span
               className={`w-1.5 h-1.5 rounded-full ${
                 isLoading
                   ? 'bg-[#C4BAA6] animate-ping'
                   : dataSource === 'LIVE_JPL_API'
                   ? 'bg-[#0089C9]'
                   : 'bg-[#EAE4C2]'
               }`}
             />
             {isLoading
               ? 'CONSULTANDO NASA JPL HORIZONS...'
               : dataSource === 'LIVE_JPL_API'
               ? 'EFEMÉRIDES: NASA JPL EN VIVO'
               : 'EFEMÉRIDES: MODELO ANALÍTICO JPL'}
           </span>
 
           <span className="px-2.5 py-1 rounded bg-[#050730] text-[#C4BAA6] border border-[#0089C9]/35">
             TOPOGRAFÍA: LRO LOLA DEM
           </span>
         </div>
       </div>
 
       {/* =========================================================================
           2. CUERPO PRINCIPAL (Grid Modular: 3 col - 6 col - 3 col)
           ========================================================================= */}
       <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
         {/* =======================================================================
             COLUMNA IZQUIERDA (3 columnas)
             ======================================================================= */}
         <section className="lg:col-span-3 flex flex-col gap-4">
           {/* MÓDULO 1: ZONA DE ATERRIZAJE */}
           <article className="bg-[#05487B]/55 border border-[#0089C9]/40 rounded p-4 flex flex-col justify-between">
             <div className="space-y-3">
               <div className="flex items-center justify-between border-b border-[#0089C9]/35 pb-2">
                 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0089C9] flex items-center gap-1.5">
                   <Layers className="w-3.5 h-3.5" />
                   01 // ZONA DE ATERRIZAJE
                 </span>
                 <InfoTooltip
                   title="Zona de Exploración Seleccionada"
                   plainMeaning="Área geográfica del Polo Sur lunar donde se evalúa el aterrizaje de astronautas o rovers científicos."
                   whyItMatters="El Polo Sur de la Luna posee condiciones extremas: crestas con luz solar casi constante y cráteres profundos con hielo de agua protegido en sombra eterna."
                   nominalRange="Cráteres Shackleton, Malapert o Haworth"
                 />
               </div>
 
               <div>
                 <h2 className="text-base font-bold text-[#EAE4C2] leading-tight">{selectedSite.name}</h2>
                 <p className="text-xs text-[#C4BAA6] mt-0.5">{selectedSite.subtitle}</p>
               </div>
 
               <div className="p-2.5 rounded bg-[#050730] border border-[#0089C9]/30 space-y-1.5 text-xs">
                 <div className="flex justify-between text-[#C4BAA6]">
                   <span>Coordenadas:</span>
                   <span className="font-mono tabular-nums text-[#EAE4C2]">{selectedSite.coordinates}</span>
                 </div>
                 <div className="flex justify-between text-[#C4BAA6]">
                   <span>Elevación LOLA:</span>
                   <span className="font-mono tabular-nums text-[#EAE4C2]">+{selectedSite.elevationMeters} m</span>
                 </div>
                 <div className="flex justify-between text-[#C4BAA6]">
                   <span>Potencial de hielo:</span>
                   <span className="font-mono text-[#0089C9] font-semibold">{selectedSite.iceProbability}</span>
                 </div>
               </div>
             </div>
 
             {/* Estado Operativo */}
             <div className="mt-4 pt-3 border-t border-[#0089C9]/35">
               <div className="text-[10px] font-mono uppercase tracking-wider text-[#C4BAA6] mb-1.5">
                 DIAGNÓSTICO DE SUPERFICIE
               </div>
               <div
                 className={`p-2.5 rounded flex items-center gap-2 text-xs font-mono font-semibold border ${
                   (currentTelemetry.missionViability ?? 'Óptima') === 'Óptima'
                     ? 'bg-[#050730] border-[#0089C9] text-[#EAE4C2]'
                     : currentTelemetry.missionViability === 'Moderada'
                     ? 'bg-[#050730] border-[#C4BAA6] text-[#EAE4C2]'
                     : 'bg-rose-950/60 border-rose-500/70 text-[#EAE4C2]'
                 }`}
               >
                 {(currentTelemetry.missionViability ?? 'Óptima') === 'Óptima' ? (
                   <ShieldCheck className="w-4 h-4 shrink-0 text-[#0089C9]" />
                 ) : (
                   <ShieldAlert className="w-4 h-4 shrink-0 text-[#EAE4C2]" />
                 )}
                 <span className="leading-tight">
                   {(currentTelemetry.missionViability ?? 'Óptima') === 'Óptima'
                     ? 'ESTADO: NOMINAL PARA OPERACIONES'
                     : currentTelemetry.missionViability === 'Moderada'
                     ? 'ESTADO: PRECAUCIÓN (RECURSOS LIMITADOS)'
                     : 'ESTADO: CRÍTICO (SOMBRA / SIN ENLACE)'}
                 </span>
               </div>
             </div>
           </article>
 
           {/* MÓDULO 2: TELEMETRÍA ORBITAL */}
           <article className="bg-[#05487B]/55 border border-[#0089C9]/40 rounded p-4 flex flex-col justify-between space-y-3">
             <div className="flex items-center justify-between border-b border-[#0089C9]/35 pb-2">
               <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0089C9] flex items-center gap-1.5">
                 <Gauge className="w-3.5 h-3.5" />
                 02 // TELEMETRÍA EN ÓRBITA
               </span>
               <InfoTooltip
                 title="Telemetría de la Nave Espacial"
                 plainMeaning="Velocidad, altitud sobre la superficie y nivel de carga de la batería de reserva."
                 whyItMatters="Monitorea que la nave mantenga una órbita lunar estable y tenga suficiente energía para maniobrar o aterrizar."
                 nominalRange="1.62 km/s a 100 km de altitud"
               />
             </div>
 
             <div className="space-y-2.5">
               {/* Velocidad Orbital */}
               <div className="flex items-center justify-between p-2.5 rounded bg-[#050730] border border-[#0089C9]/30">
                 <div>
                   <div className="text-[11px] font-mono font-semibold text-[#EAE4C2] flex items-center gap-1.5">
                     <span>VELOCIDAD ORBITAL</span>
                     <InfoTooltip
                       title="Velocidad Orbital Lunar"
                       plainMeaning="La velocidad a la que la nave se desplaza alrededor de la Luna para mantener su órbita."
                       whyItMatters="A 100 km sobre la Luna, 1.62 km/s (5,832 km/h) es la velocidad orbital circular de equilibrio gravitatorio."
                       nominalRange="1.60 - 1.65 km/s"
                     />
                   </div>
                   <div className="text-[11px] text-[#C4BAA6]">Órbita polar de estacionamiento</div>
                 </div>
                 <div className="text-right font-mono tabular-nums">
                   <span className="text-base font-bold text-[#EAE4C2]">1.62</span>
                   <span className="text-xs text-[#C4BAA6] ml-1">km/s</span>
                 </div>
               </div>
 
               {/* Altitud */}
               <div className="flex items-center justify-between p-2.5 rounded bg-[#050730] border border-[#0089C9]/30">
                 <div>
                   <div className="text-[11px] font-mono font-semibold text-[#EAE4C2] flex items-center gap-1.5">
                     <span>ALTITUD MEDIA</span>
                     <InfoTooltip
                       title="Altitud Orbital"
                       plainMeaning="Distancia vertical entre la nave espacial y el relieve medio de la superficie lunar."
                       whyItMatters="104 km permite mapeo altimétrico de alta resolución sin riesgo de colisión con crestas polares."
                       nominalRange="90 - 120 km"
                     />
                   </div>
                   <div className="text-[11px] text-[#C4BAA6]">Sobre datum lunar LOLA</div>
                 </div>
                 <div className="text-right font-mono tabular-nums">
                   <span className="text-base font-bold text-[#EAE4C2]">104</span>
                   <span className="text-xs text-[#C4BAA6] ml-1">km</span>
                 </div>
               </div>
 
               {/* Reserva de Batería */}
               <div className="p-2.5 rounded bg-[#050730] border border-[#0089C9]/30 space-y-2">
                 <div className="flex items-center justify-between text-xs">
                   <div className="font-mono font-semibold text-[#EAE4C2] flex items-center gap-1.5 text-[11px]">
                     <BatteryCharging className="w-3.5 h-3.5 text-[#0089C9]" />
                     <span>CARGA DE BATERÍA</span>
                     <InfoTooltip
                       title="Reserva de Baterías"
                       plainMeaning="Porcentaje de energía almacenada disponible durante tránsitos por zonas de sombra."
                       whyItMatters="En la sombra polar no hay generación fotovoltaica; las baterías sostienen los calentadores y enlaces de radio."
                       nominalRange="> 40% nominal"
                     />
                   </div>
                   <span
                     className={`font-mono tabular-nums font-bold ${
                       (currentTelemetry.batteryPercent ?? 84.3) > 50
                         ? 'text-[#0089C9]'
                         : (currentTelemetry.batteryPercent ?? 84.3) > 25
                         ? 'text-[#EAE4C2]'
                         : 'text-rose-400'
                     }`}
                   >
                     {currentTelemetry.batteryPercent ?? 84.3}%
                   </span>
                 </div>
 
                 <div className="w-full bg-[#05487B]/50 rounded-sm h-1.5 overflow-hidden">
                   <div
                     className={`h-full transition-all duration-300 ${
                       (currentTelemetry.batteryPercent ?? 84.3) > 50
                         ? 'bg-[#0089C9]'
                         : (currentTelemetry.batteryPercent ?? 84.3) > 25
                         ? 'bg-[#EAE4C2]'
                         : 'bg-rose-500'
                     }`}
                     style={{ width: `${currentTelemetry.batteryPercent ?? 84.3}%` }}
                   />
                 </div>
                 <div className="text-[10px] font-mono text-[#C4BAA6] flex justify-between">
                   <span>
                     {currentTelemetry.solarPowerKw > 1.2 ? 'BUS: CARGANDO (+)' : 'BUS: DESCARGA (-)'}
                   </span>
                   <span>CONSUMO BASE: 1.2 kW</span>
                 </div>
               </div>
             </div>
           </article>
 
           {/* MÓDULO 3: ENTORNO FÍSICO LUNAR */}
           <article className="bg-[#05487B]/55 border border-[#0089C9]/40 rounded p-4 flex flex-col justify-between space-y-3">
             <div className="flex items-center justify-between border-b border-[#0089C9]/35 pb-2">
               <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0089C9] flex items-center gap-1.5">
                 <ThermometerSnowflake className="w-3.5 h-3.5" />
                 03 // ENTORNO FÍSICO SUPERFICIAL
               </span>
               <InfoTooltip
                 title="Condiciones Ambientales en Superficie"
                 plainMeaning="Temperatura del regolito y tasa de radiación ionizante en el sitio de aterrizaje."
                 whyItMatters="Sin atmósfera que regule el calor, las trampas frías alcanzan -240°C, exigiendo control térmico activo."
                 nominalRange="-180°C a +40°C (trajes xEMU)"
               />
             </div>
 
             {/* Temperatura */}
             <div className="p-2.5 rounded bg-[#050730] border border-[#0089C9]/30 space-y-1.5">
               <div className="flex items-center justify-between">
                 <span className="text-[11px] font-mono text-[#EAE4C2] font-semibold flex items-center gap-1.5">
                   TEMP. REGOLITO:
                   <InfoTooltip
                     title="Temperatura del Suelo Lunar"
                     plainMeaning="Temperatura estimada de la superficie en el instante seleccionado de la simulación."
                     whyItMatters="Al ocultarse el Sol bajo el horizonte, la temperatura cae rápidamente por radiación térmica al vacío."
                   />
                 </span>
                 <span className="text-base font-bold font-mono tabular-nums text-[#0089C9]">
                   {currentTelemetry.surfaceTemperatureC ?? -130}°C
                 </span>
               </div>
               <div className="text-[11px] text-[#C4BAA6] bg-[#05487B]/35 px-2 py-1 rounded border border-[#0089C9]/30">
                 {(currentTelemetry.surfaceTemperatureC ?? -130) < -180
                   ? 'Régimen criogénico: calefacción activa de subsistemas requerida'
                   : (currentTelemetry.surfaceTemperatureC ?? -130) < -100
                   ? 'Frío polar severo: control térmico en modo nominal'
                   : 'Iluminación rasante: condición térmica apta para operaciones EVA'}
               </div>
             </div>
 
             {/* Radiación */}
             <div className="p-2.5 rounded bg-[#050730] border border-[#0089C9]/30 space-y-1">
               <div className="flex items-center justify-between">
                 <span className="text-[11px] font-mono text-[#EAE4C2] font-semibold flex items-center gap-1.5">
                   DOSIS RADIACIÓN:
                   <InfoTooltip
                     title="Radiación Cósmica y Solar"
                     plainMeaning="Flujo de rayos cósmicos galácticos (GCR) y partículas solares medidos sin protección atmosférica."
                     whyItMatters="Permite determinar ventanas seguras para actividades extravehiculares (EVA)."
                     nominalRange="NOMINAL (1.2 - 1.5 mSv/día)"
                   />
                 </span>
                 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#05487B] border border-[#0089C9] text-[#EAE4C2]">
                   NOMINAL
                 </span>
               </div>
               <div className="text-[11px] font-mono text-[#C4BAA6]">
                 1.30 mSv/día &bull; Dentro de límite operacional
               </div>
             </div>
           </article>
         </section>
 
         {/* =======================================================================
             COLUMNA CENTRAL (6 columnas — Visor Topográfico 3D)
             ======================================================================= */}
         <section className="lg:col-span-6 flex flex-col">
           <div className="bg-[#05487B]/55 border border-[#0089C9]/45 rounded p-4 sm:p-5 flex-1 flex flex-col justify-between relative overflow-hidden min-h-[580px] lg:min-h-[650px]">
             {/* Cabecera del Visor */}
             <div className="space-y-3 z-10">
               <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0089C9]/35 pb-3">
                 <div>
                   <h2 className="text-sm sm:text-base font-bold text-[#EAE4C2] tracking-wide uppercase flex items-center gap-2">
                     <Compass className="w-4 h-4 text-[#0089C9]" />
                     MODELO TOPOGRÁFICO 3D — POLO SUR LUNAR
                   </h2>
                   <p className="text-xs text-[#C4BAA6]">
                     Reconstrucción altimétrica LOLA y trazado dinámico de sombras solares
                   </p>
                 </div>
 
                 <span className="px-2.5 py-1 rounded bg-[#050730] text-[10px] font-mono text-[#EAE4C2] border border-[#0089C9]/50">
                   MALLA DEM // RENDER 3D
                 </span>
               </div>
 
               {/* Selector de Sitio (Tabs técnicos) */}
               <div className="flex flex-wrap items-center gap-1.5">
                 <span className="text-[11px] font-mono font-semibold text-[#C4BAA6] uppercase mr-1">
                   OBJETIVO:
                 </span>
                 {LUNAR_SITES.map((site) => {
                   const isSelected = selectedSite.id === site.id;
                   return (
                     <button
                       key={site.id}
                       onClick={() => handleSiteChange(site)}
                       className={`px-3 py-1 rounded text-xs font-mono transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#EAE4C2] ${
                         isSelected
                           ? 'bg-[#0089C9] text-[#EAE4C2] font-bold border border-[#EAE4C2]/40'
                           : 'bg-[#050730] hover:bg-[#05487B] text-[#C4BAA6] hover:text-[#EAE4C2] border border-[#0089C9]/35'
                       }`}
                       aria-pressed={isSelected}
                     >
                       {site.name}
                     </button>
                   );
                 })}
               </div>
 
               {/* Nota Técnica del Sitio */}
               <div className="bg-[#050730] border border-[#0089C9]/35 p-2.5 rounded text-xs text-[#C4BAA6] leading-relaxed">
                 <span className="font-mono text-[11px] uppercase font-bold text-[#0089C9] mr-2">
                   [INTERÉS CIENTÍFICO]:
                 </span>
                 {selectedSite.whyItMatters}
               </div>
             </div>
 
             {/* Canvas 3D */}
             <div className="flex-1 my-3 relative rounded overflow-hidden border border-[#0089C9]/45 bg-[#050730]">
               <TerrainViewer
                 currentTelemetry={currentTelemetry}
                 selectedSite={selectedSite}
                 isSimulating={isPlaying}
               />
             </div>
 
             {/* Barra Inferior de Estado del Visor */}
             <div className="z-10 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#0089C9]/35 text-[11px] font-mono text-[#C4BAA6]">
               <div className="flex items-center gap-1.5">
                 <Satellite className="w-3.5 h-3.5 text-[#0089C9]" />
                 <span>
                   {jplResponse?.message || 'Efemérides sincronizadas con NASA JPL Horizons'}
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <span>CONDICIÓN SOLAR:</span>
                 <span className="font-semibold text-[#EAE4C2] uppercase">
                   {currentTelemetry.shadowCondition ?? 'Iluminación directa'}
                 </span>
               </div>
             </div>
           </div>
         </section>
 
         {/* =======================================================================
             COLUMNA DERECHA (3 columnas)
             ======================================================================= */}
         <section className="lg:col-span-3 flex flex-col gap-4">
           {/* MÓDULO 4: ENLACE DIRECTO CON LA TIERRA (DTE) */}
           <article className="bg-[#05487B]/55 border border-[#0089C9]/40 rounded p-4 flex flex-col justify-between space-y-3">
             <div className="space-y-1">
               <div className="flex items-center justify-between border-b border-[#0089C9]/35 pb-2">
                 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0089C9] flex items-center gap-1.5">
                   <Radio className="w-3.5 h-3.5" />
                   04 // ENLACE DIRECTO TIERRA (DTE)
                 </span>
                 <InfoTooltip
                   title="Enlace Direct-To-Earth (DTE)"
                   plainMeaning="Comunicación directa por radiofrecuencia entre la nave y las estaciones terrestres de la Red del Espacio Profundo (DSN)."
                   whyItMatters="Sin línea de vista directa con la Tierra, las comunicaciones requieren un satélite repetidor en órbita lunar."
                   nominalRange="Elevación > 1.5° sobre el horizonte"
                 />
               </div>
               <p className="text-xs text-[#C4BAA6]">
                 Visibilidad geométrica hacia la Red del Espacio Profundo (DSN)
               </p>
             </div>
 
             {/* Estado de Señal */}
             <div
               className={`p-2.5 rounded flex items-center justify-between text-xs font-mono font-bold border ${
                 (currentTelemetry.earthLinkStatus ?? 'ACTIVA') === 'ACTIVA'
                   ? 'bg-[#050730] border-[#0089C9] text-[#EAE4C2]'
                   : currentTelemetry.earthLinkStatus === 'DEGRADADA'
                   ? 'bg-[#050730] border-[#C4BAA6] text-[#EAE4C2]'
                   : 'bg-rose-950/60 border-rose-500/70 text-[#EAE4C2]'
               }`}
             >
               <div className="flex items-center gap-2">
                 <span
                   className={`w-2 h-2 rounded-full ${
                     (currentTelemetry.earthLinkStatus ?? 'ACTIVA') === 'ACTIVA'
                       ? 'bg-[#0089C9]'
                       : currentTelemetry.earthLinkStatus === 'DEGRADADA'
                       ? 'bg-[#C4BAA6]'
                       : 'bg-rose-500'
                   }`}
                 />
                 <span>
                   {(currentTelemetry.earthLinkStatus ?? 'ACTIVA') === 'ACTIVA'
                     ? `ACTIVO (${currentTelemetry.earthSignalPercent ?? 98}%)`
                     : currentTelemetry.earthLinkStatus === 'DEGRADADA'
                     ? `DEGRADADO (${currentTelemetry.earthSignalPercent ?? 50}%)`
                     : 'SIN LÍNEA DE VISTA'}
                 </span>
               </div>
               <span className="text-[10px] text-[#C4BAA6]">RTT 2.56s</span>
             </div>
 
             <WaveVisualizer
               status={currentTelemetry.earthLinkStatus ?? 'ACTIVA'}
               signalPercent={currentTelemetry.earthSignalPercent ?? 98}
             />
 
             <div className="space-y-1.5 text-xs">
               <div className="flex justify-between p-2 rounded bg-[#050730] border border-[#0089C9]/30">
                 <span className="text-[#C4BAA6]">Elevación de la Tierra:</span>
                 <span className="font-mono tabular-nums font-bold text-[#EAE4C2]">
                   {(currentTelemetry.earthElevationDeg ?? currentTelemetry.earthElevation) > 0
                     ? `+${currentTelemetry.earthElevationDeg ?? currentTelemetry.earthElevation}°`
                     : `${currentTelemetry.earthElevationDeg ?? currentTelemetry.earthElevation}°`}
                 </span>
               </div>
               <p className="text-[11px] text-[#C4BAA6] leading-normal">
                 {(currentTelemetry.earthElevationDeg ?? currentTelemetry.earthElevation) > 2
                   ? 'Línea de vista despejada sobre crestas polares. Enlace banda Ka nominal.'
                   : (currentTelemetry.earthElevationDeg ?? currentTelemetry.earthElevation) > 0.4
                   ? 'Elevación rasante: posible difracción por relieve del horizonte.'
                   : 'Ocultación por relieve lunar: enlace directo interrumpido.'}
               </p>
             </div>
           </article>
 
           {/* MÓDULO 5: CONTROL DE SIMULACIÓN TEMPORAL (48h) */}
           <article className="bg-[#05487B]/55 border border-[#0089C9]/40 rounded p-4 flex flex-col justify-between space-y-3.5">
             <div className="space-y-1">
               <div className="flex items-center justify-between border-b border-[#0089C9]/35 pb-2">
                 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0089C9] flex items-center gap-1.5">
                   <Sun className="w-3.5 h-3.5" />
                   05 // SIMULACIÓN TEMPORAL (48H)
                 </span>
                 <InfoTooltip
                   title="Simulador de Iluminación en 48 Horas"
                   plainMeaning="Controla el avance temporal para observar el desplazamiento rasante del Sol y la proyección de sombras."
                   whyItMatters="Permite identificar ventanas de generación eléctrica y periodos de sombra crítica."
                   nominalRange="0h a 48h"
                 />
               </div>
               <p className="text-xs text-[#C4BAA6]">
                 Control de paso temporal y ángulo de incidencia solar
               </p>
             </div>
 
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1.5">
                   <button
                     onClick={togglePlay}
                     className="w-8 h-8 rounded bg-[#0089C9] hover:bg-[#009CE6] text-[#EAE4C2] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#EAE4C2]"
                     aria-label={isPlaying ? 'Pausar simulación' : 'Iniciar simulación'}
                     title={isPlaying ? 'Pausar' : 'Iniciar'}
                   >
                     {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                   </button>
 
                   <button
                     onClick={() => {
                       setCurrentHour(0);
                       playClickSound();
                     }}
                     className="p-2 rounded bg-[#050730] hover:bg-[#05487B] border border-[#0089C9]/35 text-[#C4BAA6] hover:text-[#EAE4C2] transition-colors"
                     title="Reiniciar a T+00:00h"
                     aria-label="Reiniciar simulación"
                   >
                     <RotateCcw className="w-3.5 h-3.5" />
                   </button>
 
                   {/* Selector de Velocidad */}
                   <div className="flex items-center bg-[#050730] rounded p-0.5 border border-[#0089C9]/35 text-[10px]">
                     {[1, 3, 6].map((sp) => (
                       <button
                         key={sp}
                         onClick={() => setSimSpeed(sp)}
                         className={`px-2 py-1 rounded-sm font-mono font-semibold transition-colors ${
                           simSpeed === sp
                             ? 'bg-[#0089C9] text-[#EAE4C2]'
                             : 'text-[#C4BAA6] hover:text-[#EAE4C2]'
                         }`}
                         aria-label={`Velocidad ${sp}x`}
                       >
                         {sp}x
                       </button>
                     ))}
                   </div>
                 </div>
 
                 <div className="text-right font-mono tabular-nums">
                   <span className="text-sm font-bold text-[#EAE4C2]">
                     T+{String(currentHour).padStart(2, '0')}:00h
                   </span>
                   <div className="text-[10px] text-[#C4BAA6]">VENTANA 48H</div>
                 </div>
               </div>
 
               {/* Slider de Tiempo */}
               <div className="space-y-1">
                 <input
                   type="range"
                   min="0"
                   max="48"
                   step="1"
                   value={currentHour}
                   onChange={(e) => {
                     setCurrentHour(parseInt(e.target.value, 10));
                     playClickSound();
                   }}
                   className="w-full h-1.5 bg-[#050730] rounded-sm appearance-none cursor-pointer accent-[#0089C9] focus:outline-none"
                   aria-label="Línea de tiempo de 48 horas"
                 />
                 <div className="flex justify-between text-[10px] font-mono text-[#C4BAA6]">
                   <span>T+00h</span>
                   <span>T+24h</span>
                   <span>T+48h</span>
                 </div>
               </div>
 
               {/* Presets de Iluminación */}
               <div className="grid grid-cols-3 gap-1.5">
                 <button
                   onClick={() => setCurrentHour(4)}
                   className="px-2 py-1.5 rounded bg-[#050730] hover:bg-[#0089C9]/25 text-[10px] font-mono text-[#EAE4C2] transition-colors border border-[#0089C9]/35"
                 >
                   RASANTE
                 </button>
                 <button
                   onClick={() => setCurrentHour(18)}
                   className="px-2 py-1.5 rounded bg-[#050730] hover:bg-[#0089C9]/25 text-[10px] font-mono text-[#EAE4C2] transition-colors border border-[#0089C9]/35"
                 >
                   MÁX. SOLAR
                 </button>
                 <button
                   onClick={() => setCurrentHour(34)}
                   className="px-2 py-1.5 rounded bg-[#050730] hover:bg-[#0089C9]/25 text-[10px] font-mono text-[#EAE4C2] transition-colors border border-[#0089C9]/35"
                 >
                   ECLIPSE
                 </button>
               </div>
 
               {/* Métricas Solares */}
               <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#0089C9]/35">
                 <div className="p-2 rounded bg-[#050730] border border-[#0089C9]/30 text-center">
                   <div className="text-[10px] font-mono uppercase text-[#C4BAA6]">Elevación Solar</div>
                   <div className="text-sm font-bold font-mono tabular-nums text-[#EAE4C2] mt-0.5">
                     {(currentTelemetry.solarElevationDeg ?? currentTelemetry.solarElevation) > 0
                       ? `+${currentTelemetry.solarElevationDeg ?? currentTelemetry.solarElevation}°`
                       : `${currentTelemetry.solarElevationDeg ?? currentTelemetry.solarElevation}°`}
                   </div>
                 </div>
 
                 <div className="p-2 rounded bg-[#050730] border border-[#0089C9]/30 text-center">
                   <div className="text-[10px] font-mono uppercase text-[#C4BAA6]">Potencia FV</div>
                   <div className="text-sm font-bold font-mono tabular-nums text-[#0089C9] mt-0.5">
                     {currentTelemetry.solarPowerKw} kW
                   </div>
                 </div>
               </div>
             </div>
           </article>
 
           {/* MÓDULO 6: DIAGNÓSTICO DEL ATERRIZADOR */}
           <article className="bg-[#05487B]/55 border border-[#0089C9]/40 rounded p-4 flex flex-col justify-between space-y-3">
             <div className="flex items-center justify-between border-b border-[#0089C9]/35 pb-2">
               <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0089C9] flex items-center gap-1.5">
                 <Activity className="w-3.5 h-3.5" />
                 06 // SUBSISTEMAS DEL LANDER
               </span>
               <InfoTooltip
                 title="Estado del Módulo de Aterrizaje"
                 plainMeaning="Diagnóstico general de aviónica, generación eléctrica y control térmico del aterrizador."
                 whyItMatters="Confirma la integridad operativa antes y después del alunizaje."
                 nominalRange="100% Nominal"
               />
             </div>
 
             <div className="space-y-2">
               <div className="flex items-center justify-between p-2 rounded bg-[#050730] border border-[#0089C9]/30">
                 <span className="text-[11px] font-mono text-[#C4BAA6]">AVIÓNICA Y BUS:</span>
                 <span className="text-xs font-mono font-bold text-[#0089C9] flex items-center gap-1.5">
                   <ShieldCheck className="w-3.5 h-3.5" />
                   100% NOMINAL
                 </span>
               </div>
 
               <div className="flex items-center justify-between p-2 rounded bg-[#050730] border border-[#0089C9]/30">
                 <span className="text-[11px] font-mono text-[#C4BAA6] flex items-center gap-1">
                   <Zap className="w-3.5 h-3.5 text-[#EAE4C2]" />
                   GENERACIÓN SOLAR:
                 </span>
                 <span className="text-xs font-bold font-mono tabular-nums text-[#EAE4C2]">
                   {currentTelemetry.solarPowerKw} kW
                 </span>
               </div>
 
               <div className="p-2.5 rounded bg-[#050730] border border-[#0089C9]/35 space-y-1.5">
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-[11px] font-mono text-[#C4BAA6]">VIABILIDAD:</span>
                   <span
                     className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                       (currentTelemetry.missionViability ?? 'Óptima') === 'Óptima'
                         ? 'bg-[#05487B] text-[#EAE4C2] border-[#0089C9]'
                         : currentTelemetry.missionViability === 'Moderada'
                         ? 'bg-[#05487B]/50 text-[#EAE4C2] border-[#C4BAA6]'
                         : 'bg-rose-950/60 text-[#EAE4C2] border-rose-500'
                     }`}
                   >
                     {currentTelemetry.missionViability ?? 'Óptima'}
                   </span>
                 </div>
                 <p className="text-[11px] text-[#C4BAA6] leading-relaxed">
                   {currentTelemetry.missionViabilityReason ??
                     'Suministro eléctrico garantizado y enlace de radio directo con la Tierra.'}
                 </p>
               </div>
             </div>
           </article>
         </section>
       </main>
 
       {/* Pie de Página Técnico */}
       <footer className="mt-6 pt-3 border-t border-[#0089C9]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[#C4BAA6]">
         <div>
           HELIOS-LUNA // EQUIPO <strong className="text-[#EAE4C2]">KARDASHEV ONE</strong> &bull; NASA SPACE APPS CHALLENGE
         </div>
         <div className="flex items-center gap-4">
           <span>FUENTES: NASA JPL HORIZONS &bull; LRO LOLA DEM</span>
           <button
             onClick={handleOpenGuide}
             className="text-[#0089C9] hover:text-[#EAE4C2] underline"
           >
             MANUAL (1 MIN)
           </button>
         </div>
       </footer>
 
       {/* Asistente Mascota HELI */}
       <MascotAssistant
         mood={heliMood}
         selectedSite={selectedSite}
         currentTelemetry={currentTelemetry}
         missionDate={missionDate}
         onOpenGuide={handleOpenGuide}
       />
     </div>
   );
 }