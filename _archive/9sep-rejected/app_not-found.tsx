export default function NotFound() {
  return (
    <main id="main">
      <div className="wrap" style={{ padding: "6rem 0" }}>
        <h1>Page not found</h1>
        <p>This location is not part of the validated dataset.</p>
        <p><a className="link" href="/locations/">View all locations</a></p>
      </div>
    </main>
  );
}
