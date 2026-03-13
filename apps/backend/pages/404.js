/**
 * Pages Router 404. Renders when /404 is requested (e.g. static export).
 * App Router not-found.tsx handles 404 for in-app navigation.
 */
export default function Custom404() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h1>404</h1>
      <p>Page not found.</p>
    </div>
  );
}
