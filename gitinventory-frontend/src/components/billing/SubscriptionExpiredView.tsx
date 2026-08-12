import type { BillingPlan } from '../../types'
import type { MoneyFormatter } from '../../lib/format'

export function SubscriptionExpiredView({
  plans,
  money,
  canUpgrade,
  upgrading,
  onUpgrade,
  onOpenSettings,
  onLogout,
}: {
  plans: BillingPlan[]
  money: MoneyFormatter
  canUpgrade: boolean
  upgrading: boolean
  onUpgrade: (planId: string) => void
  onOpenSettings: () => void
  onLogout: () => void
}) {
  return (
    <div className="subscription-wall">
      <section className="panel subscription-panel">
        <h2>Your trial has ended</h2>
        <p>Upgrade to keep using inventory, sales, purchases, and reports.</p>

        {canUpgrade ? (
          <div className="plan-grid">
            {plans.map((plan) => (
              <article className="plan-card" key={plan.id}>
                <h3>{plan.name}</h3>
                <strong>{money(plan.amount / 100)}</strong>
                <span className="tiny">per {plan.interval_days} days</span>
                <p className="tiny">{plan.description}</p>
                <button className="btn primary" disabled={upgrading} onClick={() => onUpgrade(plan.id)}>
                  {upgrading ? 'Starting checkout…' : `Choose ${plan.name}`}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="tiny">Ask your workspace owner to upgrade the plan.</p>
        )}

        <button className="btn ghost" onClick={onOpenSettings}>
          Open plan settings
        </button>
        <button className="btn ghost" onClick={onLogout}>
          Sign out
        </button>
      </section>
    </div>
  )
}
