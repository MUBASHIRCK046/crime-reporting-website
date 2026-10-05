"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Radio,
  AlertTriangle,
  Flame,
  PhoneCall,
  Car,
  Users,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Crosshair,
  MapPin,
  Activity,
  Zap,
  Target,
  Sliders,
  Send,
  Lock,
  Wifi,
  Eye,
  CheckCircle2,
  AlertOctagon,
  Radar as RadarIcon,
  Navigation,
  Globe,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Terminal,
  Cpu
} from "lucide-react";
import { toast } from "sonner";

// ==============================================================================
// TYPES & DATA STRUCTURES
// ==============================================================================

export type SystemType =
  | "police"
  | "towers"
  | "calls"
  | "incidents"
  | "vehicles"
  | "personnel"
  | "zones";

export type DisplayMode = "tactical" | "thermal" | "night" | "vector";

export interface TacticalEntity {
  id: string;
  system: SystemType;
  name: string;
  code: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  status: string;
  statusType: "active" | "warning" | "critical" | "neutral";
  details: Record<string, string | number>;
  heading?: number;
  speed?: number;
  assignedTo?: string;
  signalStrength?: number;
  audioSnippet?: string;
  history?: Array<{ x: number; y: number }>;
}

export interface GeofenceZone {
  id: string;
  name: string;
  type: "restricted" | "caution" | "safe";
  points: string; // SVG polygon points
  labelX: number;
  labelY: number;
  activeBreach: boolean;
  breachMessage?: string;
}

// ==============================================================================
// WEB AUDIO SOUND SYNTHESIZER (No external audio files needed)
// ==============================================================================
class TacticalSoundFX {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Lazy init on first user interaction
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public toggleSound(state?: boolean) {
    this.enabled = state !== undefined ? state : !this.enabled;
    return this.enabled;
  }

  public isSoundEnabled() {
    return this.enabled;
  }

