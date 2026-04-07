import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import { CloseOutlined, EyeOutlined } from '@ant-design/icons'

import { apiFetch } from '@/lib/utils'
import { clearTrackedTask, getServerTrackedTask, getTrackedTask, type TrackedTaskMeta } from '@/lib/taskTracker'
import { SurfacePanel } from '@/components/SurfacePanel'
import { TaskLogPanel } from '@/components/TaskLogPanel'
import { useUi } from '@/lib/ui'

const { Text, Title } = Typography

interface TaskSnapshot {
  task_id?: string
  id?: string
  status?: string
  progress?: string
  logs?: string[]
  success?: number
  skipped?: number
  errors?: string[]
  control?: {
    active_attempts?: number
  }
}

type ThreadLaneStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped' | 'stopped'

interface ThreadLane {
  slot: number
  status: ThreadLaneStatus
  accountIndex?: number
  total?: number
  proxy?: string
  detail?: string
}

type AccountHeatStatus = 'idle' | 'running' | 'registered' | 'success' | 'failed' | 'skipped'

interface AccountHeatCell {
  index: number
  status: AccountHeatStatus
  email?: string
  proxy?: string
  detail?: string
}

function statusColor(status?: string) {
  switch (status) {
    case 'done':
      return 'success'
    case 'failed':
      return 'error'
    case 'stopped':
      return 'warning'
    default:
      return 'processing'
  }
}

function normalizeMessage(line: string) {
  return line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
}

function buildThreadLanes(snapshot: TaskSnapshot | null, trackedTask: TrackedTaskMeta | null): ThreadLane[] {
  const explicitConcurrency = Number(trackedTask?.concurrency || 0)
  const activeAttempts = Number(snapshot?.control?.active_attempts || 0)
  const concurrency = Math.max(explicitConcurrency, activeAttempts, 1)
  const lanes: ThreadLane[] = Array.from({ length: concurrency }, (_, index) => ({
    slot: index + 1,
    status: 'idle',
  }))
  const activeQueue: number[] = []
  let lastStartedSlot = -1

  const totalFromProgress = Number(String(snapshot?.progress || '').split('/')[1] || 0)
  const fallbackTotal = Number(trackedTask?.count || totalFromProgress || 0)
  const logs = Array.isArray(snapshot?.logs) ? snapshot!.logs! : []

  const markOutcome = (status: ThreadLaneStatus, detail: string) => {
    const slotIndex = activeQueue.length > 0 ? activeQueue.shift()! : lanes.findIndex((lane) => lane.status === 'running')
    if (slotIndex < 0) return
    lanes[slotIndex] = {
      ...lanes[slotIndex],
      status,
      detail,
    }
  }

  for (const rawLine of logs) {
    const line = normalizeMessage(rawLine)
    const startMatch = line.match(/开始注册第\s+(\d+)\/(\d+)\s+个账号/)
    if (startMatch) {
      const accountIndex = Number(startMatch[1])
      const total = Number(startMatch[2]) || fallbackTotal
      let slotIndex = lanes.findIndex((lane) => lane.status !== 'running')
      if (slotIndex < 0) {
        slotIndex = lastStartedSlot >= 0 ? (lastStartedSlot + 1) % lanes.length : 0
      }
      lanes[slotIndex] = {
        slot: slotIndex + 1,
        status: 'running',
        accountIndex,
        total,
        detail: `处理第 ${accountIndex} 个账号`,
        proxy: undefined,
      }
      activeQueue.push(slotIndex)
      lastStartedSlot = slotIndex
      continue
    }

    const proxyMatch = line.match(/使用代理:\s+(.+)$/)
    if (proxyMatch) {
      const slotIndex = lastStartedSlot >= 0 ? lastStartedSlot : lanes.findIndex((lane) => lane.status === 'running' && !lane.proxy)
      if (slotIndex >= 0) {
        lanes[slotIndex] = {
          ...lanes[slotIndex],
          proxy: proxyMatch[1],
        }
      }
      continue
    }

    if (line.includes('[OK] 注册成功')) {
      markOutcome('success', '当前账号已完成')
      continue
    }
    if (line.includes('[FAIL] 注册失败')) {
      markOutcome('failed', '当前账号失败')
      continue
    }
    if (line.includes('[SKIP]')) {
      markOutcome('skipped', '当前账号已跳过')
      continue
    }
    if (line.includes('[STOP]')) {
      markOutcome('stopped', '当前账号被停止')
      continue
    }
  }

  if (snapshot?.status === 'done' || snapshot?.status === 'failed' || snapshot?.status === 'stopped') {
    for (let index = 0; index < lanes.length; index += 1) {
      if (lanes[index].status === 'running') {
        lanes[index] = {
          ...lanes[index],
          status: snapshot.status === 'done' ? 'success' : snapshot.status === 'stopped' ? 'stopped' : 'failed',
          detail: snapshot.status === 'done' ? '任务完成' : snapshot.status === 'stopped' ? '任务已停止' : '任务失败',
        }
      }
    }
  }

  return lanes
}

