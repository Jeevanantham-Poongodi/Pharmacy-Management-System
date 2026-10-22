// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App as AntApp } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '../src/api'

const setItemActive = vi.fn()
vi.mock('../src/supabaseClient', () => ({ auth: null, authConfigError: null }))
vi.mock('../src/api', async (original) => ({
  ...(await original<typeof import('../src/api')>()),
  api: { setItemActive: (...args: unknown[]) => setItemActive(...args) },
}))

const { ReasonDialog } = await import('../src/pages/Items')

const ITEM: Item = {
  id: 7,
  name: 'Paracetamol 500 mg tablet',
  base_unit: 'tablet',
  formulary_status: 'formulary',
  controlled_class: 'none',
  active: true,
  created_at: '',
  updated_at: '',
}

afterEach(() => {
  cleanup()
  setItemActive.mockReset()
})

function renderDialog(onClose = vi.fn(), onDone = vi.fn()) {
  render(
    <AntApp>
      <ReasonDialog item={ITEM} onClose={onClose} onDone={onDone} />
    </AntApp>,
  )
  return { onClose, onDone }
}

describe('item reason dialog (feature 003, FR-004)', () => {
  it('needs a reason before it can be confirmed', () => {
    renderDialog()
    const confirm = screen.getByRole('button', { name: 'Deactivate' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Discontinued by supplier' } })
    expect(confirm.disabled).toBe(false)
  })

  it('sends the reason on confirm', async () => {
    setItemActive.mockResolvedValue({ ...ITEM, active: false })
    const { onDone } = renderDialog()
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Discontinued' } })
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(setItemActive).toHaveBeenCalledWith(7, false, 'Discontinued')
  })

  it('cancel sends nothing', () => {
    const { onClose } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(setItemActive).not.toHaveBeenCalled()
  })
})