  public playRadarPing() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {}
  }

  public playSelectChirp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  public playAlertAlarm() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(650, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(950, this.ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(650, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch {}
  }
}

const sfx = new TacticalSoundFX();

// ==============================================================================
// MAIN COMPONENT: FUTURISTIC POLICE TRACKING COMMAND CENTER
// ==============================================================================
export function FuturisticCommandCenter() {
  // ── States ─────────────────────────────────────────────────────────────────
  const [selectedEntity, setSelectedEntity] = useState<TacticalEntity | null>(null);
  const [selectedZone, setSelectedZone] = useState<GeofenceZone | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("tactical");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [activeBreachAlert, setActiveBreachAlert] = useState<string | null>(null);
  const [radarDegrees, setRadarDegrees] = useState(0);
  const [clockZulu, setClockZulu] = useState("");
  const [clockLocal, setClockLocal] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Active layers filter
  const [activeLayers, setActiveLayers] = useState<Record<SystemType, boolean>>({
    police: true,
    towers: true,
    calls: true,
    incidents: true,
    vehicles: true,
    personnel: true,
    zones: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Initial Mock Data for the 7 Systems ─────────────────────────────────────

  // 1. Police Units
  const [policeUnits, setPoliceUnits] = useState<TacticalEntity[]>([
    {
      id: "unit-p1",
      system: "police",
      name: "Interceptor Alpha-01",
      code: "PATROL-01",
      x: 28,
      y: 35,
      heading: 45,
      speed: 54,
      status: "INTERCEPT ROUTE",
      statusType: "active",
      details: {
        Vehicle: "Toyota Hilux Tactical",
        Officers: "Sgt. Nair & Const. Joy",
        Callsign: "EAGLE-1",
        ETA: "1m 40s",
        Sector: "Mukkom Center",
        Fuel: "84%",
        Bodycam: "LIVE HD STREAM",
      },
    },
    {
      id: "unit-p2",
      system: "police",
      name: "Quick Response SWAT 4B",
      code: "TAC-SWAT-4B",
      x: 68,
      y: 62,
      heading: 310,
      speed: 38,
      status: "RESPONDING CODE 3",
      statusType: "critical",
      details: {
        Vehicle: "Armored Rapid Transit",
        Officers: "Insp. Sharma (Squad 4)",
        Callsign: "THUNDER-4",
        Weapons: "Level IV Tactical Armor",
        ETA: "45 seconds",
        Sector: "Bypass Junction",
        Frequency: "154.850 MHz",
      },
    },
    {
      id: "unit-p3",
      system: "police",
      name: "Reconnaissance Drone UAV-2",
      code: "AIR-DRONE-02",
      x: 52,
      y: 28,
      heading: 180,
      speed: 72,
      status: "AIR PATROL OVERWATCH",
      statusType: "active",
      details: {
        Altitude: "120 meters AGL",
        Thermal: "OPTICS LOCKED",
        Battery: "68% (32m remaining)",
        Sensors: "LiDAR + 4K Night IR",
        Telemetry: "Telemetry 5.8 GHz Stable",
      },
    },
    {
      id: "unit-p4",
      system: "police",
      name: "K-9 Tracker Unit 7",
      code: "K9-DELTA",
      x: 44,
      y: 78,
      heading: 120,
      speed: 15,
      status: "GROUND SEARCH PATROL",
      statusType: "active",
      details: {
        Officer: "Officer Anoop & K9 Bruno",
        Specialty: "Scent Tracing / Narcotics",
        Sector: "Riverbank Corridor",
        GPS: "Sub-meter Precision",
      },
    },
  ]);

  // 2. Cell Towers
  const [cellTowers] = useState<TacticalEntity[]>([
    {
      id: "tower-t1",
      system: "towers",
      name: "Tower Alpha (Mukkom Central)",
      code: "TWR-MUK-01",
      x: 22,
      y: 22,
      status: "OPTIMAL 5G/VHF",
      statusType: "active",
      signalStrength: 98,
      details: {
        Band: "B78 (3500MHz) / VHF Relay",
        ConnectedDevices: 1482,
        TriangulationAccuracy: "± 4.2 meters",
        BackupPower: "100% Online",
        Azimuth: "360° Omni Array",
      },
    },
    {
      id: "tower-t2",
      system: "towers",
      name: "Tower Bravo (North Hills)",
      code: "TWR-NHL-02",
      x: 75,
      y: 18,
      status: "HIGH SIGNAL ACTIVE",
      statusType: "active",
      signalStrength: 94,
      details: {
        Band: "B3 (1800MHz) / UHF Repeater",
        ConnectedDevices: 894,
        TriangulationAccuracy: "± 6.0 meters",
        RelayLatency: "1.8 ms",
      },
    },
    {
      id: "tower-t3",
      system: "towers",
      name: "Tower Charlie (River Sector)",
      code: "TWR-RIV-03",
      x: 35,
      y: 80,
      status: "ACTIVE TELEMETRY",
      statusType: "active",
      signalStrength: 89,
      details: {
        Band: "Emergency Tetra Grid 380MHz",
        ConnectedDevices: 620,
        TriangulationAccuracy: "± 5.1 meters",
        Status: "Encrypted Police Mesh",
      },
    },
    {
      id: "tower-t4",
      system: "towers",
      name: "Tower Delta (East Highway Hub)",
      code: "TWR-HWY-04",
      x: 82,
      y: 75,
      status: "HIGH THROUGHPUT",
      statusType: "active",
      signalStrength: 96,
      details: {
        Band: "Dual 5G Ultra-Wideband",
        ConnectedDevices: 2104,
        TriangulationAccuracy: "± 3.8 meters",
        CoverageRadius: "4.5 km",
      },
    },
  ]);

  // 3. Emergency Calls (911 / Citizen SOS)
  const [emergencyCalls, setEmergencyCalls] = useState<TacticalEntity[]>([
    {
      id: "call-c1",
      system: "calls",
      name: "CRITICAL SOS: Robbery In Progress",
      code: "SOS-CALL #9081",
      x: 64,
      y: 42,
      status: "PRIORITY 1 - DISTRESS",
      statusType: "critical",
      audioSnippet: '"Multiple suspects entered retail vault... armed, alarm triggered!"',
      details: {
        Caller: "Citizen Portal User (Aswani)",
        Origin: "Commercial Plaza Sector 3",
        LoggedTime: "00:01:14 ago",
        GPSConfidence: "99.4%",
        TriangulatedBy: "TWR-MUK-01 & TWR-NHL-02",
        AudioChannel: "OPEN DISPATCH CHANNEL 1",
      },
    },
    {
      id: "call-c2",
      system: "calls",
      name: "Highway Hit & Run Collision",
      code: "911-CALL #4412",
      x: 78,
      y: 68,
      status: "PRIORITY 2 - HIGH",
      statusType: "warning",
      audioSnippet: '"Black sedan sped off towards bypass after hitting motorcycle..."',
      details: {
        Caller: "Anonymous Citizen Log",
        Origin: "East Arterial Highway Km 14",
        LoggedTime: "00:04:30 ago",
        AssignedUnits: "TAC-SWAT-4B en route",
      },
    },
    {
      id: "call-c3",
      system: "calls",
      name: "Silent Alarm: ATM Vault Breach",
      code: "ALARM-CALL #1109",
      x: 18,
      y: 52,
      status: "AUTOMATED ALARM",
      statusType: "critical",
      details: {
        Facility: "National Bank ATM Terminal 4",
        SensorType: "Seismic Vibration & Door Tamper",
        LoggedTime: "00:00:45 ago",
        CameraFeed: "OPTICAL TRIGGERED",
      },
    },
  ]);

  // 4. Incidents Tracking
  const [incidents] = useState<TacticalEntity[]>([
    {
      id: "inc-i1",
      system: "incidents",
      name: "Armed Commercial Burglary",
      code: "INCIDENT #CR-904",
      x: 66,
      y: 38,
      status: "ACTIVE INVESTIGATION",
      statusType: "critical",
      assignedTo: "TAC-SWAT-4B & PATROL-01",
      details: {
        Classification: "IPC Section 392 (Robbery)",
        Severity: "CRITICAL ALPHA",
        PerimeterStatus: "CONTAINMENT RING DEPLOYED",
        EvidenceFiles: "2 CCTV Feeds Captured",
        Casualties: "0 Reported",
        CommandLead: "DySP Rural Division",
      },
    },
    {
      id: "inc-i2",
      system: "incidents",
      name: "Suspect Vehicle Sighting",
      code: "INCIDENT #CR-882",
      x: 48,
      y: 58,
      status: "PURSUIT VECTOR",
      statusType: "warning",
      details: {
        Classification: "Vehicle Intercept / Tracing",
        TargetLicense: "KL-11-CH-4821",
        Direction: "Heading South towards River Corridor",
        SpeedEstimate: "85 km/h",
      },
    },
    {
      id: "inc-i3",
      system: "incidents",
      name: "Perimeter Check / VIP Transit",
      code: "INCIDENT #CR-771",
      x: 32,
      y: 72,
      status: "MONITORED PASSAGE",
      statusType: "neutral",
      details: {
        Classification: "Security Escort Route",
        Status: "CLEAR & SECURED",
        NextCheck: "00:15:00",
      },
    },
  ]);

  // 5. Tracked Vehicles (with live speed, heading, and motion trails)
  const [vehicles, setVehicles] = useState<TacticalEntity[]>([
    {
      id: "veh-v1",
      system: "vehicles",
      name: "Suspect Sedan [KL-11-CH-4821]",
      code: "TARGET-SEDAN-01",
      x: 50,
      y: 55,
      heading: 135,
      speed: 84,
      status: "SUSPICIOUS HIGH SPEED",
      statusType: "critical",
      history: [
        { x: 42, y: 48 },
        { x: 45, y: 50 },
        { x: 48, y: 53 },
        { x: 50, y: 55 },
      ],
      details: {
        MakeModel: "Dark Grey Honda City 2022",
        RegisteredOwner: "Flagged in National Registry",
        Infractions: "Speed limit +28 km/h, Evasion Alert",
        LastSensorHit: "ANPR Highway Cam #08",
        Speed: "84 km/h (Accelerating)",
      },
    },
    {
      id: "veh-v2",
      system: "vehicles",
      name: "Rapid Response Ambulance",
      code: "MEDIC-108",
      x: 72,
      y: 30,
      heading: 260,
      speed: 62,
      status: "EMERGENCY TRANSIT",
      statusType: "active",
      history: [
        { x: 80, y: 26 },
        { x: 76, y: 28 },
        { x: 72, y: 30 },
      ],
      details: {
        Vehicle: "Force Traveler ICU Mobile",
        Destination: "MIMS Emergency Hospital",
        SirenBeacon: "ACTIVE ON ROUTE",
        PatientStatus: "STABLE",
      },
    },
    {
      id: "veh-v3",
      system: "vehicles",
      name: "Cash Transit Security Van",
      code: "LOGISTICS-VAN-09",
      x: 25,
      y: 65,
      heading: 80,
      speed: 35,
      status: "PROTECTED CORRIDOR",
      statusType: "neutral",
      history: [
        { x: 18, y: 62 },
        { x: 22, y: 64 },
        { x: 25, y: 65 },
      ],
      details: {
        SecurityEscort: "Armed Guard Dual Check",
        GeoLock: "TRANSMISSION LOCKED",
        RouteCompliance: "100% ON SCHEDULE",
      },
    },
  ]);

  // 6. Personnel Tracking
  const [personnel] = useState<TacticalEntity[]>([
    {
      id: "pers-m1",
      system: "personnel",
      name: "SI Vikramaditya (Team Lead)",
      code: "OFFICER-VK-01",
      x: 62,
      y: 40,
      status: "ON-SCENE COMMAND",
      statusType: "active",
      details: {
        Rank: "Sub-Inspector of Police",
        AssignedTeam: "Alpha Tactical Command",
        HeartRate: "88 BPM (Normal)",
        BodyArmor: "Level III Kevlar + Cam",
        DistanceToTarget: "42 meters",
        RadioChannel: "TAC-VHF-1",
      },
    },
    {
      id: "pers-m2",
      system: "personnel",
      name: "Forensics Specialist Anjali",
      code: "FORENSIC-AJ-04",
      x: 67,
      y: 36,
      status: "EVIDENCE COLLECTION",
      statusType: "active",
      details: {
        Unit: "Digital Crime Lab Mobile Unit",
        Activity: "Fingerprint & CCTV Archiving",
        HeartRate: "74 BPM",
        Telemetry: "Secured Bio-link Active",
      },
    },
    {
      id: "pers-m3",
      system: "personnel",
      name: "Constable Rahul (Perimeter)",
      code: "GUARD-RH-09",
      x: 58,
      y: 45,
      status: "CORDON POSITION",
      statusType: "active",
      details: {
        Role: "Outer Perimeter Containment",
        HeartRate: "82 BPM",
        CrowdControl: "SECTOR CLEAR",
      },
    },
  ]);

  // 7. Perimeter & Zone Monitoring (Geofenced dynamic areas)
  const [geofences, setGeofences] = useState<GeofenceZone[]>([
    {
      id: "zone-red",
      name: "RESTRICTED SECURITY ZONE (Sector 4)",
      type: "restricted",
      points: "55,30 76,30 78,52 54,54",
      labelX: 65,
      labelY: 33,
      activeBreach: true,
      breachMessage: "UNAUTHORIZED TARGET SEDAN-01 ENTERING CORDON",
    },
    {
      id: "zone-amber",
      name: "SURVEILLANCE & HIGH-CAUTION CORRIDOR",
      type: "caution",
      points: "40,50 60,48 58,70 38,72",
      labelX: 48,
      labelY: 60,
      activeBreach: false,
    },
    {
      id: "zone-safe",
      name: "HOSPITAL EMERGENCY GREEN PASSAGE",
      type: "safe",
      points: "15,20 40,20 42,42 14,40",
      labelX: 26,
      labelY: 28,
      activeBreach: false,
    },
  ]);

  // ── Live Animation Loop: Moving Police Units, Vehicles, Radar & Breaches ──
  useEffect(() => {
    const animationInterval = setInterval(() => {
      // 1. Rotate radar scanner
      setRadarDegrees((prev) => (prev + 3) % 360);

      // 2. Animate police vehicles on realistic patrol drift
      setPoliceUnits((prevUnits) =>
        prevUnits.map((unit) => {
          if (unit.id === "unit-p1") {
            const nextX = unit.x >= 75 ? 20 : unit.x + 0.35;
            const nextY = unit.y >= 70 ? 25 : unit.y + 0.25;
            return { ...unit, x: nextX, y: nextY };
          }
          if (unit.id === "unit-p2") {
            const nextX = unit.x <= 25 ? 75 : unit.x - 0.4;
            const nextY = unit.y <= 30 ? 68 : unit.y - 0.2;
            return { ...unit, x: nextX, y: nextY };
          }
          if (unit.id === "unit-p3") {
            // Drone orbits smoothly
            const angle = (Date.now() / 3000) % (Math.PI * 2);
            return {
              ...unit,
              x: 52 + Math.cos(angle) * 14,
              y: 38 + Math.sin(angle) * 14,
            };
          }
          return unit;
        })
      );

      // 3. Animate tracked vehicles with glowing motion trails
      setVehicles((prevVehicles) =>
        prevVehicles.map((veh) => {
          if (veh.id === "veh-v1") {
            const nextX = veh.x >= 80 ? 30 : veh.x + 0.5;
            const nextY = veh.y >= 75 ? 35 : veh.y + 0.3;
            const newHistory = [...(veh.history || []), { x: nextX, y: nextY }].slice(-6);

            // Check if vehicle crosses the red zone boundary (between X: 55-78, Y: 30-54)
            const isInRedZone = nextX >= 55 && nextX <= 78 && nextY >= 30 && nextY <= 54;
            if (isInRedZone && !activeBreachAlert) {
              setActiveBreachAlert("CRITICAL GEOFENCE BREACH: TARGET-SEDAN-01 INSIDE RESTRICTED SECTOR 4");
              sfx.playAlertAlarm();
            }

            return {
              ...veh,
              x: nextX,
              y: nextY,
              history: newHistory,
            };
          }
          if (veh.id === "veh-v2") {
            const nextX = veh.x <= 20 ? 82 : veh.x - 0.45;
            const nextY = veh.y >= 70 ? 22 : veh.y + 0.2;
            const newHistory = [...(veh.history || []), { x: nextX, y: nextY }].slice(-5);
            return { ...veh, x: nextX, y: nextY, history: newHistory };
          }
          return veh;
        })
      );
    }, 120);

    return () => clearInterval(animationInterval);
  }, [activeBreachAlert]);

  // ── Clock HUD update ────────────────────────────────────────────────────────
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockZulu(
        now.toISOString().slice(11, 19) +
          " ZULU (" +
          now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase() +
          ")"
      );
      setClockLocal(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Periodic Sound Ping on Radar rotation ──────────────────────────────────
  useEffect(() => {
    if (radarDegrees % 180 === 0 && soundEnabled) {
      sfx.playRadarPing();
    }
  }, [radarDegrees, soundEnabled]);

  // ── Toggle Single System Layer ─────────────────────────────────────────────
  const toggleLayer = (layer: SystemType) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
    sfx.playSelectChirp();
    toast.info(`Layer toggled: ${layer.toUpperCase()}`);
  };

  // ── Toggle All Layers ──────────────────────────────────────────────────────
  const toggleAllLayers = (enable: boolean) => {
    setActiveLayers({
      police: enable,
      towers: enable,
      calls: enable,
      incidents: enable,
      vehicles: enable,
      personnel: enable,
      zones: enable,
    });
    sfx.playSelectChirp();
  };

  // ── Select and Inspect Entity with Smooth Camera Zoom ──────────────────────
  const handleSelectEntity = (entity: TacticalEntity) => {
    setSelectedEntity(entity);
    setSelectedZone(null);
    sfx.playSelectChirp();

    // Smoothly pan camera towards entity position
    setZoomLevel(1.5);
    setPanOffset({
      x: (50 - entity.x) * 3.5,
      y: (50 - entity.y) * 3.5,
    });
    toast.success(`Tracking locked onto ${entity.code}: ${entity.name}`);
  };

  // ── Select Geofence Zone ───────────────────────────────────────────────────
  const handleSelectZone = (zone: GeofenceZone) => {
    setSelectedZone(zone);
    setSelectedEntity(null);
    sfx.playSelectChirp();
    setZoomLevel(1.3);
    setPanOffset({
      x: (50 - zone.labelX) * 2.5,
      y: (50 - zone.labelY) * 2.5,
    });
  };

  // ── Reset Camera to Global Overview ────────────────────────────────────────
  const resetCamera = () => {
    setSelectedEntity(null);
    setSelectedZone(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    sfx.playSelectChirp();
    toast.info("Tactical camera reset to Global Sector Overview");
  };

  // ── Dispatch Action Simulation ─────────────────────────────────────────────
  const handleDispatchAction = (actionName: string) => {
    setActionInProgress(actionName);
    sfx.playAlertAlarm();
    setTimeout(() => {
      setActionInProgress(null);
      toast.success(`Action Executed: ${actionName} on ${selectedEntity?.code || "TARGET"}`);
    }, 1400);
  };

  // ── Calculate dynamic Triangulation Lines from Towers to Active Calls ───────
  const triangulationRays = useMemo(() => {
    const rays: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; id: string }> = [];
    if (!activeLayers.towers || !activeLayers.calls) return rays;

    const criticalCall = emergencyCalls[0]; // SOS call #9081
    if (criticalCall) {
      // Connect to Tower Alpha & Tower Bravo
      const t1 = cellTowers[0];
      const t2 = cellTowers[1];
      if (t1) {
        rays.push({
          id: "ray-1",
          x1: t1.x,
          y1: t1.y,
          x2: criticalCall.x,
          y2: criticalCall.y,
          color: "#00f0ff",
        });
      }
      if (t2) {
        rays.push({
          id: "ray-2",
          x1: t2.x,
          y1: t2.y,
          x2: criticalCall.x,
          y2: criticalCall.y,
          color: "#a855f7",
        });
      }
    }
    return rays;
  }, [activeLayers.towers, activeLayers.calls, cellTowers, emergencyCalls]);

  // ── All active counts ──────────────────────────────────────────────────────
  const totalTrackedEntities =
    policeUnits.length +
    cellTowers.length +
    emergencyCalls.length +
    incidents.length +
    vehicles.length +
    personnel.length;

  return (
    <div
      ref={containerRef}
      className={`w-full relative select-none font-mono text-slate-100 transition-all duration-500 rounded-3xl overflow-hidden border border-cyan-500/30 shadow-[0_0_60px_rgba(0,240,255,0.15)] ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none bg-[#020817]"
          : "bg-gradient-to-b from-[#020b1e] via-[#030d24] to-[#010614] min-h-[780px]"
      } ${
        displayMode === "thermal"
          ? "hue-rotate-90 saturate-200"
          : displayMode === "night"
          ? "brightness-95 contrast-125 sepia-[0.3] hue-rotate-[90deg]"
          : displayMode === "vector"
          ? "contrast-150"
          : ""
      }`}
    >
      {/* ── CRT Scanline & Grain Aesthetic Overlay ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-40" />
      <div className="absolute inset-0 pointer-events-none z-30 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,8,23,0.85)_100%)]" />

      {/* ── TOP HOLOGRAPHIC COMMAND HUD HEADER ──────────────────────────────── */}
      <header className="relative z-40 px-6 py-4 border-b border-cyan-500/20 bg-[#020c22]/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Brand / Sector Title & Status */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <RadarIcon className="w-6 h-6 text-cyan-400 animate-spin" style={{ animationDuration: "14s" }} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-black tracking-widest text-cyan-300 uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]">
                Kozhikode Rural Command • Sector 4
              </h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                SYS: 99.98% ONLINE
              </span>
            </div>
            <p className="text-[10px] text-cyan-500/70 font-semibold tracking-wider flex items-center gap-2 mt-0.5">
              <span>LAT: 11.2588° N</span>
              <span>•</span>
              <span>LNG: 75.7804° E</span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">RADAR SWEEP: ACTIVE 360°</span>
            </p>
          </div>
        </div>

        {/* Center: Real-time Zulu & Local Clock */}
        <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-[11px]">
          <div className="flex items-center gap-2 text-cyan-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400">ZULU:</span>
            <span className="font-bold tracking-wider">{clockZulu || "00:00:00 ZULU"}</span>
          </div>
          <span className="text-cyan-500/40">|</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">LOCAL:</span>
            <span className="font-extrabold text-white tracking-widest">{clockLocal || "00:00:00"}</span>
          </div>
          <span className="text-cyan-500/40">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-400 font-black tracking-wide">DEFCON 2 ELEVATED</span>
          </div>
        </div>

        {/* Right: Mode Switchers & Sound / Fullscreen Controls */}
        <div className="flex items-center gap-2">
          {/* Display Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-cyan-950/40 border border-cyan-500/25 text-[10px]">
            {(["tactical", "thermal", "night", "vector"] as DisplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setDisplayMode(mode);
                  sfx.playSelectChirp();
                }}
                className={`px-2.5 py-1 rounded-lg uppercase font-bold transition-all cursor-pointer ${
                  displayMode === mode
                    ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(0,240,255,0.6)]"
                    : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const nextState = sfx.toggleSound();
              setSoundEnabled(nextState);
              if (nextState) sfx.playSelectChirp();
            }}
            title={soundEnabled ? "Mute Radar Audio" : "Enable Radar Audio Ping FX"}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Expand Fullscreen Command View"}
            className="p-2 rounded-xl bg-slate-900/60 border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── ACTIVE GEOFENCE BREACH WARNING BANNER ──────────────────────────── */}
      <AnimatePresence>
        {activeBreachAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-40 w-full bg-gradient-to-r from-red-950/90 via-red-900/90 to-red-950/90 border-y border-red-500 px-6 py-2 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.5)] backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <span className="p-1 rounded-lg bg-red-500/30 border border-red-400 animate-pulse">
                <AlertOctagon className="w-5 h-5 text-red-400" />
              </span>
              <div>
                <span className="text-[10px] font-black text-red-300 tracking-widest uppercase">
                  SECURITY PERIMETER ALERT TRIGGERED
                </span>
                <p className="text-xs font-bold text-white tracking-wide">{activeBreachAlert}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const targetVeh = vehicles[0];
                  if (targetVeh) handleSelectEntity(targetVeh);
                }}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-black tracking-wider uppercase transition-all shadow-md cursor-pointer"
              >
                INTERCEPT TARGET
              </button>
              <button
                onClick={() => setActiveBreachAlert(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CENTRAL TACTICAL VISUALIZATION ARENA ───────────────────────── */}
      <div className="relative w-full h-[640px] md:h-[700px] overflow-hidden">
        
        {/* Animated Perspective Tactical Map Canvas */}
        <motion.div
          animate={{
            scale: zoomLevel,
            x: panOffset.x,
            y: panOffset.y,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="absolute inset-0 w-full h-full origin-center"
        >
          {/* 1. Background Grid & Coordinates Vector Map */}
          <div className="absolute inset-0 bg-[#020b1e]">
            
            {/* Holographic Concentric Radar Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[560px] h-[560px] rounded-full border border-cyan-500/15 flex items-center justify-center">
                <div className="absolute inset-16 rounded-full border border-cyan-500/15" />
                <div className="absolute inset-32 rounded-full border border-cyan-500/20" />
                <div className="absolute inset-48 rounded-full border border-dashed border-cyan-400/25 animate-[spin_60s_linear_infinite]" />
                <div className="absolute inset-64 rounded-full border border-cyan-500/30" />
                <div className="absolute inset-[320px] rounded-full border border-cyan-400/40" />

                {/* Concentric Distance Markings */}
                <span className="absolute top-3 text-[9px] font-bold text-cyan-400/50">RANGE: 5.0 KM</span>
                <span className="absolute top-18 text-[9px] font-bold text-cyan-400/50">RANGE: 3.5 KM</span>
                <span className="absolute top-34 text-[9px] font-bold text-cyan-400/50">RANGE: 2.0 KM</span>
                <span className="absolute top-50 text-[9px] font-bold text-cyan-400/60">RANGE: 1.0 KM</span>

                {/* Angular Degree Crosshairs */}
                <div className="absolute w-full h-[1px] bg-cyan-500/20" />
                <div className="absolute h-full w-[1px] bg-cyan-500/20" />
                <div className="absolute w-full h-[1px] bg-cyan-500/15 rotate-45" />
                <div className="absolute w-full h-[1px] bg-cyan-500/15 -rotate-45" />

                {/* Cardinal Points */}
                <span className="absolute top-1 font-black text-[11px] text-cyan-300 tracking-widest">N 000°</span>
                <span className="absolute bottom-1 font-black text-[11px] text-cyan-300 tracking-widest">S 180°</span>
                <span className="absolute right-1 font-black text-[11px] text-cyan-300 tracking-widest">E 090°</span>
                <span className="absolute left-1 font-black text-[11px] text-cyan-300 tracking-widest">W 270°</span>
              </div>
            </div>

            {/* Micro Dot Matrix Grid */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00f0ff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

            {/* Mock Topographic Elevation Contours */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <path
                d="M 50 120 C 150 40, 350 200, 550 90 S 800 240, 1000 110"
                fill="none"
                stroke="#00f0ff"
                strokeWidth="1.5"
                strokeDasharray="6,4"
              />
              <path
                d="M 80 260 C 220 180, 420 380, 680 200 S 920 340, 1150 220"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
              />
              <path
                d="M 120 480 C 300 360, 520 540, 780 400 S 980 500, 1200 420"
                fill="none"
                stroke="#818cf8"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            </svg>

            {/* 360° Rotating Radar Sweep Line with Gradient Fan */}
            <div
              style={{ transform: `rotate(${radarDegrees}deg)` }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none origin-center"
            >
              <div className="relative w-[600px] h-[600px] rounded-full">
                {/* Sweep phosphor trail */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg at 50% 50%, rgba(0, 240, 255, 0.25) 0deg, rgba(0, 240, 255, 0.05) 45deg, transparent 90deg)",
                  }}
                />
                {/* Leading sharp neon beam */}
                <div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent shadow-[0_0_12px_#00f0ff] origin-left" />
              </div>
            </div>

            {/* SVG OVERLAY: Geofence Polygons, Triangulation Rays, and Motion Trails */}
            <svg className="absolute inset-0 w-full h-full z-10 overflow-visible pointer-events-none">
              <defs>
                <linearGradient id="cyanRay" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.1" />
                </linearGradient>
                <pattern id="redHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.4" />
                </pattern>
                <pattern id="amberHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.3" />
                </pattern>
              </defs>

              {/* ── SYSTEM 7: Perimeter & Geofence Zones ── */}
              {activeLayers.zones &&
                geofences.map((zone) => {
                  const isRed = zone.type === "restricted";
                  const isAmber = zone.type === "caution";
                  const strokeColor = isRed ? "#ef4444" : isAmber ? "#f59e0b" : "#38bdf8";
                  const fillPattern = isRed ? "url(#redHatch)" : isAmber ? "url(#amberHatch)" : "rgba(56, 189, 248, 0.08)";

                  return (
                    <g key={zone.id} className="pointer-events-auto cursor-pointer" onClick={() => handleSelectZone(zone)}>
                      <polygon
                        points={zone.points
                          .split(" ")
                          .map((pair) => {
                            const [px, py] = pair.split(",").map(Number);
                            return `${px}%,${py}%`;
                          })
                          .join(" ")}
                        fill={fillPattern}
                        stroke={strokeColor}
                        strokeWidth={zone.activeBreach ? "2.5" : "1.5"}
                        strokeDasharray={isRed ? "6,4" : "4,2"}
                        className={zone.activeBreach ? "animate-pulse" : ""}
                        style={{
                          filter: isRed
                            ? "drop-shadow(0 0 8px rgba(239,68,68,0.5))"
                            : "drop-shadow(0 0 6px rgba(245,158,11,0.3))",
                        }}
                      />
                    </g>
                  );
                })}

              {/* ── SYSTEM 2: Cell Tower Triangulation Rays ── */}
              {triangulationRays.map((ray) => (
                <g key={ray.id}>
                  <line
                    x1={`${ray.x1}%`}
                    y1={`${ray.y1}%`}
                    x2={`${ray.x2}%`}
                    y2={`${ray.y2}%`}
                    stroke={ray.color}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    className="animate-pulse"
                    style={{ filter: `drop-shadow(0 0 6px ${ray.color})` }}
                  />
                  {/* Moving photon pulses along triangulation line */}
                  <circle r="3" fill="#ffffff">
                    <animateMotion
                      path={`M ${ray.x1 * 10},${ray.y1 * 10} L ${ray.x2 * 10},${ray.y2 * 10}`}
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}

              {/* ── SYSTEM 5: Vehicle Glowing Motion Trails ── */}
              {activeLayers.vehicles &&
                vehicles.map((veh) => {
                  if (!veh.history || veh.history.length < 2) return null;
                  const pathData = veh.history.reduce(
                    (acc, point, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${point.x}% ${point.y}%`,
                    ""
                  );
                  const isSuspect = veh.statusType === "critical";
                  return (
                    <path
                      key={`trail-${veh.id}`}
                      d={pathData}
                      fill="none"
                      stroke={isSuspect ? "#ef4444" : "#00f0ff"}
                      strokeWidth="2.5"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                      strokeDasharray="4,2"
                      style={{
                        filter: isSuspect
                          ? "drop-shadow(0 0 8px rgba(239,68,68,0.8))"
                          : "drop-shadow(0 0 6px rgba(0,240,255,0.6))",
                      }}
                    />
                  );
                })}
            </svg>

            {/* ── INTERACTIVE ENTITY MARKERS ──────────────────────────────── */}

            {/* SYSTEM 2: Cell Towers & Expanding Signal Waves */}
            {activeLayers.towers &&
              cellTowers.map((tower) => {
                const isSelected = selectedEntity?.id === tower.id;
                return (
                  <div
                    key={tower.id}
                    onClick={() => handleSelectEntity(tower)}
                    style={{ left: `${tower.x}%`, top: `${tower.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                  >
                    {/* Expanding animated radio waves */}
                    <div className="absolute -inset-6 rounded-full border border-cyan-400/40 animate-ping opacity-60 pointer-events-none" />
                    <div className="absolute -inset-12 rounded-full border border-cyan-500/20 animate-pulse pointer-events-none" />

                    {/* Tower Icon Element */}
                    <div
                      className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-cyan-400 text-slate-950 scale-125 shadow-[0_0_20px_#00f0ff]"
                          : "bg-cyan-950/80 border border-cyan-400 text-cyan-300 group-hover:scale-110 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      }`}
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>

                    {/* Tower Tag */}
                    <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-[#020b1e]/90 border border-cyan-500/40 text-[9px] font-bold text-cyan-300 pointer-events-none">
                      {tower.code} (5G: {tower.signalStrength}%)
                    </div>
                  </div>
                );
              })}

            {/* SYSTEM 1: Police Units (Cruisers, SWAT, Drone, K9) */}
            {activeLayers.police &&
              policeUnits.map((unit) => {
                const isSelected = selectedEntity?.id === unit.id;
                const isSwat = unit.code.includes("SWAT");
                const isDrone = unit.code.includes("DRONE");

                return (
                  <div
                    key={unit.id}
                    onClick={() => handleSelectEntity(unit)}
                    style={{ left: `${unit.x}%`, top: `${unit.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-25 group transition-all duration-300"
                  >
                    {/* Pulsing Beacon Halo */}
                    <div className="absolute -inset-4 rounded-full bg-blue-500/25 animate-ping pointer-events-none" />

                    {/* Police Unit Icon */}
                    <div
                      className={`relative w-9 h-9 rounded-2xl flex items-center justify-center transition-transform ${
                        isSelected
                          ? "bg-gradient-to-tr from-blue-600 to-cyan-400 text-white scale-125 shadow-[0_0_25px_#38bdf8] border-2 border-white"
                          : "bg-blue-950/90 border border-blue-400 text-blue-300 group-hover:scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                      }`}
                    >
                      {isDrone ? (
                        <Navigation className="w-4 h-4 text-cyan-300 animate-spin" style={{ animationDuration: "8s" }} />
                      ) : isSwat ? (
                        <Shield className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Car className="w-4 h-4 text-blue-300" />
                      )}
                    </div>

                    {/* Directional Heading Vector */}
                    {unit.heading && (
                      <div
                        style={{ transform: `rotate(${unit.heading}deg)` }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-3 border-t-2 border-cyan-400 pointer-events-none"
                      />
                    )}

                    {/* Unit Callsign Label */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-[#020b1e]/90 border border-blue-500/40 text-[9px] font-bold text-white pointer-events-none flex items-center gap-1 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{unit.code}</span>
                      <span className="text-cyan-400 font-mono">[{unit.speed} km/h]</span>
                    </div>
                  </div>
                );
              })}

            {/* SYSTEM 3: Emergency Calls (911 / Citizen SOS) */}
            {activeLayers.calls &&
              emergencyCalls.map((call) => {
                const isSelected = selectedEntity?.id === call.id;
                const isCritical = call.statusType === "critical";

                return (
                  <div
                    key={call.id}
                    onClick={() => handleSelectEntity(call)}
                    style={{ left: `${call.x}%`, top: `${call.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
                  >
                    {/* Expanding Red Shockwaves */}
                    <div className="absolute -inset-6 rounded-full bg-red-600/30 animate-ping pointer-events-none" />
                    <div className="absolute -inset-10 rounded-full border border-red-500/40 animate-pulse pointer-events-none" />

                    {/* Glowing Call Marker */}
                    <div
                      className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-transform ${
                        isSelected
                          ? "bg-red-500 text-white scale-125 shadow-[0_0_30px_#ef4444] border-2 border-white"
                          : "bg-red-950/90 border-2 border-red-500 text-red-400 group-hover:scale-110 shadow-[0_0_20px_rgba(239,68,68,0.7)]"
                      }`}
                    >
                      <PhoneCall className="w-5 h-5 animate-bounce" />
                    </div>

                    {/* SOS Priority Tag */}
                    <div className="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-md bg-red-950/95 border border-red-400 text-[9px] font-black text-red-300 pointer-events-none flex items-center gap-1 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                      <span>{call.code}</span>
                    </div>
                  </div>
                );
              })}

            {/* SYSTEM 4: Active Incidents */}
            {activeLayers.incidents &&
              incidents.map((inc) => {
                const isSelected = selectedEntity?.id === inc.id;
                const isCritical = inc.statusType === "critical";

                return (
                  <div
                    key={inc.id}
                    onClick={() => handleSelectEntity(inc)}
                    style={{ left: `${inc.x}%`, top: `${inc.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-25 group"
                  >
                    {/* Warning Hexagon Glow */}
                    <div className="absolute -inset-4 rounded-full bg-amber-500/20 animate-pulse pointer-events-none" />

                    <div
                      className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-amber-400 text-slate-950 scale-125 shadow-[0_0_25px_#f59e0b] border-2 border-white"
                          : "bg-amber-950/90 border border-amber-400 text-amber-300 group-hover:scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-[#020b1e]/90 border border-amber-500/40 text-[9px] font-bold text-amber-300 pointer-events-none">
                      {inc.code}
                    </div>
                  </div>
                );
              })}

            {/* SYSTEM 5: Tracked Moving Vehicles */}
            {activeLayers.vehicles &&
              vehicles.map((veh) => {
                const isSelected = selectedEntity?.id === veh.id;
                const isSuspect = veh.statusType === "critical";

                return (
                  <div
                    key={veh.id}
                    onClick={() => handleSelectEntity(veh)}
                    style={{ left: `${veh.x}%`, top: `${veh.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-25 group transition-all duration-300"
                  >
                    <div
                      className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isSuspect
                          ? isSelected
                            ? "bg-red-500 text-white scale-125 shadow-[0_0_25px_#ef4444]"
                            : "bg-red-950 border-2 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.7)]"
                          : isSelected
                          ? "bg-cyan-400 text-slate-950 scale-125 shadow-[0_0_20px_#00f0ff]"
                          : "bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      }`}
                    >
                      <Crosshair className="w-4 h-4 animate-spin-slow" />
                    </div>

                    <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-[#020b1e]/90 border border-slate-700 text-[8px] font-mono font-bold text-slate-200 pointer-events-none">
                      {veh.code} • {veh.speed} km/h
                    </div>
                  </div>
                );
              })}

            {/* SYSTEM 6: Personnel Tracking (Ground Officers & Specialists) */}
            {activeLayers.personnel &&
              personnel.map((person) => {
                const isSelected = selectedEntity?.id === person.id;

                return (
                  <div
                    key={person.id}
                    onClick={() => handleSelectEntity(person)}
                    style={{ left: `${person.x}%`, top: `${person.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                  >
                    <div
                      className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-purple-500 text-white scale-125 shadow-[0_0_20px_#a855f7] border-2 border-white"
                          : "bg-purple-950/90 border border-purple-400 text-purple-300 group-hover:scale-110 shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                    </div>

                    <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-[#020b1e]/90 border border-purple-500/40 text-[8px] font-bold text-purple-300 pointer-events-none">
                      {person.code}
                    </div>
                  </div>
                );
              })}

            {/* Geofence Zone Label Badges */}
            {activeLayers.zones &&
              geofences.map((zone) => (
                <div
                  key={`label-${zone.id}`}
                  onClick={() => handleSelectZone(zone)}
                  style={{ left: `${zone.labelX}%`, top: `${zone.labelY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider cursor-pointer z-15 backdrop-blur-md border ${
                    zone.type === "restricted"
                      ? "bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      : zone.type === "caution"
                      ? "bg-amber-950/80 border-amber-500 text-amber-300"
                      : "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                  }`}
                >
                  {zone.name}
                </div>
              ))}

          </div>
        </motion.div>

        {/* ── FLOATING HOLOGRAPHIC TELEMETRY INSPECTOR PANEL ──────────────────── */}
        <AnimatePresence>
          {selectedEntity && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className="absolute top-6 right-6 z-40 w-80 md:w-96 rounded-3xl bg-[#020d28]/95 border border-cyan-400/40 p-5 shadow-[0_0_50px_rgba(0,240,255,0.25)] backdrop-blur-2xl text-slate-100 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                    {selectedEntity.system === "police" && <Shield className="w-5 h-5" />}
                    {selectedEntity.system === "towers" && <Radio className="w-5 h-5" />}
                    {selectedEntity.system === "calls" && <PhoneCall className="w-5 h-5 text-red-400 animate-bounce" />}
                    {selectedEntity.system === "incidents" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {selectedEntity.system === "vehicles" && <Car className="w-5 h-5" />}
                    {selectedEntity.system === "personnel" && <Users className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">
                      SYS: {selectedEntity.system.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-black text-white leading-tight">{selectedEntity.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">{selectedEntity.code}</p>
                  </div>
                </div>

                <button
                  onClick={resetCamera}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs">
                <span className="text-slate-400 text-[10px]">CURRENT STATUS:</span>
                <span
                  className={`font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${
                    selectedEntity.statusType === "critical"
                      ? "text-red-400 animate-pulse"
                      : selectedEntity.statusType === "warning"
                      ? "text-amber-400"
                      : "text-cyan-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedEntity.statusType === "critical"
                        ? "bg-red-400"
                        : selectedEntity.statusType === "warning"
                        ? "bg-amber-400"
                        : "bg-cyan-400"
                    }`}
                  />
                  {selectedEntity.status}
                </span>
              </div>

              {/* Audio Snippet if SOS Call */}
              {selectedEntity.audioSnippet && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-[10px] font-mono text-red-200">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>INTERCEPTED AUDIO TRANSCRIPT</span>
                  </div>
                  <p className="italic">{selectedEntity.audioSnippet}</p>
                </div>
              )}

              {/* Key-Value Details Grid */}
              <div className="space-y-1.5 text-[10px] font-mono bg-[#010714]/80 p-3 rounded-2xl border border-white/5 max-h-40 overflow-y-auto">
                {Object.entries(selectedEntity.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-white/5 py-1">
                    <span className="text-slate-400 uppercase">{key}:</span>
                    <span className="text-cyan-300 font-bold text-right truncate max-w-[180px]">{String(value)}</span>
                  </div>
                ))}
              </div>

              {/* Tactical Actions Deck */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  disabled={actionInProgress !== null}
                  onClick={() => handleDispatchAction("DISPATCH NEAREST UNIT")}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionInProgress === "DISPATCH NEAREST UNIT" ? "TRANSMITTING..." : "DISPATCH UNIT"}</span>
                </button>

                <button
                  disabled={actionInProgress !== null}
                  onClick={() => handleDispatchAction("INTERCEPT TRAJECTORY")}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{actionInProgress === "INTERCEPT TRAJECTORY" ? "LOCKING..." : "INTERCEPT"}</span>
                </button>

                <button
                  disabled={actionInProgress !== null}
                  onClick={() => handleDispatchAction("AUDIO CHANNEL OPEN")}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/40 hover:border-purple-400 text-purple-300 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>COMM CHANNEL</span>
                </button>

                <button
                  disabled={actionInProgress !== null}
                  onClick={() => handleDispatchAction("PERIMETER LOCKDOWN")}
                  className="px-3 py-2 rounded-xl bg-red-950/80 border border-red-500 hover:bg-red-900 text-red-300 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>LOCKDOWN</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CAMERA ZOOM / PAN CONTROLS ON MAP ────────────────────────────── */}
        <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-1.5 bg-[#020b1e]/90 border border-cyan-500/30 p-1.5 rounded-2xl backdrop-blur-md shadow-lg">
          <button
            onClick={() => {
              setZoomLevel((prev) => Math.min(prev + 0.3, 2.5));
              sfx.playSelectChirp();
            }}
            title="Zoom In"
            className="p-2 rounded-xl hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoomLevel((prev) => Math.max(prev - 0.3, 0.8));
              sfx.playSelectChirp();
            }}
            title="Zoom Out"
            className="p-2 rounded-xl hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetCamera}
            title="Reset Perspective"
            className="p-2 rounded-xl hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* ── BOTTOM COHESIVE SYSTEM LAYER FILTER DOCK ────────────────────────── */}
      <footer className="relative z-40 px-6 py-4 border-t border-cyan-500/20 bg-[#020a1c]/95 backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Layer Filters Deck */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>LIVE SYSTEMS:</span>
          </span>

          {/* 1. Police Units Filter */}
          <button
            onClick={() => toggleLayer("police")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeLayers.police
                ? "bg-blue-600/20 border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <Shield className="w-3 h-3 text-blue-400" />
            <span>Police Units ({policeUnits.length})</span>
          </button>

          {/* 2. Cell Towers Filter */}
          <button
            onClick={() => toggleLayer("towers")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeLayers.towers
                ? "bg-cyan-600/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>Cell Towers ({cellTowers.length})</span>
          </button>

          {/* 3. Emergency Calls Filter */}
          <button
            onClick={() => toggleLayer("calls")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeLayers.calls
                ? "bg-red-600/20 border-red-400 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <PhoneCall className="w-3 h-3 text-red-400 animate-pulse" />
            <span>911 / SOS Calls ({emergencyCalls.length})</span>
          </button>

          {/* 4. Incidents Filter */}
          <button
            onClick={() => toggleLayer("incidents")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeLayers.incidents
                ? "bg-amber-600/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Incidents ({incidents.length})</span>
          </button>

          {/* 5. Vehicles Filter */}
          <button
            onClick={() => toggleLayer("vehicles")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeLayers.vehicles
                ? "bg-cyan-600/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <Car className="w-3 h-3 text-cyan-400" />
            <span>Vehicles ({vehicles.length})</span>
          </button>

          {/* 6. Personnel Filter */}
          <button
            onClick={() => toggleLayer("personnel")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeLayers.personnel
                ? "bg-purple-600/20 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <Users className="w-3 h-3 text-purple-400" />
            <span>Personnel ({personnel.length})</span>
          </button>

          {/* 7. Geofence Zones Filter */}
          <button
            onClick={() => toggleLayer("zones")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeLayers.zones
                ? "bg-emerald-600/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <Crosshair className="w-3 h-3 text-emerald-400" />
            <span>Geofence Zones ({geofences.length})</span>
          </button>
        </div>

        {/* Global Layer Preset Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAllLayers(true)}
            className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            Show All
          </button>
          <button
            onClick={() => toggleAllLayers(false)}
            className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            Hide All
          </button>
        </div>

      </footer>

      {/* ── LIVE TACTICAL RADIO TICKER STREAM ───────────────────────────────── */}
      <div className="relative z-40 bg-[#010614] border-t border-cyan-500/10 px-6 py-2 flex items-center justify-between text-[9px] font-mono text-cyan-400/80">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase">
            LIVE RADIO FEED
          </span>
          <span className="truncate">
            [154.850 MHz] • DISPATCH: PATROL-01 ARRIVED AT PERIMETER • RECON DRONE UAV-02 THERMAL SCANNING ROOFTOP • TARGET VEHICLE SPEED 84 KM/H
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-slate-400 shrink-0">
          <span>ENTITIES TRACKED: <strong className="text-white">{totalTrackedEntities}</strong></span>
          <span>•</span>
          <span>CARRIER: <strong className="text-cyan-300">POLICE TETRA MESH</strong></span>
        </div>
      </div>

    </div>
  );
}