function laneStatusMeta(status: ThreadLaneStatus) {
  switch (status) {
    case 'running':
      return { color: 'processing' as const, label: '运行中' }
    case 'success':
      return { color: 'success' as const, label: '完成' }
    case 'failed':
      return { color: 'error' as const, label: '失败' }
    case 'skipped':
      return { color: 'warning' as const, label: '跳过' }
    case 'stopped':
      return { color: 'warning' as const, label: '停止' }
    default:
      return { color: 'default' as const, label: '待命' }
  }
}

function buildAccountHeatmap(snapshot: TaskSnapshot | null, trackedTask: TrackedTaskMeta | null): AccountHeatCell[] {
  const total =
    Number(trackedTask?.count || 0)
    || Number(String(snapshot?.progress || '').split('/')[1] || 0)
    || 0

  if (!total) return []

  const cells: AccountHeatCell[] = Array.from({ length: total }, (_, index) => ({
    index: index + 1,
    status: 'idle',
  }))

  const activeQueue: number[] = []
  const pendingCpaQueue: number[] = []
  const logs = Array.isArray(snapshot?.logs) ? snapshot.logs : []

  for (const rawLine of logs) {
    const line = normalizeMessage(rawLine)

    const startMatch = line.match(/开始注册第\s+(\d+)\/(\d+)\s+个账号/)
    if (startMatch) {
      const accountIndex = Number(startMatch[1])
      if (cells[accountIndex - 1]) {
        cells[accountIndex - 1] = {
          ...cells[accountIndex - 1],
          status: 'running',
          detail: '注册进行中',
        }
        if (!activeQueue.includes(accountIndex)) {
          activeQueue.push(accountIndex)
        }
      }
      continue
    }

    const proxyMatch = line.match(/使用代理:\s+(.+)$/)
    if (proxyMatch) {
      const target = [...activeQueue].reverse().find((accountIndex) => {
        const cell = cells[accountIndex - 1]
        return cell && !cell.proxy
      })
      if (target && cells[target - 1]) {
        cells[target - 1] = {
          ...cells[target - 1],
          proxy: proxyMatch[1],
        }
      }
      continue
    }

    const successMatch = line.match(/\[OK\]\s+注册成功:\s+(.+)$/)
    if (successMatch) {
      const target = activeQueue.shift()
      if (target && cells[target - 1]) {
        cells[target - 1] = {
          ...cells[target - 1],
          status: 'registered',
          email: successMatch[1],
          detail: '注册成功，等待上传',
        }
        pendingCpaQueue.push(target)
      }
      continue
    }

    if (line.includes('[CPA] [OK]')) {
      const target = pendingCpaQueue.shift()
      if (target && cells[target - 1]) {
        cells[target - 1] = {
          ...cells[target - 1],
          status: 'success',
          detail: 'CPA 上传成功',
        }
      }
      continue
    }

    if (line.includes('[CPA] [FAIL]')) {
      const target = pendingCpaQueue.shift()
      if (target && cells[target - 1]) {
        cells[target - 1] = {
          ...cells[target - 1],
          status: 'failed',
          detail: 'CPA 上传失败',
        }
      }
      continue
    }

    if (line.includes('[FAIL] 注册失败')) {
      const target = activeQueue.shift()
      if (target && cells[target - 1]) {
        cells[target - 1] = {
          ...cells[target - 1],
          status: 'failed',
          detail: '注册失败',
        }
      }
      continue
    }

    if (line.includes('[SKIP]')) {
      const target = activeQueue.shift()
      if (target && cells[target - 1]) {
        cells[target - 1] = {
          ...cells[target - 1],
          status: 'skipped',
          detail: '已跳过',
        }
      }
    }
  }

  return cells
}

function heatStatusMeta(status: AccountHeatStatus) {
  switch (status) {
    case 'success':
      return { color: '#4ade80', label: 'CPA成功' }
    case 'failed':
      return { color: '#fb7185', label: '失败' }
    case 'running':
      return { color: '#22c55e', label: '运行中' }
    case 'registered':
      return { color: '#f59e0b', label: '待上传' }
    case 'skipped':
      return { color: '#94a3b8', label: '已跳过' }
    default:
      return { color: 'rgba(148, 163, 184, 0.18)', label: '等待' }
  }
}

