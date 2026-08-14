import { expect, test } from '@playwright/test'
import { signInAsDemo } from './helpers'

test('owner can import a CSV product and complete a POS sale', async ({ page }) => {
  const name = `E2E Widget ${Date.now()}`
  const csv = [
    'name,unit,cost_price,selling_price,quantity,sku',
    `${name},piece,80,150,10,E2E-${Date.now()}`,
  ].join('\n')

  await signInAsDemo(page)

  await page.locator('.nav-button', { hasText: 'Products' }).click()
  await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible()
  await expect(page.getByText('Upload CSV')).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'products.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  })

  await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 60_000 })

  await page.locator('.nav-button', { hasText: 'Sales' }).click()
  await page.getByRole('button', { name: 'Open POS' }).click()
  await expect(page.getByRole('heading', { name: 'POS', level: 1 })).toBeVisible()

  await page.locator('[data-line] select[name="product_id"]').selectOption({ label: name })
  await page.locator('[data-line] input[name="unit_price"]').fill('150')
  await page.locator('input[name="amount_paid"]').fill('150')
  await page.getByRole('button', { name: 'Save sale' }).click()

  await expect(page.getByText('Sale saved.')).toBeVisible({ timeout: 20_000 })
})
