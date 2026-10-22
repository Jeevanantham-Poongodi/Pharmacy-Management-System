import { Timeline, Typography } from 'antd'
import type { CaseEvent } from '../api'

export function CaseHistory({ events, nodeLabel }: { events: CaseEvent[]; nodeLabel: (node: string) => string }) {
  return (
    <Timeline
      items={[...events].reverse().map((event) => ({
        key: event.id,
        color: event.from_node === null ? 'blue' : 'green',
        content: (
          <div>
            <Typography.Text strong>{nodeLabel(event.to_node)}</Typography.Text>
            {/* The outcome belongs to the step the case left, not the one it reached. */}
            {event.outcome && event.from_node && (
              <div>
                <Typography.Text type="secondary">
                  {nodeLabel(event.from_node)} → {event.outcome}
                </Typography.Text>
              </div>
            )}
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {event.actor_name} · {new Date(event.created_at).toLocaleString()}
              </Typography.Text>
            </div>
            {event.note && <Typography.Paragraph style={{ margin: '4px 0 0' }}>{event.note}</Typography.Paragraph>}
          </div>
        ),
      }))}
    />
  )
}