function renderHeatTooltip(cell: AccountHeatCell) {
  const labels = {
    zh: { account: '账号', email: '邮箱', proxy: '代理', stage: '阶段', waitingEmail: '等待生成', waitingProxy: '等待分配' },
    en: { account: 'Account', email: 'Email', proxy: 'Proxy', stage: 'Stage', waitingEmail: 'Waiting', waitingProxy: 'Pending' },
  }
  const language = document.documentElement.dataset.language === 'en' ? 'en' : 'zh'
  const l = labels[language]
  const meta = heatStatusMeta(cell.status)

  return (
    <div className="task-heatmap__tooltip">
      <div className="task-heatmap__tooltip-title">
        <span>{l.account} #{cell.index}</span>
        <Tag color="default">{meta.label}</Tag>
      </div>
      <div className="task-heatmap__tooltip-row">
        <span className="task-heatmap__tooltip-label">{l.email}</span>
        <span className="task-heatmap__tooltip-value task-heatmap__tooltip-value--mono">
          {cell.email || l.waitingEmail}
        </span>
      </div>
      <div className="task-heatmap__tooltip-row">
        <span className="task-heatmap__tooltip-label">{l.proxy}</span>
        <span className="task-heatmap__tooltip-value task-heatmap__tooltip-value--mono">
          {cell.proxy || l.waitingProxy}
        </span>
      </div>
      <div className="task-heatmap__tooltip-row">
        <span className="task-heatmap__tooltip-label">{l.stage}</span>
        <span className="task-heatmap__tooltip-value">{cell.detail || meta.label}</span>
      </div>
    </div>
  )
}

