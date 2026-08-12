export function EmailVerificationBanner({
  email,
  sending,
  onResend,
  onLogout,
}: {
  email?: string
  sending: boolean
  onResend: () => void
  onLogout: () => void
}) {
  return (
    <div className="subscription-wall">
      <section className="panel subscription-panel">
        <h2>Verify your email</h2>
        <p>
          We sent a verification link to <strong>{email || 'your inbox'}</strong>. Confirm it to unlock
          inventory, sales, and reports.
        </p>
        <button className="btn primary" disabled={sending} onClick={onResend}>
          {sending ? 'Sending…' : 'Resend verification email'}
        </button>
        <button className="btn ghost" onClick={onLogout}>
          Sign out
        </button>
      </section>
    </div>
  )
}
