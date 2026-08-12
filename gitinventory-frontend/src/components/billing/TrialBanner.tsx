export function TrialBanner({ daysLeft, onManage }: { daysLeft: number; onManage: () => void }) {
  if (daysLeft <= 0) return null

  return (
    <div className="trial-banner">
      <span>
        Trial: <strong>{daysLeft}</strong> day{daysLeft === 1 ? '' : 's'} left
      </span>
      <button className="btn ghost" type="button" onClick={onManage}>
        Manage plan
      </button>
    </div>
  )
}
