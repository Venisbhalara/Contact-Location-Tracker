import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { lenisInstance } from "../hooks/useLenis";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Standard scroll reset
    window.scrollTo(0, 0);

    // Lenis scroll reset if instance exists
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { 
        lerp: 0.1, 
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) 
      });
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
