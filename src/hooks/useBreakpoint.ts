import { useWindowDimensions } from 'react-native';
import { breakpoints } from '@/theme';

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const isMobile = width < breakpoints.tablet;
  const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isDesktop = width >= breakpoints.desktop;
  return { width, height, isMobile, isTablet, isDesktop, isWide: width >= breakpoints.wide };
}

/** Pick a value by breakpoint: [mobile, tablet, desktop]. */
export function useResponsive<T>(mobile: T, tablet: T, desktop: T): T {
  const { isMobile, isTablet } = useBreakpoint();
  return isMobile ? mobile : isTablet ? tablet : desktop;
}
