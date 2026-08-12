import type { FormEvent } from 'react'
import { Field } from '../forms/Field'
import { PasswordField } from '../forms/PasswordField'
import { Toast } from '../ui'
import type { AuthMode } from '../../types'

export function AuthPage({
  authMode,
  setAuthMode,
  loading,
  toast,
  resetEmail,
  onSubmit,
  onForgotPassword,
  onResetPassword,
  onBackToLanding,
}: {
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  loading: boolean
  toast: string
  resetEmail?: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onForgotPassword: (event: FormEvent<HTMLFormElement>) => void
  onResetPassword: (event: FormEvent<HTMLFormElement>) => void
  onBackToLanding?: () => void
}) {
  if (authMode === 'forgot') {
    return (
      <main className="auth-page">
        <section className="auth-visual">
          <div className="brand">
            <div className="brand-mark">GI</div>
            <div>
              <div className="brand-name">GITInventory</div>
              <div className="brand-meta">Inventory, sales, and receiving</div>
            </div>
          </div>
        </section>
        <section className="auth-panel">
          <h2>Reset your password</h2>
          <p className="tiny">We will email you a link to choose a new password.</p>
          <form className="form-grid" onSubmit={onForgotPassword}>
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <button className="btn primary" disabled={loading}>
              {loading ? 'Please wait' : 'Send reset link'}
            </button>
            <button className="btn ghost" type="button" onClick={() => setAuthMode('login')}>
              Back to sign in
            </button>
          </form>
        </section>
        <Toast message={toast} />
      </main>
    )
  }

  if (authMode === 'reset') {
    return (
      <main className="auth-page">
        <section className="auth-visual">
          <div className="brand">
            <div className="brand-mark">GI</div>
            <div>
              <div className="brand-name">GITInventory</div>
              <div className="brand-meta">Choose a new password</div>
            </div>
          </div>
        </section>
        <section className="auth-panel">
          <h2>Set new password</h2>
          <form className="form-grid" onSubmit={onResetPassword}>
            <input type="hidden" name="email" value={resetEmail ?? ''} />
            <PasswordField label="New password" name="password" autoComplete="new-password" required />
            <PasswordField
              label="Confirm password"
              name="password_confirmation"
              autoComplete="new-password"
              required
            />
            <button className="btn primary" disabled={loading}>
              {loading ? 'Please wait' : 'Update password'}
            </button>
            <button className="btn ghost" type="button" onClick={() => setAuthMode('login')}>
              Back to sign in
            </button>
          </form>
        </section>
        <Toast message={toast} />
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="brand">
          <div className="brand-mark">GI</div>
          <div>
            <div className="brand-name">GITInventory</div>
            <div className="brand-meta">Inventory, sales, and receiving</div>
          </div>
        </div>
        <div>
          <h1>Run stock, sales, and purchasing from one live desk.</h1>
          <p>
            Track products, low stock, payments, suppliers, branches, and daily movement without
            leaving the workflow.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs">
          <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
            Sign in
          </button>
          <button
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => setAuthMode('register')}
          >
            Create account
          </button>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          {authMode === 'register' && (
            <>
              <Field label="Business name" name="business_name" required />
              <Field label="Your name" name="name" autoComplete="name" required />
            </>
          )}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          {authMode === 'register' && <Field label="Phone" name="phone" autoComplete="tel" />}
          <PasswordField
            label="Password"
            name="password"
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            required
          />
          {authMode === 'register' && (
            <PasswordField
              label="Confirm password"
              name="password_confirmation"
              autoComplete="new-password"
              required
            />
          )}
          {authMode === 'login' && (
            <button className="btn ghost align-left" type="button" onClick={() => setAuthMode('forgot')}>
              Forgot password?
            </button>
          )}
          <button className="btn primary" disabled={loading}>
            {loading ? 'Please wait' : authMode === 'login' ? 'Sign in' : 'Start trial'}
          </button>
          {onBackToLanding && (
            <button className="btn ghost" type="button" onClick={onBackToLanding}>
              Back to home
            </button>
          )}
        </form>
      </section>
      <Toast message={toast} />
    </main>
  )
}
