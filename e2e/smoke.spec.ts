import { test, expect } from '@playwright/test'

test('home page has title', async ({ page }) => {
    await page.goto('/')
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Mise/)
})

test('login page is accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible()
})
