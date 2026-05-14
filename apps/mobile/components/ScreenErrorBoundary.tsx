import type { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/** In-flow error boundary: light surface, calm copy (charts, Web flows, AI blocks). */
export function ScreenErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary surface="screen">{children}</ErrorBoundary>;
}
