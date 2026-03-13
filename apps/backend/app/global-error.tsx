'use client';

/**
 * Global error boundary. Must define its own <html> and <body> (replaces root layout).
 * Minimal static content only to avoid prerender useContext null (Next.js internal).
 */
export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
      </body>
    </html>
  );
}
