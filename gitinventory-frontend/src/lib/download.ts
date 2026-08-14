export async function downloadWithSession(
  path: string,
  filename: string,
  accept = 'application/pdf',
) {
  const response = await fetch(`/api/${path}`, {
    credentials: 'include',
    headers: {
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
