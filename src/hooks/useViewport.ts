import { useState, useEffect } from 'react';

export type ViewportSize = 'full' | 'compact' | 'unsupported';

export function useViewport(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(getInitialSize);
  
  useEffect(() => {
    function handleResize() {
      setSize(getViewportSize);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return size;
}

function getInitialSize(): ViewportSize {
  if (typeof window === 'undefined') return 'full';
  const width = window.innerWidth;
  if (width < 768) return 'unsupported';
  if (width < 1440) return 'compact';
  return 'full';
}

function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') return 'full';
  const width = window.innerWidth;
  if (width < 768) return 'unsupported';
  if (width < 1440) return 'compact';
  return 'full';
}
