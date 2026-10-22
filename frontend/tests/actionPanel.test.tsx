// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App as AntApp } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CaseDetail, FlowEdge } from '../src/api'
import { ActionPanel } from '../src/components/ActionPanel'
import { actionLabel } from '../src/components/actionLabel'

vi.mock('../src/supabaseClient', () => ({ auth: null, authConfigError: null }))

const edge = (over: Partial<FlowEdge>): FlowEdge => ({
  id: 'x',
  from: 'f2_review',
  to: 'f2_enough',
  outcome: null,
  approval: false,
  reason: false,
  inputs: [],
  ...over,
})

function detail(actions: FlowEdge[], closed = false): CaseDetail {
  return {
    id: 1,
    flow: 2,
    node: 'f2_review',
    node_label: 'Pharmacist reviews indent',
    title: 'Indent',
    closed,
    parent_case_id: null,
    created_at: '',
    updated_at: '',
    data: {},
    lines: [],
    events: [],
    actions,
    child_case_ids: [],
  }
}

const labels: Record<string, string> = { f2_enough: 'Enough stock in pharmacy?', f2_return_ward: 'Return to ward with reason' }
const targetLabel = (node: string) => labels[node] ?? node

function renderPanel(d: CaseDetail) {
  return render(
    <AntApp>
      <ActionPanel detail={d} targetLabel={targetLabel} items={[]} locations={[]} vendors={[]} onDone={() => {}} />
    </AntApp>,
  )
}

afterEach(cleanup)

describe('ActionPanel', () => {
  it('shows one button per outgoing arrow, labelled with the diagram outcome', () => {
    renderPanel(
      detail([
        edge({ id: 'a', outcome: 'Approved (full or partial)', approval: true }),
        edge({ id: 'r', outcome: 'Rejected', to: 'f2_return_ward', reason: true, approval: true }),
      ]),
    )
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Approved (full or partial) ✓',
      'Rejected ✓',
    ])
  })

  it('labels an unlabelled arrow with its target step', () => {
    expect(actionLabel(edge({ outcome: null }), targetLabel)).toBe('Continue: Enough stock in pharmacy?')
  })

  it('asks for a reason before a reason arrow can be confirmed', () => {
    renderPanel(detail([edge({ id: 'r', outcome: 'Rejected', to: 'f2_return_ward', reason: true })]))
    fireEvent.click(screen.getByRole('button', { name: 'Rejected' }))
    expect(screen.getByLabelText(/Reason \(required\)/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('offers nothing on a closed case', () => {
    renderPanel(detail([], true))
    expect(screen.getByText('This case is closed.')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
