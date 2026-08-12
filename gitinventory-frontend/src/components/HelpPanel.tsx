import { PanelTitle } from './ui'

const topics = [
  {
    title: 'Getting started',
    body: 'Sign in with your email and password. New businesses can start a 14-day trial from Create account.',
  },
  {
    title: 'Products & barcodes',
    body: 'Add products under Products → New product. SKU and barcode auto-generate if left blank. Use Label or Label PDF to print shelf tags.',
  },
  {
    title: 'Sales & POS scanning',
    body: 'Sales → New sale. Scan barcodes in the Scan barcode field (USB scanners work as keyboard input). Click a sale row for details and Download receipt.',
  },
  {
    title: 'Stock',
    body: 'Use Stock → Record stock for stock in, stock out, or adjustments. Low-stock items appear in alerts on the Stock page.',
  },
  {
    title: 'Reports',
    body: 'Reports → pick a date range → Generate. Export CSV or PDF when your role allows.',
  },
  {
    title: 'Team & roles',
    body: 'Owners manage team members under Settings → Team. Roles control which pages each user can access.',
  },
  {
    title: 'Subscription',
    body: 'Settings → Plan shows trial and paid status. Owners can upgrade via Paystack when billing is configured.',
  },
  {
    title: 'Password reset',
    body: 'On the sign-in screen, use Forgot password? Enter your email and follow the link in the message.',
  },
]

export function HelpPanel() {
  return (
    <section className="panel">
      <PanelTitle title="Help & quick guide" note="Common tasks in GITInventory" />
      <div className="help-grid">
        {topics.map((topic) => (
          <article className="help-card" key={topic.title}>
            <h3>{topic.title}</h3>
            <p>{topic.body}</p>
          </article>
        ))}
      </div>
      <p className="tiny code-help">
        Full documentation: see <strong>docs/USER_MANUAL.md</strong> in the project repository.
      </p>
    </section>
  )
}
