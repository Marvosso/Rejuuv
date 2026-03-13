/**
 * Minimal Pages Router _app. Needed when _document exists so /404 and /_error prerender.
 * App Router handles all real routes; this is only for the fallback error/404 shell.
 */
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
