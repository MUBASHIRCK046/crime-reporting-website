"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

export function CountUp({ to, duration = 800 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = to;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMilliseconds = duration;
    const incrementTime = 16; // ~60fps
    const totalSteps = totalMilliseconds / incrementTime;
    const stepIncrement = (end - start) / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setCount((prev) => {
        const next = prev + stepIncrement;
        if (currentStep >= totalSteps) {
          clearInterval(timer);
          return end;
        }
        return next;
      });
    }, incrementTime);

    return () => clearInterval(timer);
  }, [to, duration]);

  return <>{Math.round(count)}</>;
}

export function MiniGraph({ points, color, type }: { points: number[]; color: string; type: string }) {
  const width = 80;
  const height = 24;
  const padding = 10;
  const xStep = width / (points.length - 1);

  if (type === "bar") {
    return (
      <svg className="w-20 h-10 mt-1 opacity-70" viewBox="0 0 100 40">
        {points.map((p, index) => {
          const w = 6;
          const h = p * (height / 5);
          const x = padding + index * (width / points.length) + 6;
          const y = height + padding - h;
          return (
            <motion.rect
              key={index}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="1.5"
              fill={color}
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 + index * 0.1 }}
            />
          );
        })}
      </svg>
    );
  }

  if (type === "area") {
    const pathPoints = points.map((p, index) => {
      const x = padding + index * xStep;
      const y = height + padding - p * (height / 5);
      return { x, y };
    });
    const linePath = pathPoints.map((pt, index) => `${index === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
    const areaPath = `${linePath} L ${pathPoints[pathPoints.length - 1].x} ${height + padding} L ${pathPoints[0].x} ${height + padding} Z`;

    return (
      <svg className="w-20 h-10 mt-1 opacity-70" viewBox="0 0 100 40">
        <defs>
          <linearGradient id={`area-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill={`url(#area-grad-${color})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut", delay: 0.5 }}
        />
      </svg>
    );
  }

  // Default: line chart
  const pathData = points.map((p, index) => {
    const x = padding + index * xStep;
    const y = height + padding - p * (height / 5);
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  return (
    <svg className="w-20 h-10 mt-1 opacity-70" viewBox="0 0 100 40">
      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeInOut", delay: 0.5 }}
      />
    </svg>
  );
}

export function MorphingCard({ 
  title, 
  value, 
  points, 
  color, 
  type,
  delay 
}: { 
  title: string; 
  value: number; 
  points: number[]; 
  color: string; 
  type: string;
  delay: number; 
}) {
  const colorMap = {
    blue: {
      border: "border-cyan-500/20 hover:border-cyan-500/40",
      glow: "hover:shadow-[0_0_25px_rgba(6,182,212,0.25)]",
      grad: "from-cyan-500/10 to-blue-500/5",
      sparkline: "#06b6d4"
    },
    red: {
      border: "border-rose-500/20 hover:border-rose-500/40",
      glow: "hover:shadow-[0_0_25px_rgba(244,63,94,0.25)]",
      grad: "from-rose-500/10 to-red-500/5",
      sparkline: "#f43f5e"
    },
    purple: {
      border: "border-fuchsia-500/20 hover:border-fuchsia-500/40",
      glow: "hover:shadow-[0_0_25px_rgba(217,70,239,0.25)]",
      grad: "from-fuchsia-500/10 to-purple-500/5",
      sparkline: "#d946ef"
    },
    emerald: {
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      glow: "hover:shadow-[0_0_25px_rgba(16,185,129,0.25)]",
      grad: "from-emerald-500/10 to-teal-500/5",
      sparkline: "#10b981"
    },
    indigo: {
      border: "border-indigo-500/20 hover:border-indigo-500/40",
      glow: "hover:shadow-[0_0_25px_rgba(99,102,241,0.25)]",
      grad: "from-indigo-500/10 to-violet-500/5",
      sparkline: "#6366f1"
    },
    amber: {
      border: "border-amber-500/20 hover:border-amber-500/40",
      glow: "hover:shadow-[0_0_25px_rgba(245,158,11,0.25)]",
      grad: "from-amber-500/10 to-orange-500/5",
      sparkline: "#f59e0b"
    }
  };

  const current = colorMap[color as keyof typeof colorMap] || colorMap.blue;

  return (
    <div className="flex flex-col items-center justify-center w-full h-52">
      {/* Gentle Floating Motion wrapper */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ 
          repeat: Infinity, 
          duration: 5 + delay * 2, 
          ease: "easeInOut" 
        }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ 
            borderRadius: "24px", 
            width: "240px", 
            height: "120px",
            opacity: 0,
            scale: 0.9
          }}
          animate={{ 
            borderRadius: "50%", 
            width: "160px", 
            height: "160px",
            opacity: 1,
            scale: 1
          }}
          whileHover={{
            scale: 1.06,
            transition: { duration: 0.3, ease: "easeOut" }
          }}
          transition={{ 
            duration: 0.8, 
            ease: "easeInOut",
            delay: delay
          }}
          className={`backdrop-blur-xl bg-white/10 dark:bg-black/20 flex flex-col items-center justify-center p-4 relative cursor-pointer shadow-lg border bg-gradient-to-br ${current.grad} ${current.border} ${current.glow} transition-shadow duration-300`}
        >
          {/* Highlight effect overlay */}
          <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none"></div>

          <span className="text-4xl font-extrabold text-text-primary tracking-tight z-10 drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
            <CountUp to={value} />
          </span>
          
          <div className="flex items-center justify-center w-full mt-1 z-10">
            <MiniGraph points={points} color={current.sparkline} type={type} />
          </div>
        </motion.div>
        
        <motion.span 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.4, duration: 0.4 }}
          className="mt-4 text-xs font-bold uppercase tracking-wider text-text-secondary select-none"
        >
          {title}
        </motion.span>
      </motion.div>
    </div>
  );
}

function StatusCircleCard({
  label,
  value,
  total,
  color,
  delay
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  delay: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const rOuter = 52;
  const rInner = 44;
  const circOuter = 2 * Math.PI * rOuter; // ~326.72
  const offsetOuter = circOuter * (1 - pct / 100);

  const colorMap = {
    orange: {
      stroke: "#f59e0b",
      glow: "hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]",
      bgGlow: "bg-amber-500/5",
      border: "border-amber-500/20 hover:border-amber-500/40"
    },
    blue: {
      stroke: "#06b6d4",
      glow: "hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]",
      bgGlow: "bg-cyan-500/5",
      border: "border-cyan-500/20 hover:border-cyan-500/40"
    },
    green: {
      stroke: "#10b981",
      glow: "hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]",
      bgGlow: "bg-emerald-500/5",
      border: "border-emerald-500/20 hover:border-emerald-500/40"
    }
  };

  const current = colorMap[color as keyof typeof colorMap] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        scale: 1.08,
        transition: { duration: 0.2 }
      }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center cursor-pointer glass-panel border ${current.border} ${current.bgGlow} transition-all duration-300 ${current.glow}`}
    >
      {/* Glass Highlight */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none"></div>

      {/* SVG Double Ring Overlay */}
      <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 120 120">
        {/* Outer Ring Background Track */}
        <circle
          cx="60"
          cy="60"
          r={rOuter}
          className="stroke-ui-border/30 fill-transparent transition-colors duration-300"
          strokeWidth="3.5"
        />
        {/* Outer Progress Ring */}
        <motion.circle
          cx="60"
          cy="60"
          r={rOuter}
          stroke={current.stroke}
          className="fill-transparent"
          strokeWidth="3.5"
          strokeDasharray={circOuter}
          initial={{ strokeDashoffset: circOuter }}
          animate={{ strokeDashoffset: offsetOuter }}
          transition={{ duration: 1, ease: "easeInOut", delay: delay + 0.2 }}
          strokeLinecap="round"
        />
        {/* Inner Dashed Ring (Slow Continuous Rotation) */}
        <motion.circle
          cx="60"
          cy="60"
          r={rInner}
          stroke={current.stroke}
          className="fill-transparent opacity-25"
          strokeWidth="1.5"
          strokeDasharray="4, 4"
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 15,
            ease: "linear"
          }}
          style={{ transformOrigin: "60px 60px" }}
        />
      </svg>

      {/* Centered Content */}
      <div className="text-center z-10 flex flex-col items-center justify-center select-none px-2">
        <span className="text-3xl font-black text-text-primary leading-none">
          <CountUp to={value} />
        </span>
        <span className="text-[10px] uppercase font-black text-text-secondary tracking-widest mt-2 whitespace-nowrap">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export function StatusDonutChart({ 
  pending, 
  inProgress, 
  resolved 
}: { 
  pending: number; 
  inProgress: number; 
  resolved: number; 
}) {
  const total = pending + inProgress + resolved;
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~251.32

  // Angles and offsets
  const pendingPct = total > 0 ? pending / total : 0;
  const inProgressPct = total > 0 ? inProgress / total : 0;
  const resolvedPct = total > 0 ? resolved / total : 0;

  const pendingAngle = pendingPct * 360;
  const inProgressAngle = inProgressPct * 360;
  const resolvedAngle = resolvedPct * 360;

  // Offsets (drawn end-to-end relative to the circumference)
  const pendingOffset = circumference * (1 - pendingPct);
  const inProgressOffset = circumference * (1 - inProgressPct);
  const resolvedOffset = circumference * (1 - resolvedPct);

  // Rotation start positions (Top of circle is -90deg)
  const pendingStart = -90;
  const inProgressStart = pendingStart + pendingAngle;
  const resolvedStart = inProgressStart + inProgressAngle;

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-panel shadow-lg border border-white/20 dark:border-white/10 w-full relative overflow-hidden backdrop-blur-xl bg-white/10 dark:bg-black/20 rounded-2xl">
      {/* Light refraction highlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none"></div>

      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-6 relative z-10 select-none">
        Case Status Breakdown
      </h3>

      {/* Donut Ring Layout */}
      <div className="flex flex-col items-center justify-center gap-6 w-full relative z-10">
        {/* SVG Donut Ring */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-44 h-44 flex items-center justify-center cursor-pointer"
        >
          {/* Subtle Rotating Outer Glow Track */}
          <motion.div
            className="absolute inset-0 rounded-full border border-dashed border-white/10 opacity-30"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          />

          <svg className="w-full h-full transform" viewBox="0 0 120 120">
            {/* Empty Track */}
            {total === 0 ? (
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#475569"
                strokeWidth={strokeWidth}
                fill="transparent"
                className="opacity-20"
              />
            ) : (
              <>
                {/* Pending Segment */}
                {pending > 0 && (
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#f59e0b"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: pendingOffset }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
                    transform={`rotate(${pendingStart} 60 60)`}
                    strokeLinecap="round"
                  />
                )}

                {/* In-Progress Segment */}
                {inProgress > 0 && (
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#06b6d4"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: inProgressOffset }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
                    transform={`rotate(${inProgressStart} 60 60)`}
                    strokeLinecap="round"
                  />
                )}

                {/* Resolved Segment */}
                {resolved > 0 && (
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#10b981"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: resolvedOffset }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.3 }}
                    transform={`rotate(${resolvedStart} 60 60)`}
                    strokeLinecap="round"
                  />
                )}
              </>
            )}
          </svg>

          {/* Center Hole Content */}
          <div className="absolute text-center z-10 select-none flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-text-primary leading-none">
              <CountUp to={total} />
            </span>
            <span className="text-[9px] uppercase font-black text-text-secondary tracking-wider mt-1">
              Total Cases
            </span>
          </div>
        </motion.div>

        {/* Vertical Legend (each row stacked vertically) */}
        <div className="w-full space-y-3 mt-2">
          {/* Pending */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between p-2.5 bg-ui-bg/40 border border-amber-500/10 rounded-xl hover:border-amber-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-xs font-bold text-text-secondary">Pending</span>
            </div>
            <span className="text-sm font-black text-amber-500">
              <CountUp to={pending} />
            </span>
          </motion.div>

          {/* In-Progress */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between p-2.5 bg-ui-bg/40 border border-cyan-500/10 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
              <span className="text-xs font-bold text-text-secondary">In-Progress</span>
            </div>
            <span className="text-sm font-black text-cyan-500">
              <CountUp to={inProgress} />
            </span>
          </motion.div>

          {/* Resolved */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-between p-2.5 bg-ui-bg/40 border border-emerald-500/10 rounded-xl hover:border-emerald-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-bold text-text-secondary">Resolved</span>
            </div>
            <span className="text-sm font-black text-emerald-500">
              <CountUp to={resolved} />
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function PrecinctCircularStats({
  totalComplaints,
  activeSOS,
  totalOfficers,
  totalUsers,
  pendingCases,
  resolvedCases,
  onSOSClick,
  onOfficersClick
}: {
  totalComplaints: number;
  activeSOS: number;
  totalOfficers: number;
  totalUsers: number;
  pendingCases: number;
  resolvedCases: number;
  onSOSClick?: () => void;
  onOfficersClick?: () => void;
}) {
  const statsList = [
    {
      id: "complaints",
      label: "Total Complaints",
      value: totalComplaints,
      subText: "FIRs & CSRs Registered",
      color: "#06b6d4",
      bgGlow: "bg-cyan-500/10",
      border: "border-cyan-500/25 hover:border-cyan-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]",
      pct: 100
    },
    {
      id: "sos",
      label: "Active SOS Cases",
      value: activeSOS,
      subText: activeSOS > 0 ? "🚨 Immediate Action Req." : "All Dispatches Clear",
      color: "#ef4444",
      bgGlow: "bg-red-500/15",
      border: "border-red-500/40 hover:border-red-500/70",
      glow: "shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:shadow-[0_0_35px_rgba(239,68,68,0.5)]",
      pct: activeSOS > 0 ? Math.min(100, (activeSOS / 10) * 100) : 0,
      isEmergency: true,
      onClick: onSOSClick
    },
    {
      id: "officers",
      label: "Total Police Officers",
      value: totalOfficers,
      subText: "Active Precinct Grid",
      color: "#a855f7",
      bgGlow: "bg-purple-500/10",
      border: "border-purple-500/25 hover:border-purple-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]",
      pct: totalOfficers > 0 ? Math.min(100, (totalOfficers / 20) * 100) : 0,
      onClick: onOfficersClick
    },
    {
      id: "users",
      label: "Total Users",
      value: totalUsers,
      subText: "Verified Citizen KYC",
      color: "#6366f1",
      bgGlow: "bg-indigo-500/10",
      border: "border-indigo-500/25 hover:border-indigo-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]",
      pct: 100
    },
    {
      id: "pending",
      label: "Total Pending Cases",
      value: pendingCases,
      subText: totalComplaints > 0 ? `${Math.round((pendingCases / totalComplaints) * 100)}% Under Investigation` : "0% Backlog",
      color: "#f59e0b",
      bgGlow: "bg-amber-500/10",
      border: "border-amber-500/25 hover:border-amber-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]",
      pct: totalComplaints > 0 ? (pendingCases / totalComplaints) * 100 : 0
    },
    {
      id: "resolved",
      label: "Resolved Cases",
      value: resolvedCases,
      subText: totalComplaints > 0 ? `${Math.round((resolvedCases / totalComplaints) * 100)}% Safe Resolution Rate` : "100% Rate",
      color: "#10b981",
      bgGlow: "bg-emerald-500/10",
      border: "border-emerald-500/25 hover:border-emerald-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]",
      pct: totalComplaints > 0 ? (resolvedCases / totalComplaints) * 100 : 100
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
      {statsList.map((stat, idx) => {
        const rOuter = 44;
        const circOuter = 2 * Math.PI * rOuter; // ~276.46
        const safePct = Math.max(10, Math.min(100, stat.pct));
        const offsetOuter = circOuter * (1 - safePct / 100);

        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
            whileHover={{ scale: 1.05, y: -3 }}
            onClick={stat.onClick}
            className={`p-4 rounded-3xl glass-panel border ${stat.border} ${stat.bgGlow} transition-all duration-300 flex flex-col items-center justify-between text-center relative overflow-hidden shadow-lg ${stat.glow} ${stat.onClick ? "cursor-pointer" : ""}`}
          >
            {/* Ambient Refraction Highlight */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none rounded-3xl" />

            {/* Circular Ring Progress */}
            <div className="relative w-28 h-28 flex items-center justify-center my-1">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
                {/* Background Track */}
                <circle
                  cx="55"
                  cy="55"
                  r={rOuter}
                  className="stroke-slate-200 dark:stroke-ui-border/30 fill-transparent"
                  strokeWidth="5.5"
                />
                {/* Animated Progress Ring */}
                <motion.circle
                  cx="55"
                  cy="55"
                  r={rOuter}
                  stroke={stat.color}
                  className="fill-transparent"
                  strokeWidth="5.5"
                  strokeDasharray={circOuter}
                  initial={{ strokeDashoffset: circOuter }}
                  animate={{ strokeDashoffset: offsetOuter }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 + idx * 0.1 }}
                  strokeLinecap="round"
                />
                {/* Inner Dashed Indicator Ring */}
                <motion.circle
                  cx="55"
                  cy="55"
                  r={35}
                  stroke={stat.color}
                  className="fill-transparent opacity-20"
                  strokeWidth="1.5"
                  strokeDasharray="3, 3"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                  style={{ transformOrigin: "55px 55px" }}
                />
              </svg>

              {/* Number Inside Ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                <span className="text-2xl font-black text-text-primary tracking-tight leading-none">
                  <CountUp to={stat.value} />
                </span>
                {stat.isEmergency && stat.value > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mt-1" />
                )}
              </div>
            </div>

            {/* Label & Supporting Text */}
            <div className="mt-2 w-full space-y-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-text-primary truncate" title={stat.label}>
                {stat.label}
              </p>
              <p className="text-[10px] font-bold text-text-tertiary truncate" title={stat.subText}>
                {stat.subText}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

