import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Minimal Pages Router _document. Required so Next.js can prerender /404 and /_error
 * without throwing "Html should not be imported outside of pages/_document".
 * App Router (app/) is the primary UI; this only satisfies the static export step.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
