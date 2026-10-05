"use client";

import React, { useRef, useState, useImperativeHandle, forwardRef } from "react";
import { animate, createTimeline, remove } from "animejs";

export interface AnimatedSubmitButtonRef {
  start: () => Promise<void>;
  success: () => Promise<void>;
  reset: () => void;
  isLoading: () => boolean;
}

interface AnimatedSubmitButtonProps {
  text?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => Promise<void> | void;
  variant?: "default" | "compact";
  width?: number | string;
  height?: number | string;
}

export const AnimatedSubmitButton = forwardRef<AnimatedSubmitButtonRef, AnimatedSubmitButtonProps>(
  (
    {
      text = "Submit",
      type = "submit",
      disabled = false,
      className = "",
      onClick,
      variant = "default",
      width = 200,
      height = 56,
    },
    ref
  ) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const checkSvgRef = useRef<SVGSVGElement>(null);
    const checkPathRef = useRef<SVGPathElement>(null);

    const startAnimation = async () => {
      setIsSubmitting(true);
      setIsComplete(false);

      if (!buttonRef.current || !textRef.current || !progressRef.current || !checkPathRef.current || !checkSvgRef.current) {
        return;
      }

      // Reset any previous animations
      remove([buttonRef.current, textRef.current, progressRef.current, checkSvgRef.current, checkPathRef.current]);

      const checkPath = checkPathRef.current;
      const totalLength = checkPath.getTotalLength ? checkPath.getTotalLength() : 40;
      checkPath.style.strokeDasharray = `${totalLength}`;
      checkPath.style.strokeDashoffset = `${totalLength}`;

      const tl = createTimeline({
        defaults: {
          ease: "inOutQuad",
        },
      });

      // 1. Fade out text
      tl.add(textRef.current, {
        opacity: [1, 0],
        duration: 200,
      })
        // 2. Transform button into progress bar background track
        .add(buttonRef.current, {
          height: [height, 10],
          width: [width, typeof width === "number" ? width : 200],
          borderRadius: ["8px", "200px"],
          backgroundColor: "#1F2937",
          duration: 300,
        }, "-=100")
        // 3. Animate progress bar fill from 0 to full
        .add(progressRef.current, {
          width: [0, typeof width === "number" ? width : 200],
          opacity: [1, 1],
          duration: 800,
        }, "-=50");

      try {
        await tl.then();
      } catch {
        // Handle if cancelled
      }
    };

    const successAnimation = async () => {
      if (!buttonRef.current || !progressRef.current || !checkSvgRef.current || !checkPathRef.current) {
        setIsComplete(true);
        setIsSubmitting(false);
        return;
      }

      const checkPath = checkPathRef.current;
      const totalLength = checkPath.getTotalLength ? checkPath.getTotalLength() : 40;

      const tl = createTimeline({
        defaults: {
          ease: "outQuad",
        },
      });

      // 4. Transform progress bar / button into a circular completion badge
      tl.add([buttonRef.current, progressRef.current], {
        width: 50,
        height: 50,
        borderRadius: "50%",
        backgroundColor: "#71DFBE",
        duration: 350,
      })
        // 5. Reveal checkmark and draw stroke
        .add(checkSvgRef.current, {
          opacity: [0, 1],
          scale: [0.5, 1],
          duration: 200,
        }, "-=150")
        .add(checkPath, {
          strokeDashoffset: [totalLength, 0],
          duration: 400,
        }, "-=100");

      try {
        await tl.then();
      } catch {
        // Handled
      }
      setIsComplete(true);
      setIsSubmitting(false);
    };

    const resetAnimation = () => {
      setIsSubmitting(false);
      setIsComplete(false);

      if (!buttonRef.current || !textRef.current || !progressRef.current || !checkSvgRef.current || !checkPathRef.current) {
        return;
      }

      remove([buttonRef.current, textRef.current, progressRef.current, checkSvgRef.current, checkPathRef.current]);

      animate(buttonRef.current, {
        width: width,
        height: height,
        borderRadius: "8px",
        backgroundColor: "#2B2D2F",
        duration: 250,
        ease: "outQuad",
      });

      animate(textRef.current, {
        opacity: 1,
        duration: 200,
        ease: "outQuad",
      });

      animate(progressRef.current, {
        width: 0,
        opacity: 0,
        duration: 150,
      });

      animate(checkSvgRef.current, {
        opacity: 0,
        scale: 0.5,
        duration: 150,
      });
    };

    useImperativeHandle(ref, () => ({
      start: startAnimation,
      success: successAnimation,
      reset: resetAnimation,
      isLoading: () => isSubmitting,
    }));

    const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || isSubmitting || isComplete) {
        e.preventDefault();
        return;
      }

      if (onClick) {
        try {
          await startAnimation();
          await onClick(e as any);
          await successAnimation();
        } catch (err) {
          resetAnimation();
          throw err;
        }
      } else if (type === "submit") {
        // Find the closest parent form and submit it, so HTML5 validation runs
        const form = containerRef.current?.closest("form");
        if (form) {
          form.requestSubmit();
        }
      }
    };

    return (
      <div
        ref={containerRef}
        className={`submit-button-container relative inline-flex items-center justify-center select-none ${className}`}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
        }}
      >
        {/* Hidden button for native form submit trigger when inside a form */}
        {type === "submit" && (
          <button
            type="submit"
            disabled={disabled || isSubmitting}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}

        {/* The Base Animated Button */}
        <div
          ref={buttonRef}
          onClick={handleClick}
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={`submit-button ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          style={{
            background: "#2B2D2F",
            height: typeof height === "number" ? `${height}px` : height,
            width: typeof width === "number" ? `${width}px` : width,
            textAlign: "center",
            position: "relative",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "box-shadow 0.2s ease, border-color 0.2s ease",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            ref={textRef}
            className="submit-button-text"
            style={{
              fontFamily: "'Poppins', sans-serif, system-ui",
              fontWeight: "bold",
              fontSize: variant === "compact" ? "0.95rem" : "1.1rem",
              color: "#71DFBE",
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              transform: "translateY(-52%)",
              letterSpacing: "0.5px",
            }}
          >
            {text}
          </div>
        </div>

        {/* The Progress Bar Fill */}
        <div
          ref={progressRef}
          className="submit-progress-bar pointer-events-none"
          style={{
            position: "absolute",
            height: "10px",
            width: "0px",
            left: "50%",
            top: "50%",
            borderRadius: "200px",
            transform: "translate(-50%, -50%)",
            background: "#71DFBE",
            opacity: 0,
            zIndex: 10,
          }}
        />

        {/* Checkmark SVG */}
        <svg
          ref={checkSvgRef}
          viewBox="0 0 25 30"
          aria-hidden="true"
          className="pointer-events-none"
          style={{
            position: "absolute",
            width: "24px",
            height: "24px",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0,
            zIndex: 20,
          }}
        >
          <path
            ref={checkPathRef}
            className="submit-check"
            d="M2,19.2C5.9,23.6,9.4,28,9.4,28L23,2"
            style={{
              fill: "none",
              stroke: "#1D1F20",
              strokeWidth: 4,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            }}
          />
        </svg>
      </div>
    );
  }
);

AnimatedSubmitButton.displayName = "AnimatedSubmitButton";
