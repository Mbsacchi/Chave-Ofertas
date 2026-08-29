import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal, drawer, or bottom sheet is open.
 * Prevents background jitter and scrolling behind active overlays on mobile devices.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    // Save previous styles
    const originalStyleOverflow = document.body.style.overflow;
    const originalStyleTouchAction = document.body.style.touchAction;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift on desktop
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Lock scrolling on body and html
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalStyleOverflow;
      document.body.style.touchAction = originalStyleTouchAction;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}
