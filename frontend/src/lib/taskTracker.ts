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
