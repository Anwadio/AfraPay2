import React from "react";

/**
 * Animation utilities for consistent micro-interactions
 * Performance-optimized animations using CSS transforms and opacity
 */

/**
 * Common animation class combinations
 */
export const animations = {
  // Entry animations
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  slideDown: "animate-slide-down",
  scaleIn: "animate-scale-in",

  // Interaction animations
  shake: "animate-shake",
  pulseOnce: "animate-pulse-once",

  // Loading animations
  shimmer: "animate-shimmer",

  // Hover effects
  hoverLift: "hover-lift transform transition-all duration-200",
  hoverScale: "hover:scale-105 transition-transform duration-200",
  hoverGlow: "hover:shadow-lg transition-shadow duration-200",

  // Button animations
  buttonPress: "active:scale-95 transition-transform duration-75",
  buttonHover:
    "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200",

  // Card animations
  cardHover: "hover:shadow-lg hover:-translate-y-1 transition-all duration-200",
  cardScale: "hover:scale-[1.02] transition-transform duration-200",
};

/**
 * Stagger animation delays for list items
 */
export const staggerDelays = {
  1: "stagger-1",
  2: "stagger-2",
  3: "stagger-3",
  4: "stagger-4",
  5: "stagger-5",
};

/**
 * Performance-optimized animation classes
 * Uses transform and opacity only for 60fps animations
 */
export const performantAnimations = {
  // GPU-accelerated transforms
  slideInLeft:
    "transform translate-x-full opacity-0 animate-[slideInLeft_0.3s_ease-out_forwards]",
  slideInRight:
    "transform -translate-x-full opacity-0 animate-[slideInRight_0.3s_ease-out_forwards]",
  slideInUp:
    "transform translate-y-full opacity-0 animate-[slideInUp_0.3s_ease-out_forwards]",
  slideInDown:
    "transform -translate-y-full opacity-0 animate-[slideInDown_0.3s_ease-out_forwards]",

  // Scale animations
  zoomIn:
    "transform scale-95 opacity-0 animate-[zoomIn_0.2s_ease-out_forwards]",
  zoomOut:
    "transform scale-105 opacity-0 animate-[zoomOut_0.2s_ease-out_forwards]",
};

/**
 * Animation duration presets
 */
export const durations = {
  fast: "duration-150",
  normal: "duration-200",
  slow: "duration-300",
  slower: "duration-500",
};

/**
 * Easing functions
 */
export const easings = {
  linear: "ease-linear",
  in: "ease-in",
  out: "ease-out",
  inOut: "ease-in-out",
  bounce: "ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
  elastic: "ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
};

/**
 * Utility functions for dynamic animations
 */

/**
 * Create a staggered animation class for list items
 * @param {number} index - Item index
 * @param {string} baseAnimation - Base animation class
 * @param {number} staggerDelay - Delay between items in ms
 */
export const createStaggeredAnimation = (
  index,
  baseAnimation,
  staggerDelay = 50
) => {
  const delay = `delay-[${index * staggerDelay}ms]`;
  return `${baseAnimation} ${delay}`;
};

/**
 * Combine animation classes safely
 * @param {string[]} animationClasses - Array of animation class strings
 */
export const combineAnimations = (...animationClasses) => {
  return animationClasses.filter(Boolean).join(" ");
};

/**
 * Intersection Observer hook for scroll-triggered animations
 * @param {Object} options - Observer options
 */
export const useScrollAnimation = (options = {}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [ref, setRef] = React.useState(null);

  React.useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(ref);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
        ...options,
      }
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options]);

  return [setRef, isVisible];
};

/**
 * Prebuilt component animation combinations
 */
export const componentAnimations = {
  // Modal animations
  modalBackdrop: "animate-fade-in",
  modalContent: "animate-scale-in",

  // Dropdown animations
  dropdownEnter: "animate-slide-down origin-top",
  dropdownExit: "animate-fade-out",

  // Toast animations
  toastEnter: "animate-slide-up",
  toastExit: "animate-slide-down",

  // Page transitions
  pageEnter: "animate-fade-in animate-slide-up",
  pageExit: "animate-fade-out",

  // Form animations
  formFieldFocus: "transition-all duration-200 ease-out",
  formError: "animate-shake",
  formSuccess: "animate-pulse-once",

  // Button states
  buttonLoading: "animate-pulse pointer-events-none",
  buttonSuccess: "animate-pulse-once bg-green-500",
  buttonError: "animate-shake",
};

/**
 * Animation timing functions for complex sequences
 */
export const sequences = {
  // Loading sequence
  loadingDots: {
    dot1: "animate-bounce delay-0",
    dot2: "animate-bounce delay-75",
    dot3: "animate-bounce delay-150",
  },

  // Staggered list entry
  listEntry: (index) => ({
    base: "animate-slide-up opacity-0",
    delay: `delay-[${index * 100}ms]`,
    fill: "fill-mode-forwards",
  }),
};

const animationUtils = {
  animations,
  staggerDelays,
  performantAnimations,
  durations,
  easings,
  createStaggeredAnimation,
  combineAnimations,
  useScrollAnimation,
  componentAnimations,
  sequences,
};

export default animationUtils;
