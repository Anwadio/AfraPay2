/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
// Performance monitoring utilities for React components
import React, { useEffect, useRef } from "react";

/**
 * Performance monitoring hook
 * @param {string} componentName - Name of the component to monitor
 * @param {Array} dependencies - Dependencies to watch for re-renders
 */
export const usePerformanceMonitor = (componentName, dependencies = []) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = Date.now() - startTime.current;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Performance] ${componentName} rendered ${renderCount.current} times in ${renderTime}ms`
      );
    }

    startTime.current = Date.now();
  }, dependencies);

  return { renderCount: renderCount.current };
};

/**
 * Debounce hook for expensive operations
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} dependencies - Dependencies array
 */
export const useDebounce = (callback, delay, dependencies) => {
  const timeoutRef = useRef();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(callback, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [...dependencies, delay]);
};

/**
 * Memory usage monitoring
 */
export const useMemoryMonitor = (componentName) => {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      window.performance &&
      window.performance.memory
    ) {
      const memory = window.performance.memory;
      console.log(`[Memory] ${componentName}:`, {
        used: (memory.usedJSHeapSize / 1048576).toFixed(2) + "MB",
        total: (memory.totalJSHeapSize / 1048576).toFixed(2) + "MB",
        limit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + "MB",
      });
    }
  }, [componentName]);
};

/**
 * Bundle size analyzer utility
 */
export const bundleAnalyzer = {
  measureComponentSize: (componentName, component) => {
    if (process.env.NODE_ENV === "development") {
      const componentString = component.toString();
      const sizeInBytes = new Blob([componentString]).size;
      console.log(`[Bundle] ${componentName} size: ${sizeInBytes} bytes`);
    }
  },
};

/**
 * Lazy loading wrapper with performance tracking
 */
export const createLazyComponent = (importFunc, componentName) => {
  const LazyComponent = React.lazy(() => {
    const start = performance.now();
    return importFunc().then((module) => {
      const loadTime = performance.now() - start;
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Lazy Load] ${componentName} loaded in ${loadTime.toFixed(2)}ms`
        );
      }
      return module;
    });
  });

  LazyComponent.displayName = `Lazy(${componentName})`;
  return LazyComponent;
};
