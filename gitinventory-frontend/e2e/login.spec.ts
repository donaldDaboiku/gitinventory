import { expect, test } from '@playwright/test'
import { signInAsDemo } from './helpers'

test('owner can sign in from the landing page', async ({ page }) => {
  await signInAsDemo(page)
  await expect(page.getByText('Today revenue')).toBeVisible()
})
