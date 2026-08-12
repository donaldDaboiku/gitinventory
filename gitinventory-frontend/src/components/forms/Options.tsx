export function Options<T extends { id: number; name: string }>({
  rows,
  placeholder,
}: {
  rows: T[]
  placeholder: string
}) {
  return (
    <>
      <option value="">{placeholder}</option>
      {rows.map((row) => (
        <option value={row.id} key={row.id}>
          {row.name}
        </option>
      ))}
    </>
  )
}
