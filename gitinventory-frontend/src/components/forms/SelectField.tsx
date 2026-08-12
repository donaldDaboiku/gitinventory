import type { ReactNode } from 'react'

export function SelectField({
  label,
  name,
  children,
  required,
  defaultValue,
}: {
  label: string
  name: string
  children: ReactNode
  required?: boolean
  defaultValue?: string | number
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="input" name={name} required={required} defaultValue={defaultValue ?? ''}>
        {children}
      </select>
    </label>
  )
}
