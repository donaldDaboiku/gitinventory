import { useState } from 'react'
import type { FormEvent } from 'react'
import { Empty, PanelTitle, SimpleTable } from './ui'
import { HelpPanel } from './HelpPanel'
import type { SettingsPayload, TeamUser, BillingPlan } from '../types'
import type { MoneyFormatter } from '../lib/format'

type SettingsTab = 'profile' | 'inventory' | 'team' | 'plan' | 'help' | 'audit'

const timezones = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Johannesburg',
  'Europe/London',
  'America/New_York',
  'UTC',
]

const currencies = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR']

export function SettingsView({
  settings,
  teamUsers,
  billingPlans,
  canEdit,
  canManageUsers,
  canUpgrade,
  canExportActivity,
  upgrading,
  money,
  initialTab = 'profile',
  onSaveSettings,
  onInviteUser,
  onUpdateUser,
  onUpgrade,
  onExportActivity,
}: {
  settings: SettingsPayload | null
  teamUsers: TeamUser[]
  billingPlans: BillingPlan[]
  canEdit: boolean
  canManageUsers: boolean
  canUpgrade: boolean
  canExportActivity: boolean
  upgrading: boolean
  money: MoneyFormatter
  initialTab?: SettingsTab
  onSaveSettings: (payload: Record<string, unknown>) => Promise<void>
  onInviteUser: (payload: Record<string, unknown>) => Promise<void>
  onUpdateUser: (userId: number, payload: Record<string, unknown>) => Promise<void>
  onUpgrade: (planId: string) => void
  onExportActivity: (from?: string, to?: string) => void
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [auditFrom, setAuditFrom] = useState('')
  const [auditTo, setAuditTo] = useState('')

  if (!settings) {
    return <Empty text="Loading settings…" />
  }

  const tenant = settings.tenant
  const prefs = settings.preferences

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onSaveSettings({
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone') || null,
      address: form.get('address') || null,
      city: form.get('city') || null,
      state: form.get('state') || null,
      country: form.get('country') || null,
      currency: form.get('currency'),
      timezone: form.get('timezone'),
    })
  }

  const submitInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onSaveSettings({
      preferences: {
        default_min_stock_level: Number(form.get('default_min_stock_level')),
        default_tax_rate: Number(form.get('default_tax_rate')),
        invoice_prefix: form.get('invoice_prefix'),
        allow_negative_stock: form.get('allow_negative_stock') === 'on',
      },
    })
  }

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onInviteUser({
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone') || null,
      role: form.get('role'),
      password: form.get('password'),
      password_confirmation: form.get('password_confirmation'),
    })
    event.currentTarget.reset()
  }

  return (
    <>
      <section className="panel compact">
        <div className="segmented">
          {(
            [
              ['profile', 'Business'],
              ['inventory', 'Inventory'],
              ['team', 'Team'],
              ['plan', 'Plan'],
              ['audit', 'Audit'],
              ['help', 'Help'],
            ] as Array<[SettingsTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'profile' && (
        <section className="panel">
          <PanelTitle title="Business profile" note="Company details shown across the workspace" />
          <form className="form-grid" onSubmit={submitProfile}>
            <Field label="Business name" name="name" defaultValue={tenant.name} disabled={!canEdit} required />
            <div className="form-grid two">
              <Field label="Email" name="email" type="email" defaultValue={tenant.email} disabled={!canEdit} required />
              <Field label="Phone" name="phone" defaultValue={tenant.phone ?? ''} disabled={!canEdit} />
            </div>
            <Field label="Address" name="address" defaultValue={tenant.address ?? ''} disabled={!canEdit} />
            <div className="form-grid two">
              <Field label="City" name="city" defaultValue={tenant.city ?? ''} disabled={!canEdit} />
              <Field label="State" name="state" defaultValue={tenant.state ?? ''} disabled={!canEdit} />
            </div>
            <div className="form-grid two">
              <Select label="Currency" name="currency" defaultValue={tenant.currency} disabled={!canEdit}>
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
              <Select label="Timezone" name="timezone" defaultValue={tenant.timezone} disabled={!canEdit}>
                {timezones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </div>
            <Field label="Country code" name="country" defaultValue={tenant.country ?? 'NG'} disabled={!canEdit} />
            {canEdit && <button className="btn primary">Save profile</button>}
          </form>
        </section>
      )}

      {tab === 'inventory' && (
        <section className="panel">
          <PanelTitle title="Inventory defaults" note="Defaults for new products and invoices" />
          <form className="form-grid" onSubmit={submitInventory}>
            <div className="form-grid two">
              <Field
                label="Default min stock"
                name="default_min_stock_level"
                type="number"
                min={0}
                defaultValue={prefs.default_min_stock_level}
                disabled={!canEdit}
              />
              <Field
                label="Default tax rate %"
                name="default_tax_rate"
                type="number"
                min={0}
                step="0.01"
                defaultValue={prefs.default_tax_rate}
                disabled={!canEdit}
              />
            </div>
            <Field
              label="Invoice prefix"
              name="invoice_prefix"
              defaultValue={prefs.invoice_prefix}
              disabled={!canEdit}
            />
            <label className="field checkbox">
              <input
                type="checkbox"
                name="allow_negative_stock"
                defaultChecked={prefs.allow_negative_stock}
                disabled={!canEdit}
              />
              <span>Allow negative stock (not recommended)</span>
            </label>
            {canEdit && <button className="btn primary">Save inventory settings</button>}
          </form>
        </section>
      )}

      {tab === 'team' && (
        <>
          {canManageUsers && (
            <section className="panel">
              <PanelTitle title="Invite team member" note="Create a login for staff with a role" />
              <form className="form-grid" onSubmit={submitInvite}>
                <Field label="Name" name="name" required />
                <div className="form-grid two">
                  <Field label="Email" name="email" type="email" required />
                  <Field label="Phone" name="phone" />
                </div>
                <Select label="Role" name="role" required>
                  {settings.assignable_roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll('_', ' ')}
                    </option>
                  ))}
                </Select>
                <div className="form-grid two">
                  <Field label="Password" name="password" type="password" required />
                  <Field label="Confirm password" name="password_confirmation" type="password" required />
                </div>
                <button className="btn primary">Invite user</button>
              </form>
            </section>
          )}

          <section className="panel">
            <PanelTitle title="Team members" note={`${teamUsers.length} users in this business`} />
            {!teamUsers.length ? (
              <Empty text="No team members yet." />
            ) : (
              <SimpleTable
                empty=""
                headers={['Name', 'Email', 'Role', 'Status', 'Actions']}
                rows={teamUsers.map((member) => [
                  member.name,
                  member.email,
                  member.roles[0] || '-',
                  member.is_active ? 'Active' : 'Inactive',
                  canManageUsers ? (
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() =>
                        void onUpdateUser(member.id, {
                          is_active: !member.is_active,
                        })
                      }
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  ) : (
                    '-'
                  ),
                ])}
              />
            )}
          </section>
        </>
      )}

      {tab === 'plan' && (
        <section className="panel">
          <PanelTitle title="Subscription" note="Your current plan and trial status" />
          <div className="metrics-grid">
            <div className="metric blue">
              <span>Plan</span>
              <strong>{tenant.subscription_plan || 'trial'}</strong>
            </div>
            <div className="metric green">
              <span>Trial</span>
              <strong>{tenant.on_trial ? 'Active' : 'Ended'}</strong>
              <small>{tenant.trial_ends_at ? String(tenant.trial_ends_at).slice(0, 10) : '—'}</small>
            </div>
            <div className="metric amber">
              <span>Paid subscription</span>
              <strong>{tenant.has_active_subscription ? 'Active' : 'None'}</strong>
            </div>
          </div>
          {canUpgrade && billingPlans.length > 0 && (
            <div className="plan-grid">
              {billingPlans.map((plan) => (
                <article className="plan-card" key={plan.id}>
                  <h3>{plan.name}</h3>
                  <strong>{money(plan.amount / 100)}</strong>
                  <span className="tiny">per {plan.interval_days} days</span>
                  <p className="tiny">{plan.description}</p>
                  <button className="btn primary" type="button" disabled={upgrading} onClick={() => onUpgrade(plan.id)}>
                    {upgrading ? 'Starting checkout…' : `Upgrade to ${plan.name}`}
                  </button>
                </article>
              ))}
            </div>
          )}
          {!canUpgrade && (
            <p className="tiny code-help">Only workspace owners can upgrade the subscription.</p>
          )}
        </section>
      )}

      {tab === 'audit' && (
        <section className="panel">
          <PanelTitle title="Activity log" note="Export recent workspace changes for compliance reviews" />
          {canExportActivity ? (
            <form
              className="form-grid two"
              onSubmit={(event) => {
                event.preventDefault()
                onExportActivity(auditFrom || undefined, auditTo || undefined)
              }}
            >
              <label className="field">
                <span>From</span>
                <input className="input" type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} />
              </label>
              <label className="field">
                <span>To</span>
                <input className="input" type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} />
              </label>
              <button className="btn primary" type="submit">
                Download CSV
              </button>
            </form>
          ) : (
            <p className="tiny">You do not have permission to export the activity log.</p>
          )}
        </section>
      )}

      {tab === 'help' && <HelpPanel />}
    </>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" {...inputProps} />
    </label>
  )
}

function Select({
  label,
  name,
  children,
  defaultValue,
  disabled,
  required,
}: {
  label: string
  name: string
  children: React.ReactNode
  defaultValue?: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="input" name={name} defaultValue={defaultValue} disabled={disabled} required={required}>
        {children}
      </select>
    </label>
  )
}
