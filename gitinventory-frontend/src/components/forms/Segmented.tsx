export function Segmented<T extends string>({
  value,
  setValue,
  options,
}: {
  value: T
  setValue: (value: T) => void
  options: Array<[T, string]>
}) {
  return (
    <div className="segmented">
      {options.map(([key, label]) => (
        <button
          className={value === key ? 'active' : ''}
          key={key}
          type="button"
          onClick={() => setValue(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
