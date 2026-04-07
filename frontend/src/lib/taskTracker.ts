import { apiFetch } from '@/lib/utils'

const STORAGE_KEY = 'active-register-task'

export interface TrackedTaskMeta {
  taskId: string
  platform: string
  title?: string
  source?: string
  count?: number
  concurrency?: number
  createdAt: string
}

interface ServerTaskSnapshot {
  id?: string
  task_id?: string
  platform?: string
  source?: string
  total?: number
  meta?: {
    count?: number
    concurrency?: number
    title?: string
  }
  created_at?: number | string
}

export function getTrackedTask(): TrackedTaskMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.taskId) return null
    return parsed
  } catch {
    return null
  }
}

export function setTrackedTask(meta: TrackedTaskMeta) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
  window.dispatchEvent(new CustomEvent('tracked-task-change', { detail: meta }))
}

export function clearTrackedTask() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('tracked-task-change', { detail: null }))
}

function normalizeServerTask(task: ServerTaskSnapshot | null | undefined): TrackedTaskMeta | null {
  const taskId = task?.id || task?.task_id
  if (!taskId) return null

  const createdAt =
    typeof task.created_at === 'number'
      ? new Date(task.created_at * 1000).toISOString()
      : task.created_at || new Date().toISOString()

  const count = Number(task.total || task.meta?.count || 0) || undefined
  const concurrency = Number(task.meta?.concurrency || 0) || undefined

  return {
    taskId,
    platform: task.platform || 'chatgpt',
    title: task.meta?.title || 'ChatGPT 注册任务',
    source: task.source || 'server',
    count,
    concurrency,
    createdAt,
  }
}

export async function getServerTrackedTask(): Promise<TrackedTaskMeta | null> {
  try {
    const data = await apiFetch('/tasks/active') as { task?: ServerTaskSnapshot | null }
    return normalizeServerTask(data.task)
  } catch {
    return null
  }
}
