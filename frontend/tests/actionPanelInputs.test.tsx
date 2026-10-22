// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App as AntApp } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CaseDetail } from '../src/api'

const takeAction = vi.fn()
vi.mock('../src/supabaseClient', () => ({ auth: null, authConfigError: null }))
vi.mock('../src/api', async (original) => ({
  ...(await original<typeof import('../src/api')>()),
  api: { takeAction: (...args: unknown[]) => takeAction(...args) },
}))

const { ActionPanel } = await import('../src/components/ActionPanel')

const line = (id: number, name: string) => ({
  id,
  item_id: id,
  item_name: name,
  batch_id: null,
  batch_no: null,
  expiry_date: null,
  location_id: null,
  location_name: null,
  qty_requested: '10',
  qty_approved: null,
})

const DETAIL: CaseDetail = {
  id: 9,
  flow: 2,
  node: 'f2_unused',
  node_label: 'Unused or excess ward stock?',
  title: 'Indent',
  closed: false,
  parent_case_id: null,
  created_at: '',
  updated_at: '',
  data: { issued: { '1': [{ batch_id: 5, qty: '8' }], '2': [{ batch_id: 6, qty: '10' }] } },
  lines: [line(1, 'Heparin'), line(2, 'Saline')],
  events: [],
  actions: [{ id: 'ret', from: 'f2_unused', to: 'f2_return_slip', outcome: 'Yes', approval: false, reason: false, inputs: ['return_qty'] }],
  child_case_ids: [],
}

afterEach(() => {
  cleanup()
  takeAction.mockReset()
})

describe('quantity dialogs (feature 004 rehearsal defects D2, D3)', () => {
  it('labels returns with the issued quantity and leaves blank fields out', async () => {
    takeAction.mockResolvedValue(DETAIL)
    render(
      <AntApp>
        <ActionPanel detail={DETAIL} targetLabel={(n) => n} items={[]} locations={[]} vendors={[]} onDone={() => {}} />
      </AntApp>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByLabelText(/Returned: Heparin \(issued 8\)/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Returned: Saline/), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await vi.waitFor(() => expect(takeAction).toHaveBeenCalled())
    expect(takeAction.mock.calls[0][1].input).toEqual({ return_qty: { '2': '3' } })
  })
})
