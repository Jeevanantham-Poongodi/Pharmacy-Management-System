// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DemoTour } from '../src/components/DemoTour'

function renderTour() {
  return render(
    <MemoryRouter>
      <DemoTour />
    </MemoryRouter>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('DemoTour (feature 003, FR-001, FR-002)', () => {
  it('links one step per flow, in flow order, filtered to a step', () => {
    renderTour()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/flows/procurement?node=f1_qc',
      '/flows/ward-indent?node=f2_review',
      '/flows/dispensing?node=f3_order',
      '/flows/expiry?node=f4_writeoff',
      '/flows/recall?node=f5_dispensed',
    ])
  })

  it('stays hidden after a remount until shown again', () => {
    renderTour()
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
    cleanup()
    renderTour()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /Show demo tour/ }))
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })
})
