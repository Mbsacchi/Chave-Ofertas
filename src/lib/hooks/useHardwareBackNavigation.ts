import { useEffect, useRef } from 'react';

interface HardwareBackNavigationProps {
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  isMobileFilterOpen: boolean;
  onCloseMobileFilter: () => void;
  comparingProduct: unknown | null;
  onCloseComparingProduct: () => void;
  alertProduct: unknown | null;
  onCloseAlertProduct: () => void;
  showAuthModal: boolean;
  onCloseAuthModal: () => void;
  activeTab: 'all' | 'coupons' | 'favorites';
  onResetTab: () => void;
}

/**
 * Custom hook to intercept mobile hardware back button and browser popstate events.
 * Ensures that pressing the physical back button or browser back reverts active modals/drawers
 * in LIFO order before attempting to navigate away from the home page.
 */
export function useHardwareBackNavigation({
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  isMobileFilterOpen,
  onCloseMobileFilter,
  comparingProduct,
  onCloseComparingProduct,
  alertProduct,
  onCloseAlertProduct,
  showAuthModal,
  onCloseAuthModal,
  activeTab,
  onResetTab,
}: HardwareBackNavigationProps): void {
  const isHandlingPopState = useRef(false);
  const pushedStateCount = useRef(0);

  // Compute if any overlay is active
  const hasActiveOverlay =
    isMobileDrawerOpen ||
    isMobileFilterOpen ||
    Boolean(comparingProduct) ||
    Boolean(alertProduct) ||
    showAuthModal ||
    activeTab !== 'all';

  // Store latest handlers in refs to avoid stale closures in event listener
  const handlersRef = useRef({
    isMobileDrawerOpen,
    onCloseMobileDrawer,
    isMobileFilterOpen,
    onCloseMobileFilter,
    comparingProduct,
    onCloseComparingProduct,
    alertProduct,
    onCloseAlertProduct,
    showAuthModal,
    onCloseAuthModal,
    activeTab,
    onResetTab,
  });

  useEffect(() => {
    handlersRef.current = {
      isMobileDrawerOpen,
      onCloseMobileDrawer,
      isMobileFilterOpen,
      onCloseMobileFilter,
      comparingProduct,
      onCloseComparingProduct,
      alertProduct,
      onCloseAlertProduct,
      showAuthModal,
      onCloseAuthModal,
      activeTab,
      onResetTab,
    };
  });

  // Whenever a modal or drawer opens, push a history entry if not already pushed for this state
  useEffect(() => {
    if (hasActiveOverlay) {
      if (pushedStateCount.current === 0) {
        window.history.pushState({ chaveModalActive: true }, '');
        pushedStateCount.current = 1;
      }
    } else {
      if (pushedStateCount.current > 0 && !isHandlingPopState.current) {
        pushedStateCount.current = 0;
      }
    }
  }, [hasActiveOverlay]);

  useEffect(() => {
    const handlePopState = () => {
      isHandlingPopState.current = true;
      const h = handlersRef.current;

      // Close overlays in LIFO priority
      if (h.showAuthModal) {
        h.onCloseAuthModal();
      } else if (h.alertProduct) {
        h.onCloseAlertProduct();
      } else if (h.comparingProduct) {
        h.onCloseComparingProduct();
      } else if (h.isMobileFilterOpen) {
        h.onCloseMobileFilter();
      } else if (h.isMobileDrawerOpen) {
        h.onCloseMobileDrawer();
      } else if (h.activeTab !== 'all') {
        h.onResetTab();
      }

      pushedStateCount.current = 0;
      setTimeout(() => {
        isHandlingPopState.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
