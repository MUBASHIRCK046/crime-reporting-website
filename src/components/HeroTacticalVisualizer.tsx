"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Radio,
  AlertTriangle,
  PhoneCall,
  Car,
  Users,
  Crosshair,
  MapPin,
  Activity,
  Zap,
  Navigation,
  Globe,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Layers,
  Send,
  Lock,
  Wifi,
  Eye,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  Cpu
} from "lucide-react";

// ==============================================================================
// TYPES
// ==============================================================================
export type VisualizerPhase =
  | "patrol"
  | "emergency"
  | "dispatch"
  | "responding"
  | "resolved";

export interface TacticalMarker {
  id: string;
  name: string;
  code: string;
  type: "police" | "tower" | "call" | "incident" | "vehicle" | "personnel";
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  status: string;
  statusColor: string;
  speed?: string;
  eta?: string;
  distance?: string;
  heading?: number;
  highlighted?: boolean;
}

export function HeroTacticalVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Mouse Tilt & Parallax State ───────────────────────────────────────────
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // ── Storytelling Demonstration Loop State ────────────────────────────────
  const [phase, setPhase] = useState<VisualizerPhase>("emergency");
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [phaseTimer, setPhaseTimer] = useState(0);

  // ── Interactive Selection & Focus ─────────────────────────────────────────
  const [selectedMarker, setSelectedMarker] = useState<TacticalMarker | null>(null);

  // ── Active System Layers ──────────────────────────────────────────────────
  const [activeLayers, setActiveLayers] = useState({
    police: true,
    towers: true,
    calls: true,
    incidents: true,
    vehicles: true,
    personnel: true,
    geofence: true,
  });

  // ── Live Animated Entity Positions ────────────────────────────────────────
  const [unit42Pos, setUnit42Pos] = useState({ x: 26, y: 64 });
  const [targetVehPos, setTargetVehPos] = useState({ x: 74, y: 32 });
  const [dronePos, setDronePos] = useState({ x: 50, y: 36 });
  const [radarDegrees, setRadarDegrees] = useState(0);

  // ── Story Loop Progression (Ambient -> Emergency -> Dispatch -> En Route) ──
  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setPhaseTimer((prev) => {
        const next = (prev + 1) % 18; // 18 seconds total story loop

        if (next === 0) setPhase("patrol");
        else if (next === 4) setPhase("emergency");
        else if (next === 8) setPhase("dispatch");
        else if (next === 12) setPhase("responding");
        else if (next === 16) setPhase("resolved");

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoPlay]);

  // ── Continuous 60fps Micro-Animations (Vehicles, Patrol, Drone, Radar) ────
  useEffect(() => {
    const animInterval = setInterval(() => {
      setRadarDegrees((prev) => (prev + 2.5) % 360);

      // Drone circular orbit
      const droneAngle = (Date.now() / 2400) % (Math.PI * 2);
      setDronePos({
        x: 52 + Math.cos(droneAngle) * 8,
        y: 44 + Math.sin(droneAngle) * 8,
      });

      // Suspect Vehicle movement along upper road corridor
      setTargetVehPos((prev) => ({
        x: prev.x <= 28 ? 78 : prev.x - 0.35,
        y: prev.y >= 55 ? 28 : prev.y + 0.15,
      }));

      // Police Unit-042 movement behavior based on active storytelling phase
      if (phase === "responding" || phase === "dispatch") {
        // Intercept route toward emergency at (68, 38)
        setUnit42Pos((prev) => {
          const targetX = 66;
          const targetY = 40;
          const dx = targetX - prev.x;
          const dy = targetY - prev.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) return { x: targetX, y: targetY };
          return {
            x: prev.x + (dx / dist) * 0.7,
            y: prev.y + (dy / dist) * 0.7,
          };
        });
      } else if (phase === "patrol" || phase === "resolved") {
        // Standard patrol drift
        setUnit42Pos((prev) => ({
          x: prev.x >= 70 ? 25 : prev.x + 0.25,
          y: prev.y <= 30 ? 68 : prev.y - 0.15,
        }));
      }
    }, 80);

    return () => clearInterval(animInterval);
  }, [phase]);

  // ── Handle Mouse Parallax on Visualizer ────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  // ── Mock Key Entities on Map ──────────────────────────────────────────────
  const cellTowers = [
    { id: "t1", name: "Tower Alpha (Central)", code: "TWR-01", x: 22, y: 28, coverage: "5G VHF" },
    { id: "t2", name: "Tower Bravo (North)", code: "TWR-02", x: 76, y: 22, coverage: "UHF Repeater" },
    { id: "t3", name: "Tower Charlie (Riverbed)", code: "TWR-03", x: 38, y: 78, coverage: "Tetra Mesh" },
    { id: "t4", name: "Tower Delta (Highway Hub)", code: "TWR-04", x: 82, y: 74, coverage: "5G Ultra" },
  ];

  const emergencyCall = {
    id: "call-sos",
    name: "SOS Distress Signal: Armed Intrusion",
    code: "EMERGENCY #9081",
    x: 68,
    y: 38,
    status: phase === "resolved" ? "SECURED BY UNIT-042" : phase === "responding" ? "UNIT EN ROUTE" : "CRITICAL ALERT",
    statusColor: phase === "resolved" ? "#10B981" : "#FF304F",
    eta: phase === "responding" ? "00:42" : "01:30",
  };

  const incidentsList = [
    { id: "inc-1", name: "Commercial Robbery", code: "INC-882", x: 68, y: 38, severity: "HIGH", color: "#FF304F" },
    { id: "inc-2", name: "Traffic Intercept", code: "INC-402", x: 44, y: 56, severity: "MED", color: "#FFB020" },
    { id: "inc-3", name: "CCTV Perimeter Alert", code: "INC-119", x: 24, y: 46, severity: "LOW", color: "#00E5FF" },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => {
        setIsHovered(true);
        handleMouseMove(e);
      }}
      onMouseLeave={handleMouseLeave}
      className="relative w-full rounded-3xl p-1 bg-gradient-to-b from-cyan-500/20 via-blue-500/10 to-purple-500/20 shadow-[0_0_80px_rgba(0,168,255,0.2)] border border-cyan-500/30 backdrop-blur-xl group transition-all duration-300"
    >
      {/* ── Outer Holographic Glass Frame ── */}
      <div className="relative w-full h-[540px] sm:h-[580px] lg:h-[620px] rounded-[1.4rem] bg-[#020718]/90 overflow-hidden flex flex-col justify-between border border-cyan-400/20 select-none">
        
        {/* Subtle Ambient Scanlines & Radial Bloom */}
        <div className="absolute inset-0 pointer-events-none z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-35" />
        <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,7,24,0.85)_100%)]" />

        {/* ── TOP FLOATING TELEMETRY HUD BAR ── */}
        <div className="relative z-40 px-5 py-3.5 border-b border-cyan-500/20 bg-[#020a20]/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          
          {/* Status Cockpit */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 relative" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-widest text-cyan-300 uppercase font-mono drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                  LIVE TACTICAL STREAM
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono font-bold">
                  SECTOR 04
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span>11.2588° N</span>
                <span>•</span>
                <span>75.7804° E</span>
                <span>•</span>
                <strong className="text-emerald-400">LATENCY 1.2ms</strong>
              </span>
            </div>
          </div>

          {/* Minimal Story Demonstration Stepper Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/25 text-[9px] font-mono">
            <span className="text-slate-400 uppercase font-bold">AI DISPATCH CYCLE:</span>
            <span
              className={`px-2 py-0.5 rounded font-black tracking-wider uppercase transition-all ${
                phase === "emergency"
                  ? "bg-red-500/30 text-red-300 border border-red-500 animate-pulse"
                  : phase === "dispatch"
                  ? "bg-amber-500/30 text-amber-300 border border-amber-500"
                  : phase === "responding"
                  ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500 animate-pulse"
                  : phase === "resolved"
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {phase === "patrol" && "1. NORMAL PATROL"}
              {phase === "emergency" && "2. ⚠️ EMERGENCY TRIGGERED"}
              {phase === "dispatch" && "3. 🎯 UNIT-042 ASSIGNED"}
              {phase === "responding" && "4. ⚡ EN ROUTE (ETA: 42s)"}
              {phase === "resolved" && "5. ✓ PERIMETER SECURED"}
            </span>
          </div>

          {/* Quick Manual Phase Scrubber */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className="px-2 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              {isAutoPlay ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3 text-cyan-400" />}
              <span>{isAutoPlay ? "AUTO DEMO" : "PAUSED"}</span>
            </button>
          </div>
        </div>

        {/* ── 3D HOLOGRAPHIC CITY & PERSPECTIVE TACTICAL MAP CONTAINER ── */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
          
          {/* 3D Perspective Tilt Container */}
          <motion.div
            animate={{
              rotateX: mousePos.y * 0.45,
              rotateY: -mousePos.x * 0.45,
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="relative w-full h-full [perspective:1000px] flex items-center justify-center origin-center"
          >
            {/* Background 3D Perspective Plane */}
            <div className="relative w-full h-full bg-[#020b22] overflow-hidden">
              
              {/* 1. Concentric Radar Grid Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-[500px] h-[500px] rounded-full border border-cyan-500/15 flex items-center justify-center">
                  <div className="absolute inset-16 rounded-full border border-cyan-500/15" />
                  <div className="absolute inset-32 rounded-full border border-cyan-500/20" />
                  <div className="absolute inset-48 rounded-full border border-dashed border-cyan-400/25 animate-[spin_60s_linear_infinite]" />
                  <div className="absolute inset-[300px] rounded-full border border-cyan-500/30" />

                  {/* Angular degree crosshairs */}
                  <div className="absolute w-full h-[1px] bg-cyan-500/15" />
                  <div className="absolute h-full w-[1px] bg-cyan-500/15" />
                  <div className="absolute w-full h-[1px] bg-cyan-500/10 rotate-45" />
                  <div className="absolute w-full h-[1px] bg-cyan-500/10 -rotate-45" />

                  {/* Cardinal direction tags */}
                  <span className="absolute top-2 text-[9px] font-mono font-bold text-cyan-400/60">N 000°</span>
                  <span className="absolute bottom-2 text-[9px] font-mono font-bold text-cyan-400/60">S 180°</span>
                  <span className="absolute right-2 text-[9px] font-mono font-bold text-cyan-400/60">E 090°</span>
                  <span className="absolute left-2 text-[9px] font-mono font-bold text-cyan-400/60">W 270°</span>
                </div>
              </div>

              {/* 2. Micro Dot Grid */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00e5ff_1.2px,transparent_1.2px)] [background-size:20px_20px] pointer-events-none" />

              {/* 3. 360° Rotating Radar Sweep Line */}
              <div
                style={{ transform: `rotate(${radarDegrees}deg)` }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none origin-center"
              >
                <div className="relative w-[520px] h-[520px] rounded-full">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 0deg at 50% 50%, rgba(0, 229, 255, 0.22) 0deg, rgba(0, 229, 255, 0.04) 40deg, transparent 80deg)",
                    }}
                  />
                  <div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent shadow-[0_0_10px_#00e5ff] origin-left" />
                </div>
              </div>

              {/* 4. SVG City Roads Network, 3D Building Blocks & Triangulation Vectors */}
              <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none overflow-visible">
                <defs>
                  <linearGradient id="cyanVectorRoute" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#1687FF" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="emergencyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF304F" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FF304F" stopOpacity="0.1" />
                  </linearGradient>
                  <pattern id="zoneGridPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#FF304F" strokeWidth="1" strokeOpacity="0.3" />
                  </pattern>
                </defs>

                {/* ── Glowing City Roads (Main Arterials & Grid) ── */}
                <g stroke="rgba(0, 168, 255, 0.25)" strokeWidth="2.5" fill="none" strokeLinecap="round">
                  {/* Horizontal Avenues */}
                  <path d="M 0 160 L 1000 160" />
                  <path d="M 0 320 L 1000 320" strokeWidth="3.5" stroke="rgba(0, 229, 255, 0.35)" />
                  <path d="M 0 480 L 1000 480" />

                  {/* Vertical Boulevards */}
                  <path d="M 220 0 L 220 700" />
                  <path d="M 500 0 L 500 700" strokeWidth="3.5" stroke="rgba(0, 229, 255, 0.35)" />
                  <path d="M 780 0 L 780 700" />

                  {/* Diagonal Highway Bypass */}
                  <path d="M 120 540 Q 420 300, 860 180" stroke="#1687FF" strokeWidth="2" strokeDasharray="6,4" />
                </g>

                {/* ── 3D Isometric Holographic Building Footprints ── */}
                <g fill="rgba(0, 229, 255, 0.04)" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1">
                  {/* City Block 1 */}
                  <rect x="250" y="190" width="80" height="90" rx="4" />
                  <rect x="260" y="200" width="60" height="70" rx="2" fill="rgba(22, 135, 255, 0.08)" />

                  {/* City Block 2 - Commercial Plaza */}
                  <rect x="540" y="200" width="100" height="85" rx="4" />
                  <rect x="555" y="215" width="70" height="55" rx="2" fill="rgba(139, 92, 246, 0.08)" stroke="#8B5CF6" />

                  {/* City Block 3 */}
                  <rect x="360" y="360" width="100" height="80" rx="4" />

                  {/* City Block 4 - Highway Depot */}
                  <rect x="650" y="360" width="90" height="80" rx="4" />
                </g>

                {/* ── Geofence Zone (Sector 4 Restricted Area) ── */}
                <polygon
                  points="520,180 760,180 780,310 510,310"
                  fill="url(#zoneGridPattern)"
                  stroke="#FF304F"
                  strokeWidth="1.5"
                  strokeDasharray="5,3"
                  className={phase === "emergency" || phase === "dispatch" ? "animate-pulse" : ""}
                />

                {/* ── Cell Tower Triangulation Rays to Emergency Location (68%, 38%) ── */}
                {(phase === "emergency" || phase === "dispatch" || phase === "responding") && (
                  <g>
                    {/* Tower Alpha -> Emergency Call */}
                    <line
                      x1="22%"
                      y1="28%"
                      x2="68%"
                      y2="38%"
                      stroke="#00E5FF"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      className="animate-pulse"
                    />
                    {/* Tower Bravo -> Emergency Call */}
                    <line
                      x1="76%"
                      y1="22%"
                      x2="68%"
                      y2="38%"
                      stroke="#8B5CF6"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      className="animate-pulse"
                    />
                  </g>
                )}

                {/* ── Dynamic AI Calculated Vector Route (Unit-042 -> Emergency) ── */}
                {(phase === "dispatch" || phase === "responding") && (
                  <g>
                    {/* Glowing Route Ribbon */}
                    <path
                      d={`M ${unit42Pos.x * 10} ${unit42Pos.y * 7} Q 480 320, 680 266`}
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="6,4"
                      style={{ filter: "drop-shadow(0 0 8px rgba(0, 229, 255, 0.8))" }}
                    />
                  </g>
                )}
              </svg>

              {/* ── SYSTEM 2: CELL TOWERS WITH EXPANDING CYAN SIGNAL WAVES ── */}
              {activeLayers.towers &&
                cellTowers.map((tower) => (
                  <div
                    key={tower.id}
                    onClick={() =>
                      setSelectedMarker({
                        id: tower.id,
                        name: tower.name,
                        code: tower.code,
                        type: "tower",
                        x: tower.x,
                        y: tower.y,
                        status: "OPTIMAL 5G VHF",
                        statusColor: "#00E5FF",
                        distance: tower.coverage,
                      })
                    }
                    style={{ left: `${tower.x}%`, top: `${tower.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                  >
                    {/* Expanding animated radio wave rings */}
                    <div className="absolute -inset-4 rounded-full border border-cyan-400/40 animate-ping opacity-60 pointer-events-none" />
                    <div className="absolute -inset-8 rounded-full border border-cyan-500/20 animate-pulse pointer-events-none" />

                    {/* Tower Icon Node */}
                    <div className="relative w-7 h-7 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-300 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.5)] group-hover:scale-110 transition-transform">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                    </div>

                    <span className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.2 rounded bg-[#020b22]/90 border border-cyan-500/40 text-[8px] font-mono font-bold text-cyan-300 pointer-events-none">
                      {tower.code}
                    </span>
                  </div>
                ))}

              {/* ── SYSTEM 3: EMERGENCY 911/SOS CALL (Red Expanding Alert Shockwaves) ── */}
              {activeLayers.calls && (phase === "emergency" || phase === "dispatch" || phase === "responding" || phase === "resolved") && (
                <div
                  onClick={() =>
                    setSelectedMarker({
                      id: emergencyCall.id,
                      name: emergencyCall.name,
                      code: emergencyCall.code,
                      type: "call",
                      x: emergencyCall.x,
                      y: emergencyCall.y,
                      status: emergencyCall.status,
                      statusColor: emergencyCall.statusColor,
                      eta: emergencyCall.eta,
                    })
                  }
                  style={{ left: `${emergencyCall.x}%`, top: `${emergencyCall.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                >
                  {/* Expanding Alert Pulse Rings */}
                  {phase !== "resolved" && (
                    <>
                      <div className="absolute -inset-6 rounded-full bg-red-600/35 animate-ping pointer-events-none" />
                      <div className="absolute -inset-10 rounded-full border-2 border-red-500/50 animate-pulse pointer-events-none" />
                    </>
                  )}

                  {/* Marker Node */}
                  <div
                    className={`relative w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                      phase === "resolved"
                        ? "bg-emerald-500 text-white shadow-[0_0_20px_#10b981]"
                        : "bg-red-600 text-white shadow-[0_0_25px_#ff304f] animate-bounce"
                    }`}
                  >
                    {phase === "resolved" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <PhoneCall className="w-4 h-4" />
                    )}
                  </div>

                  {/* Floating Tag */}
                  <div
                    className={`absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-[9px] font-mono font-black tracking-wider flex items-center gap-1 shadow-xl ${
                      phase === "resolved"
                        ? "bg-emerald-950 border border-emerald-400 text-emerald-300"
                        : "bg-red-950 border border-red-400 text-red-300"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    <span>{emergencyCall.code}</span>
                  </div>
                </div>
              )}

              {/* ── SYSTEM 1: POLICE UNIT-042 (Live Animated Intercept Cruiser) ── */}
              {activeLayers.police && (
                <div
                  onClick={() =>
                    setSelectedMarker({
                      id: "unit-42",
                      name: "Tactical Response Cruiser 42",
                      code: "UNIT-042",
                      type: "police",
                      x: unit42Pos.x,
                      y: unit42Pos.y,
                      status: phase === "responding" ? "EN ROUTE (HIGH PRIORITY)" : "PATROL READY",
                      statusColor: "#1687FF",
                      speed: phase === "responding" ? "78 km/h" : "42 km/h",
                      eta: phase === "responding" ? "00:42" : "STANDBY",
                    })
                  }
                  style={{ left: `${unit42Pos.x}%`, top: `${unit42Pos.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group transition-all duration-300"
                >
                  {/* Glowing Blue Beacon Halo */}
                  <div className="absolute -inset-3.5 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />

                  <div className="relative w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shadow-[0_0_18px_#1687ff] border border-white/60 group-hover:scale-125 transition-transform">
                    <Shield className="w-4 h-4" />
                  </div>

                  {/* Micro Info Label */}
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-[#020b22]/95 border border-blue-400 text-[8px] font-mono font-black text-white flex items-center gap-1 shadow-lg pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>UNIT-042</span>
                    <span className="text-cyan-300">
                      {phase === "responding" ? "[78 KM/H]" : "[ACTIVE]"}
                    </span>
                  </div>
                </div>
              )}

              {/* Aerial Recon UAV Drone */}
              <div
                style={{ left: `${dronePos.x}%`, top: `${dronePos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-400 text-cyan-300 flex items-center justify-center shadow-[0_0_12px_#00e5ff]">
                  <Navigation className="w-3 h-3 animate-spin" style={{ animationDuration: "6s" }} />
                </div>
                <span className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-mono font-bold text-cyan-300">
                  UAV-01 OVERWATCH
                </span>
              </div>

              {/* ── SYSTEM 5: TRACKED SUSPECT VEHICLE (With Glowing Motion Trail) ── */}
              {activeLayers.vehicles && (
                <div
                  style={{ left: `${targetVehPos.x}%`, top: `${targetVehPos.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-25 cursor-pointer group transition-all duration-200"
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-950/90 border border-amber-400 text-amber-300 flex items-center justify-center shadow-[0_0_12px_rgba(255,176,32,0.6)]">
                    <Car className="w-3.5 h-3.5" />
                  </div>
                  <span className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.2 rounded bg-[#020b22]/90 border border-amber-500/40 text-[7px] font-mono font-bold text-amber-300 pointer-events-none">
                    TARGET-SEDAN (64 km/h)
                  </span>
                </div>
              )}

              {/* ── SYSTEM 6: PERSONNEL HOLOGRAPHIC MARKER ── */}
              {activeLayers.personnel && (
                <div
                  style={{ left: "54%", top: "62%" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-950/90 border border-purple-400 text-purple-300 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.6)]">
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-mono font-bold text-purple-300">
                    OFFICER VIKRAM (DELTA-4)
                  </span>
                </div>
              )}

              {/* ── SYSTEM 7: GEOFENCE ZONE ALERT BADGE ── */}
              <div
                style={{ left: "64%", top: "25%" }}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-[8px] font-mono font-black text-red-300 uppercase tracking-wider pointer-events-none z-15 backdrop-blur-sm"
              >
                RESTRICTED SECTOR 4 CORDON
              </div>

            </div>
          </motion.div>

          {/* ── FLOATING HOLOGRAPHIC INSPECTION POPUP ── */}
          <AnimatePresence>
            {selectedMarker && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="absolute bottom-6 right-6 z-50 w-72 rounded-2xl bg-[#020a22]/95 border border-cyan-400/50 p-4 shadow-[0_0_40px_rgba(0,229,255,0.3)] backdrop-blur-2xl text-slate-100 flex flex-col gap-2.5 font-mono"
              >
                <div className="flex items-start justify-between border-b border-white/10 pb-2">
                  <div>
                    <span className="text-[8px] font-black text-cyan-400 uppercase tracking-wider">
                      ENTITY TELEMETRY LOCKED
                    </span>
                    <h4 className="text-xs font-black text-white">{selectedMarker.name}</h4>
                    <p className="text-[9px] text-slate-400">{selectedMarker.code}</p>
                  </div>
                  <button
                    onClick={() => setSelectedMarker(null)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between text-[9px] bg-cyan-950/40 p-2 rounded-xl border border-cyan-500/20">
                  <span className="text-slate-400">STATUS:</span>
                  <span className="font-bold text-cyan-300">{selectedMarker.status}</span>
                </div>

                {selectedMarker.speed && (
                  <div className="flex justify-between text-[9px] text-slate-300">
                    <span className="text-slate-400">SPEED:</span>
                    <span className="font-bold">{selectedMarker.speed}</span>
                  </div>
                )}
                {selectedMarker.eta && (
                  <div className="flex justify-between text-[9px] text-slate-300">
                    <span className="text-slate-400">ESTIMATED ETA:</span>
                    <span className="font-bold text-amber-300">{selectedMarker.eta}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedMarker(null);
                  }}
                  className="w-full py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer mt-1"
                >
                  DISPATCH INTERCEPT
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* ── BOTTOM FLOATING METRICS HUD BAR ── */}
        <div className="relative z-40 px-5 py-3 border-t border-cyan-500/20 bg-[#02091e]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 font-mono text-[10px]">
          
          {/* Live Platform Data Metrics */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">ACTIVE UNITS:</span>
              <strong className="text-white font-extrabold">24</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">LIVE INCIDENTS:</span>
              <strong className="text-amber-400 font-extrabold">07</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">CELL TOWERS:</span>
              <strong className="text-cyan-300 font-extrabold">18</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">AVG RESPONSE:</span>
              <strong className="text-emerald-400 font-extrabold">02:41</strong>
            </div>
          </div>

          {/* System Online Status */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-bold tracking-wider">SYSTEM STATUS: ONLINE</span>
          </div>

        </div>

      </div>
    </div>
  );
}
