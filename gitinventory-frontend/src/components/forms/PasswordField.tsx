import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'

export function PasswordField({
  label,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-field">
        <input className="input" type={visible ? 'text' : 'password'} {...inputProps} />
        <button
          className="btn ghost password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  )
}
