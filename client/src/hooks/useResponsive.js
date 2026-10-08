// client/src/hooks/useResponsive.js
import { useState, useEffect } from "react";

export function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    let timeoutId = null;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 60);
    };

    window.addEventListener("resize", handleResize);
    // Trigger once on mount
    handleResize();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isMobile = dimensions.width < 768;
  const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
  const isDesktop = dimensions.width >= 1024;

  return {
    width: dimensions.width,
    height: dimensions.height,
    isMobile,
    isTablet,
    isDesktop,
  };
}
