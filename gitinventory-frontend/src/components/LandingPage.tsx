type LandingPageProps = {
  onSignIn: () => void
  onStartTrial: () => void
}

export function LandingPage({ onSignIn, onStartTrial }: LandingPageProps) {
  return (
    <div className="landing">
      <section className="landing-hero" aria-label="GITInventory">
        <div className="landing-hero-media" aria-hidden="true" />
        <div className="landing-hero-scrim" aria-hidden="true" />

        <div className="landing-hero-content">
          <p className="landing-brand landing-rise">GITInventory</p>
          <h1 className="landing-headline landing-rise landing-rise-delay-1">
            Stock, sales, and receiving from one live desk.
          </h1>
          <p className="landing-lede landing-rise landing-rise-delay-2">
            Multi-tenant inventory for small businesses — products, POS scanning, purchases, and
            reports without leaving the workflow.
          </p>
          <div className="landing-cta landing-rise landing-rise-delay-3">
            <button className="landing-btn landing-btn-primary" type="button" onClick={onStartTrial}>
              Start free trial
            </button>
            <button className="landing-btn landing-btn-secondary" type="button" onClick={onSignIn}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">Built for the counter, not a spreadsheet.</h2>
        <p className="landing-section-copy">
          Track catalog and barcodes, record stock movement, ring up sales with USB scanners, and
          export financial reports — with roles, trials, and billing ready for your team.
        </p>
      </section>
    </div>
  )
}
