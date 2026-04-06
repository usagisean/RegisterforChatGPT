import { useEffect, useMemo, useState } from 'react'
import { Button, Spin } from 'antd'
import {
  CloudServerOutlined,
  DatabaseOutlined,
  HddOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons'

import { ActiveTaskMonitor } from '@/components/ActiveTaskMonitor'
import { SurfacePanel } from '@/components/SurfacePanel'
import { StatTile } from '@/components/StatTile'
import { useUi } from '@/lib/ui'
import { apiFetch } from '@/lib/utils'

interface AccountStats {
  total?: number
  by_status?: Record<string, number>
}

interface SystemOverview {
  host?: string
  runtime?: string
  os?: string
  python?: string
  cpu_count?: number
  load?: { load1?: number | null; load5?: number | null; load15?: number | null }
  memory?: { total_gb?: number | null; used_gb?: number | null; free_gb?: number | null }
  disk?: { total_gb?: number | null; used_gb?: number | null; free_gb?: number | null; used_percent?: number | null }
  remote_cpa_total?: number
  remote_cpa_usable?: number
  server_time?: string
  uptime_seconds?: number
}

const copy = {
  zh: {
    title: '仪表盘',
    subtitle: '账号、远端与服务器状态',
    refresh: '刷新',
    stats: {
      total: '账号总数',
      available: '可用账号',
      invalid: '失效账号',
      remote: 'CPA远端账号',
    },
    server: {
      title: '服务器',
      host: '主机名',
      runtime: '运行环境',
      cpu: 'CPU / 负载',
      memory: '内存',
      disk: '磁盘',
      remote: 'CPA 远端',
      time: '服务器时间',
      uptime: '运行时长',
      healthy: '远端可用',
      total: '已上传',
    },
    liveTitle: '实时任务',
    liveSubtitle: '线程进度和热力图会持续更新。',
    empty: '暂无数据',
    unit: {
      cpu: '核',
      hour: '小时',
      minute: '分钟',
      day: '天',
    },
  },
  en: {
    title: 'Dashboard',
    subtitle: 'accounts, remote sync and server health',
    refresh: 'Refresh',
    stats: {
      total: 'Accounts',
      available: 'Available',
      invalid: 'Invalid',
      remote: 'Remote CPA',
    },
    server: {
      title: 'Server',
      host: 'Host',
      runtime: 'Runtime',
      cpu: 'CPU / Load',
      memory: 'Memory',
      disk: 'Disk',
      remote: 'Remote CPA',
      time: 'Server time',
      uptime: 'Uptime',
      healthy: 'Usable',
      total: 'Uploaded',
    },
    liveTitle: 'Live tasks',
    liveSubtitle: 'Thread progress and heatmap update in real time.',
    empty: 'No data',
    unit: {
      cpu: 'cores',
      hour: 'h',
      minute: 'm',
      day: 'd',
    },
  },
} as const

function formatNumber(value?: number | null, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value}${suffix}`
}

function formatServerTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatUptime(value?: number, unit?: { day: string; hour: string; minute: string }) {
  if (!value || !unit) return '—'
  const days = Math.floor(value / 86400)
  const hours = Math.floor((value % 86400) / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  if (days > 0) return `${days}${unit.day} ${hours}${unit.hour}`
  if (hours > 0) return `${hours}${unit.hour} ${minutes}${unit.minute}`
  return `${Math.max(1, minutes)}${unit.minute}`
}

function formatLoad(load?: { load1?: number | null; load5?: number | null; load15?: number | null }) {
  const values = [load?.load1, load?.load5, load?.load15]
  if (values.every((item) => item === null || item === undefined)) return '—'
  return values.map((item) => formatNumber(item as number | null)).join(' / ')
}

export default function Dashboard() {
  const { language } = useUi()
  const t = copy[language]
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [system, setSystem] = useState<SystemOverview | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [statsData, systemData] = await Promise.all([
        apiFetch('/accounts/stats'),
        apiFetch('/system/overview'),
      ])
      setStats(statsData)
      setSystem(systemData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const metrics = useMemo(() => {
    const byStatus = stats?.by_status || {}
    return {
      total: stats?.total ?? 0,
      available: (byStatus.trial ?? 0) + (byStatus.subscribed ?? 0),
      invalid: (byStatus.invalid ?? 0) + (byStatus.expired ?? 0),
      remote: system?.remote_cpa_total ?? 0,
    }
  }, [stats, system])

  const serverCards = [
    {
      label: t.server.host,
      value: system?.host || '—',
      note: system?.os || '—',
      icon: <CloudServerOutlined />,
    },
    {
      label: t.server.runtime,
      value: system?.runtime || '—',
      note: `${formatNumber(system?.cpu_count, ` ${t.unit.cpu}`)} · Python ${system?.python || '—'}`,
      icon: <ThunderboltOutlined />,
    },
    {
      label: t.server.cpu,
      value: formatLoad(system?.load),
      note: `${formatNumber(system?.cpu_count, ` ${t.unit.cpu}`)}`,
      icon: <SafetyCertificateOutlined />,
    },
    {
      label: t.server.memory,
      value: `${formatNumber(system?.memory?.used_gb)} / ${formatNumber(system?.memory?.total_gb)} GB`,
      note: `${formatNumber(system?.memory?.free_gb)} GB free`,
      icon: <DatabaseOutlined />,
    },
    {
      label: t.server.disk,
      value: `${formatNumber(system?.disk?.used_percent, '%')}`,
      note: `${formatNumber(system?.disk?.used_gb)} / ${formatNumber(system?.disk?.total_gb)} GB`,
      icon: <HddOutlined />,
    },
    {
      label: t.server.remote,
      value: `${system?.remote_cpa_total ?? 0}`,
      note: `${t.server.healthy} ${system?.remote_cpa_usable ?? 0}`,
      icon: <UserOutlined />,
    },
  ]

  return (
    <div className="page-shell page-shell--dashboard">
      <SurfacePanel
        className="dashboard-overview"
        bodyClassName="dashboard-overview__body"
        actions={(
          <Button icon={<ReloadOutlined spin={loading} />} onClick={load} loading={loading}>
            {t.refresh}
          </Button>
        )}
      >
        <div className="dashboard-overview__head">
          <div className="dashboard-overview__copy">
            <div className="dashboard-overview__title">{t.title}</div>
            <div className="dashboard-overview__subtitle">{t.subtitle}</div>
          </div>
          <div className="dashboard-overview__meta">
            <span>{system?.runtime || '—'}</span>
            <span>{system?.host || '—'}</span>
            <span>{formatServerTime(system?.server_time)}</span>
          </div>
        </div>

        <div className="dashboard-metrics dashboard-metrics--four dashboard-metrics--dense">
          <StatTile label={t.stats.total} value={metrics.total} icon={<UserOutlined />} />
          <StatTile label={t.stats.available} value={metrics.available} icon={<SafetyCertificateOutlined />} tone="success" />
          <StatTile label={t.stats.invalid} value={metrics.invalid} icon={<DatabaseOutlined />} tone="danger" />
          <StatTile label={t.stats.remote} value={metrics.remote} icon={<CloudServerOutlined />} tone="default" />
        </div>
      </SurfacePanel>

      <SurfacePanel title={t.server.title}>
        {loading && !system ? (
          <div className="empty-copy"><Spin /></div>
        ) : (
          <>
            <div className="server-grid">
              {serverCards.map((card) => (
                <div key={card.label} className="server-card">
                  <div className="server-card__label">{card.label}</div>
                  <div className="server-card__value">{card.value}</div>
                  <div className="server-card__note">{card.note}</div>
                  <div className="server-card__icon">{card.icon}</div>
                </div>
              ))}
            </div>
            <div className="server-inline">
              <div className="server-inline__item">
                <span>{t.server.time}</span>
                <strong>{formatServerTime(system?.server_time)}</strong>
              </div>
              <div className="server-inline__item">
                <span>{t.server.uptime}</span>
                <strong>{formatUptime(system?.uptime_seconds, t.unit)}</strong>
              </div>
            </div>
          </>
        )}
      </SurfacePanel>

      <SurfacePanel title={t.liveTitle} subtitle={t.liveSubtitle}>
        <ActiveTaskMonitor showEmptyState />
      </SurfacePanel>
    </div>
  )
}
