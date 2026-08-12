export async function downloadWithToken(
  path: string,
  filename: string,
  token: string | null,
  accept = 'application/pdf',
) {
  if (!token) return

  const response = await fetch(`/api/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
    },
  })

  if (!response.ok) {
    throw new Error('Download failed.')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
