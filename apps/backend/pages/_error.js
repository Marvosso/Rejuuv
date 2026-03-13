/**
 * Pages Router _error. Used when Next prerenders /_error for 404/500.
 * Keeps Html inside _document so prerender does not throw.
 */
function Error({ statusCode }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h1>{statusCode ?? 'Error'}</h1>
      <p>{statusCode === 404 ? 'Page not found.' : 'Something went wrong.'}</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
