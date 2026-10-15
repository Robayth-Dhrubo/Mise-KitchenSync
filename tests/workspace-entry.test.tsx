import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import RootPage from '../src/app/page'

const auth = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock('@/app/chatgpt-auth', () => ({
  getChatGPTUser: auth.getUser,
  chatGPTSignInPath: () => '/signin-with-chatgpt?return_to=%2F',
}))
vi.mock('@/components/workspace/workspace', () => ({
  default: ({ displayName }: { displayName: string }) => <div data-testid="private-kitchen">{displayName}</div>,
}))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Workspace entry', () => {
  it('offers a top-level sign-in link without loading a private kitchen for an anonymous request', async () => {
    auth.getUser.mockResolvedValue(null)
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    render(await RootPage())
    const signIn = screen.getByRole('link', { name: 'Sign in' })
    expect(signIn.getAttribute('href')).toBe('/signin-with-chatgpt?return_to=%2F')
    expect(signIn.getAttribute('target')).toBe('_top')
    expect(screen.queryByTestId('private-kitchen')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('opens the owner workspace when the platform supplies an authenticated identity', async () => {
    auth.getUser.mockResolvedValue({ userId: 'owner', displayName: 'Kitchen Owner', email: 'owner@example.invalid', fullName: null })
    render(await RootPage())
    expect(screen.getByTestId('private-kitchen').textContent).toBe('Kitchen Owner')
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
  })
})
