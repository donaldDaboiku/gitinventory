import type { FormEvent } from 'react'
import { Field } from '../forms/Field'
import { Toast } from '../ui'
import type { AuthMode } from '../../types'

export function AuthPage({
  authMode,
  setAuthMode,
  loading,
  toast,
  onSubmit,
}: {
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  loading: boolean
  toast: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
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
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            required
          />
          {authMode === 'register' && (
            <Field
              label="Confirm password"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
            />
          )}
          <button className="btn primary" disabled={loading}>
            {loading ? 'Please wait' : authMode === 'login' ? 'Sign in' : 'Start trial'}
          </button>
        </form>
      </section>
      <Toast message={toast} />
    </main>
  )
}
