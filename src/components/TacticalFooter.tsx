"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Radio,
  AlertTriangle,
  PhoneCall,
  Car,
  Users,
  Activity,
  Lock,
  Wifi,
  Clock,
  Layers,
  Terminal,
  Zap
} from "lucide-react";

export function TacticalFooter() {
  const [currentTime, setCurrentTime] = useState("");
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().slice(11, 19) +
          " ZULU (" +
          now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase() +
          ")"
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setPulseTick((prev) => (prev + 1) % 100);
    }, 1500);
    return () => clearInterval(tick);
  }, []);

  return (
    <footer className="relative w-full z-40 bg-[#020817] border-t border-cyan-500/30 text-slate-200 font-mono shadow-[0_-10px_35px_rgba(0,240,255,0.08)] select-none">
      
      {/* Top Subtle Neon Edge Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />

      {/* Main Tactical Status Pill Controls Row */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left Side: System Label & Controls */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-[10px]">
          
          {/* Live Systems Prefix */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-extrabold tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span>LIVE SYSTEMS</span>
          </div>

          {/* 1. Police Units Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-bold hover:bg-blue-500/20 transition-all shadow-sm">
            <Shield className="w-3 h-3 text-blue-400" />
            <span>POLICE UNITS:</span>
            <strong className="text-white">04 ACTIVE</strong>
          </div>

          {/* 2. Cell Towers Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all shadow-sm">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>CELL TOWERS:</span>
            <strong className="text-cyan-200">04 ONLINE</strong>
          </div>

          {/* 3. 911 / Emergency Calls Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 font-bold hover:bg-rose-500/20 transition-all shadow-sm">
            <PhoneCall className="w-3 h-3 text-rose-400 animate-pulse" />
            <span>EMERGENCY:</span>
            <strong className="text-rose-200">03 LOGGED</strong>
          </div>

          {/* 4. Incidents Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold hover:bg-amber-500/20 transition-all shadow-sm">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>INCIDENTS:</span>
            <strong className="text-amber-200">03 TRACKED</strong>
          </div>

          {/* 5. Tracked Vehicles Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold hover:bg-indigo-500/20 transition-all shadow-sm">
            <Car className="w-3 h-3 text-indigo-400" />
            <span>VEHICLES:</span>
            <strong className="text-indigo-200">03 EN ROUTE</strong>
          </div>

        </div>

        {/* Right Side: Global Telemetry Status & Zulu Clock */}
        <div className="flex items-center gap-4 text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-bold">STATUS:</span>
            <strong className="text-emerald-400 font-black">99.98% ONLINE</strong>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5 text-cyan-300">
            <Clock className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: "14s" }} />
            <span className="font-bold">{currentTime || "00:00:00 ZULU"}</span>
          </div>
        </div>

      </div>

      {/* Bottom Technical System-Information Strip */}
      <div className="w-full bg-[#010510] border-t border-cyan-500/10 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[8px] md:text-[9px] text-slate-500 tracking-wider">
          <div className="flex items-center gap-2 truncate">
            <span className="text-cyan-400/80 font-bold">KOZHIKODE RURAL COMMAND</span>
            <span>•</span>
            <span>FREQUENCY: 154.850 MHZ</span>
            <span>•</span>
            <span>ENCRYPTED VHF TETRA MESH</span>
            <span>•</span>
            <span>SUB-METER GPS TELEMETRY</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-emerald-400/80 font-bold">● CORDON INTEGRITY SECURED</span>
            <span>•</span>
            <span>SECURE CITIZEN DISPATCH PROTOCOL v4.8</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
