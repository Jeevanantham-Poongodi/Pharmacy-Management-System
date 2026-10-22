import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { App as AntApp } from 'antd'
import { api, describeError, type CaseCreate, type CaseDetail } from '../../api'
import { IndentForm } from './IndentForm'
import { MedicationOrderForm } from './MedicationOrderForm'
import { RecallForm } from './RecallForm'
import { RequisitionForm } from './RequisitionForm'

// Each flow's start step asks for different details; the form returns the CaseCreate body, or
// null while something required is missing.

export type FormProps = { onChange: (body: CaseCreate | null) => void }

const FORMS: Record<number, { title: string; Form: (p: FormProps) => React.JSX.Element }> = {
  1: { title: 'New purchase requisition', Form: RequisitionForm },
  2: { title: 'New ward indent', Form: IndentForm },
  3: { title: 'New medication order', Form: MedicationOrderForm },
  5: { title: 'New recall', Form: RecallForm },
}

export function NewCaseDialog({ flow, onClose, onCreated }: { flow: number; onClose: () => void; onCreated: (c: CaseDetail) => void }) {
  const { message } = AntApp.useApp()
  const [body, setBody] = useState<CaseCreate | null>(null)
  const [busy, setBusy] = useState(false)
  const { title, Form } = FORMS[flow]

  async function create() {
    if (!body) return
    setBusy(true)
    try {
      const created = await api.createCase(body)
      message.success(`Case #${created.id} raised`)
      onCreated(created)
    } catch (error) {
      message.error(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Form onChange={setBody} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={!body || busy} onClick={() => void create()}>
          Raise
        </Button>
      </DialogActions>
    </Dialog>
  )
}
