export default function NotFound() {
  return (
    <main id="main" className="tpl-hub">
      <section className="section">
        <div className="wrap" style={{ display: 'block', maxWidth: 720 }}>
          <p className="eyebrow">404</p>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-.02em', margin: '12px 0 16px' }}>We can’t find that page.</h1>
          <p className="lede">The location or service you were looking for isn’t published. Try the <a className="link" href="/locations/">locations directory</a>.</p>
        </div>
      </section>
    </main>
  );
}
