import type { InputHTMLAttributes } from 'react'

export function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" {...inputProps} />
    </label>
  )
}
