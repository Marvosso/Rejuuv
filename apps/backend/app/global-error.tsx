'use client';

/**
 * Global error boundary. Must define its own <html> and <body> (replaces root layout).
 * Kept minimal to avoid prerender issues (e.g. useContext null during static export).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <button type="button" onClick={() => reset()} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
