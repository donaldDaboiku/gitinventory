import { expect, type Page } from '@playwright/test'

export const DEMO_EMAIL = 'demo@gitinventory.test'
export const DEMO_PASSWORD = 'Password1'

export async function signInAsDemo(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.locator('input[name="email"]').fill(DEMO_EMAIL)
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD)
  await page.locator('form.form-grid').getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({
    timeout: 20_000,
  })
}
