export function Textarea({
  label,
  name,
  required,
  defaultValue,
}: {
  label: string
  name: string
  required?: boolean
  defaultValue?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea className="input textarea" name={name} required={required} defaultValue={defaultValue} />
    </label>
  )
}
