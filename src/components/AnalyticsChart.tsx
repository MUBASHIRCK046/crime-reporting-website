"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, CheckCircle2, TrendingUp, Users } from "lucide-react";

interface AnalyticsChartProps {
  totalOfficers?: number;
  activeOfficers?: number;
  solvedCases?: number;
  pendingCases?: number;
}

export default function AnalyticsChart({
  totalOfficers = 5,
  activeOfficers = 5,
  solvedCases = 121,
  pendingCases = 3
}: AnalyticsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Example Case Resolution Data over the week
  const data = [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 18 },
    { label: "Wed", value: 15 },
    { label: "Thu", value: 24 },
    { label: "Fri", value: 21 },
    { label: "Sat", value: 29 },
    { label: "Sun", value: 32 }
  ];

  const chartWidth = 500;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const values = data.map((d) => d.value);
  const maxValue = 40; // baseline cap for police resolved activity scale
  const minValue = 0;

  // Map coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i * (chartWidth - paddingX - 20)) / (data.length - 1);
    const y = chartHeight - paddingY - ((d.value - minValue) / (maxValue - minValue)) * (chartHeight - paddingY - 20);
    return { x, y, label: d.label, value: d.value };
  });

  // Calculate smooth cubic bezier path
  const getCurvePath = (pts: typeof points) => {
    if (pts.length === 0) return "";
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      // Interpolate control points for cubic Bezier
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const linePath = getCurvePath(points);
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : "";

  // Grid line Y coordinates
  const gridLines = [0, 10, 20, 30, 40].map((val) => {
    const y = chartHeight - paddingY - ((val - minValue) / (maxValue - minValue)) * (chartHeight - paddingY - 20);
    return { y, val };
  });

  // Handle Mouse Hovering Coordinate calculation
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * chartWidth;

    let closestIndex = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    setHoveredIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Circular progress calculations for Active Officers
  const deploymentRate = totalOfficers > 0 ? (activeOfficers / totalOfficers) * 100 : 0;
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (deploymentRate / 100) * circ;

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative w-full select-none"
    >
      {/* LEFT: MAIN CHART (70% width or 2/3 columns) */}
      <div className="lg:col-span-2 glass-panel p-6 border border-slate-200/90 dark:border-white/5 bg-white/95 dark:bg-slate-900/40 shadow-md dark:shadow-xl relative overflow-hidden flex flex-col justify-between h-[320px]">
        {/* Soft Radial Glow behind chart */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-[40px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-500/10 blur-[40px] pointer-events-none" />

        {/* Chart Header */}
        <div className="flex items-center justify-between z-10 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Case Resolution Activity
            </h3>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
              Weekly Solve Rate <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5"/> +18%</span>
            </p>
          </div>
          <div className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-md bg-slate-100/80 dark:bg-slate-950/20">
            Realtime Grid
          </div>
        </div>

        {/* SVG Wrapper */}
        <div className="relative flex-1 w-full">
          <svg
            className="w-full h-full cursor-crosshair overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Area Gradient */}
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              {/* Line Stroke Gradient */}
              <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              {/* Grid Line Dash */}
              <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="10" y2="0" className="stroke-slate-200/50 dark:stroke-white/[0.02]" />
              </pattern>
            </defs>

            {/* Grid Pattern Background */}
            <rect x={paddingX} y={20} width={chartWidth - paddingX - 20} height={chartHeight - paddingY - 20} fill="url(#grid-pattern)" />

            {/* Horizontal Grid lines */}
            {gridLines.map((line, idx) => (
              <g key={idx} className="opacity-60 dark:opacity-40">
                <line
                  x1={paddingX}
                  y1={line.y}
                  x2={chartWidth - 20}
                  y2={line.y}
                  className="stroke-slate-200 dark:stroke-white/[0.07]"
                  strokeWidth="1"
                  strokeDasharray="3, 3"
                />
                <text
                  x={paddingX - 10}
                  y={line.y + 4}
                  fontSize="10"
                  textAnchor="end"
                  className="font-mono font-bold fill-slate-500 dark:fill-slate-400"
                >
                  {line.val}
                </text>
              </g>
            ))}

            {/* Area path */}
            {areaPath && (
              <path d={areaPath} fill="url(#chart-area-grad)" />
            )}

            {/* Glowing line path */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#chart-line-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* X Axis Labels */}
            {points.map((pt, idx) => (
              <text
                key={idx}
                x={pt.x}
                y={chartHeight - 8}
                fontSize="10"
                textAnchor="middle"
                className="font-bold fill-slate-600 dark:fill-slate-400"
              >
                {pt.label}
              </text>
            ))}

            {/* Hover Tracing Line & Glowing Circle */}
            {hoveredIndex !== null && (
              <g>
                {/* Vertical trace line */}
                <line
                  x1={points[hoveredIndex].x}
                  y1={20}
                  x2={points[hoveredIndex].x}
                  y2={chartHeight - paddingY}
                  stroke="rgba(6, 182, 212, 0.6)"
                  strokeWidth="1.5"
                  strokeDasharray="4, 4"
                />
                {/* Glowing Outer Dot */}
                <circle
                  cx={points[hoveredIndex].x}
                  cy={points[hoveredIndex].y}
                  r="7"
                  fill="#06b6d4"
                  opacity="0.4"
                  className="animate-ping"
                />
                {/* Solid Core Dot */}
                <circle
                  cx={points[hoveredIndex].x}
                  cy={points[hoveredIndex].y}
                  r="4.5"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Absolute Tooltip Container */}
        <AnimatePresence>
          {hoveredIndex !== null && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bg-slate-900/95 dark:bg-slate-950/90 border border-cyan-500/40 text-white rounded-xl p-2.5 shadow-2xl backdrop-blur-md z-30 pointer-events-none"
              style={{
                left: `${Math.min(75, Math.max(5, (points[hoveredIndex].x / chartWidth) * 100 - 15))}%`,
                top: `${(points[hoveredIndex].y / chartHeight) * 70 + 40}px`
              }}
            >
              <p className="text-[10px] font-bold text-slate-300 dark:text-slate-400 uppercase tracking-wider">
                {points[hoveredIndex].label} Activity
              </p>
              <p className="text-sm font-black text-cyan-300 dark:text-cyan-400 mt-0.5">
                {points[hoveredIndex].value} Cases Solved
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT: PRECINCT STATUS MONITOR (30% width or 1/3 columns) */}
      <div className="glass-panel p-6 border border-slate-200/90 dark:border-white/5 bg-white/95 dark:bg-slate-900/40 shadow-md dark:shadow-xl relative overflow-hidden flex flex-col justify-between h-[320px]">
        {/* Glow */}
        <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-purple-500/10 blur-[40px] pointer-events-none" />

        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          Precinct Status Monitor
        </h3>

        <div className="flex-1 flex flex-col justify-around">
          {/* Active Officers Circular Progress Ring */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-white/5 p-3 rounded-xl">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  className="stroke-slate-200 dark:stroke-white/[0.06]"
                  strokeWidth="5"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  stroke="#06b6d4"
                  strokeWidth="5"
                  strokeDasharray={circ}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                Active Deployment
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {activeOfficers} / {totalOfficers} Officers
              </p>
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/20 px-1.5 py-0.5 rounded">
                100% On-Duty Grid
              </span>
            </div>
          </div>

          {/* Pending Cases */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-600 dark:text-yellow-500 relative">
                <Clock className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                  Active Dispatch Pipeline
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-200 mt-1">
                  {pendingCases} Cases Pending
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500/20 px-2 py-0.5 rounded-full">
              Urgent
            </span>
          </div>

          {/* Solved Cases */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                  Precision Resolve
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-200 mt-1">
                  {solvedCases} solved overall
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
              Precinct Record
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