export function ActiveTaskMonitor({ showEmptyState = false }: { showEmptyState?: boolean }) {
  const navigate = useNavigate()
  const { language } = useUi()
  const [trackedTask, setTrackedTaskState] = useState<TrackedTaskMeta | null>(() => getTrackedTask())
  const [snapshot, setSnapshot] = useState<TaskSnapshot | null>(null)
  const [dismissedTaskId, setDismissedTaskId] = useState<string | null>(null)
  const isZh = language === 'zh'

  const syncTrackedTask = useCallback(() => {
    const localTask = getTrackedTask()
    void getServerTrackedTask().then((serverTask) => {
      const nextTask = serverTask || localTask
      if (nextTask?.taskId && nextTask.taskId === dismissedTaskId) {
        setTrackedTaskState(null)
        return
      }
      setTrackedTaskState(nextTask)
    })
  }, [dismissedTaskId])

  const handleStopTracking = useCallback(() => {
    if (trackedTask?.taskId) {
      setDismissedTaskId(trackedTask.taskId)
    }
    clearTrackedTask()
    setTrackedTaskState(null)
    setSnapshot(null)
  }, [trackedTask?.taskId])

  useEffect(() => {
    syncTrackedTask()
    const timer = window.setInterval(syncTrackedTask, 5000)
    const handler = () => void syncTrackedTask()
    window.addEventListener('storage', handler)
    window.addEventListener('tracked-task-change', handler as EventListener)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', handler)
      window.removeEventListener('tracked-task-change', handler as EventListener)
    }
  }, [syncTrackedTask])

  useEffect(() => {
    if (!trackedTask?.taskId) {
      setSnapshot(null)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const next = await apiFetch(`/tasks/${trackedTask.taskId}`) as TaskSnapshot
        if (!cancelled) {
          setSnapshot(next)
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null)
        }
      }
    }

    void load()
    const timer = window.setInterval(load, 2500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [trackedTask?.taskId])

  if (!trackedTask?.taskId) {
    if (showEmptyState) {
      return (
        <SurfacePanel
          title={isZh ? '当前没有任务' : 'No active task'}
          subtitle={isZh ? '你可以先去创建一个注册任务。任务启动后，这里会自动接管日志追踪。' : 'Start a registration job first. Once it begins, this panel will follow it automatically.'}
          actions={(
            <Button icon={<EyeOutlined />} onClick={() => navigate('/register')}>
              {isZh ? '打开任务页' : 'Open runs'}
            </Button>
          )}
          className="page-table-shell"
        >
          <div className="empty-copy" style={{ padding: '32px 0' }}>
            {isZh ? '还没有可跟踪的任务。' : 'Nothing to track yet.'}
          </div>
        </SurfacePanel>
      )
    }
    return null
  }

  const threadLanes = buildThreadLanes(snapshot, trackedTask)
  const progressParts = String(snapshot?.progress || '').split('/')
  const progressCurrent = Number(progressParts[0] || 0)
  const total =
    Number(trackedTask?.count || 0)
    || Number(progressParts[1] || 0)
    || 0
  const overallPercent = total > 0 ? Math.min(100, Math.round((progressCurrent / total) * 100)) : 0
  const heatmap = buildAccountHeatmap(snapshot, trackedTask)
  const heatSuccess = heatmap.filter((cell) => cell.status === 'success').length
  const heatFailed = heatmap.filter((cell) => cell.status === 'failed').length

  return (
    <SurfacePanel
      title={isZh ? '实时任务' : 'Live task'}
      subtitle={isZh ? '任务在后台执行时，这里会持续跟踪最新日志。' : 'While a job is running, this panel keeps following the latest logs.'}
      actions={(
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => navigate('/register')}>
            {isZh ? '打开任务页' : 'Open runs'}
          </Button>
          <Button icon={<CloseOutlined />} onClick={handleStopTracking}>
            {isZh ? '结束跟踪' : 'Stop tracking'}
          </Button>
        </Space>
      )}
      className="page-table-shell"
    >
      <div className="data-toolbar" style={{ marginBottom: 16 }}>
        <div className="data-toolbar__group">
          <Title level={4} style={{ margin: '6px 0 4px' }}>
            {trackedTask.title || (isZh ? '任务跟踪' : 'Task tracking')}
          </Title>
          <Space wrap>
            <Tag color="success">{trackedTask.platform}</Tag>
            {trackedTask.source ? <Tag>{trackedTask.source}</Tag> : null}
            <Tag color={statusColor(snapshot?.status)}>{snapshot?.status || 'running'}</Tag>
            {snapshot?.progress ? <Tag>{snapshot.progress}</Tag> : null}
            <Text type="secondary">{isZh ? '任务 ID' : 'Task ID'}: {trackedTask.taskId}</Text>
          </Space>
        </div>
      </div>
      <div className="task-overview">
        <div className="task-overview__summary">
          <div className="task-overview__summary-head">
            <span>{isZh ? '总进度' : 'Overall progress'}</span>
            <span>{snapshot?.progress || (total > 0 ? `0/${total}` : '0/0')}</span>
          </div>
          <Progress percent={overallPercent} showInfo={false} strokeColor="#22c55e" />
        </div>
        <div className="thread-lanes">
          {threadLanes.map((lane) => {
            const meta = laneStatusMeta(lane.status)
            const lanePercent =
              lane.total && lane.accountIndex
                ? Math.max(2, Math.min(100, Math.round((lane.accountIndex / lane.total) * 100)))
                : lane.status === 'idle'
                ? 0
                : lane.status === 'running'
                ? 8
                : 100
            return (
              <div key={lane.slot} className="thread-lane">
                <div className="thread-lane__head">
                  <div className="thread-lane__title">
                    <span>{isZh ? `线程 ${lane.slot}` : `Lane ${lane.slot}`}</span>
                    {lane.accountIndex ? <span className="thread-lane__detail">{isZh ? `第 ${lane.accountIndex} 个账号` : `Account ${lane.accountIndex}`}</span> : null}
                  </div>
                  <Tag color={meta.color}>{meta.label}</Tag>
                </div>
                <Progress
                  percent={lanePercent}
                  showInfo={false}
                  status={lane.status === 'failed' ? 'exception' : lane.status === 'success' ? 'success' : 'active'}
                  strokeColor={lane.status === 'failed' ? '#fb7185' : lane.status === 'success' ? '#4ade80' : '#22c55e'}
                />
                <div className="thread-lane__meta">
                  <span>{lane.detail || (isZh ? '等待分配任务' : 'Waiting for assignment')}</span>
                  {lane.proxy ? <span className="thread-lane__proxy">{lane.proxy}</span> : null}
                </div>
              </div>
            )
          })}
        </div>
        {heatmap.length > 0 ? (
          <div className="task-heatmap">
            <div className="task-heatmap__header">
              <div className="task-heatmap__title">{isZh ? 'CPA 热力图' : 'CPA heatmap'}</div>
              <div className="task-heatmap__legend">
                <span className="task-heatmap__legend-item"><i style={{ background: '#4ade80' }} /> {isZh ? '成功' : 'Success'} {heatSuccess}</span>
                <span className="task-heatmap__legend-item"><i style={{ background: '#fb7185' }} /> {isZh ? '失败' : 'Failed'} {heatFailed}</span>
                <span className="task-heatmap__legend-item"><i style={{ background: '#f59e0b' }} /> {isZh ? '待上传' : 'Pending'}</span>
              </div>
            </div>
            <div className="task-heatmap__grid">
              {heatmap.map((cell) => {
                const meta = heatStatusMeta(cell.status)
                return (
                  <Tooltip
                    key={cell.index}
                    title={renderHeatTooltip(cell)}
                    mouseEnterDelay={0.08}
                    placement="top"
                    overlayClassName="task-heatmap__tooltip-overlay"
                  >
                    <div
                      className="task-heatmap__cell"
                      style={{ background: meta.color }}
                    >
                      <span>{cell.index}</span>
                    </div>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
      <TaskLogPanel taskId={trackedTask.taskId} onDone={() => void 0} />
    </SurfacePanel>
  )
}
