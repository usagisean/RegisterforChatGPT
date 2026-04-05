import { useEffect, useState } from 'react'
import { Progress, Tag, Button, Spin } from 'antd'
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { ActiveTaskMonitor } from '@/components/ActiveTaskMonitor'
import { HeroChip, PageHero } from '@/components/PageHero'
import { StatTile } from '@/components/StatTile'
import { SurfacePanel } from '@/components/SurfacePanel'
import { apiFetch } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: '#5b8cff',
}

const STATUS_COLORS: Record<string, string> = {
  registered: 'default',
  trial: 'success',
  subscribed: 'success',
  expired: 'warning',
  invalid: 'error',
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const visiblePlatformEntries = Object.entries(stats?.by_platform || {}).filter(([platform]) => platform === 'chatgpt')

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/accounts/stats')
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const statCards = [
    {
      title: '总账号数',
      value: stats?.total ?? 0,
      icon: <UserOutlined style={{ fontSize: 32 }} />,
      color: '#5b8cff',
    },
    {
      title: '试用中',
      value: stats?.by_status?.trial ?? 0,
      icon: <ClockCircleOutlined style={{ fontSize: 32 }} />,
      color: '#f59e0b',
    },
    {
      title: '已订阅',
      value: stats?.by_status?.subscribed ?? 0,
      icon: <CheckCircleOutlined style={{ fontSize: 32 }} />,
      color: '#10b981',
    },
    {
      title: '已失效',
      value: (stats?.by_status?.expired ?? 0) + (stats?.by_status?.invalid ?? 0),
      icon: <CloseCircleOutlined style={{ fontSize: 32 }} />,
      color: '#ef4444',
    },
  ]

  return (
    <div className="page-shell">
      <PageHero
        title="总览"
        description="查看账号状态、代理情况和当前任务。"
        actions={(
          <Button icon={<ReloadOutlined spin={loading} />} onClick={load} loading={loading}>
            刷新
          </Button>
        )}
        meta={(
          <>
            <HeroChip>总账号 {stats?.total ?? 0}</HeroChip>
            <HeroChip>试用中 {stats?.by_status?.trial ?? 0}</HeroChip>
          </>
        )}
      />

      <ActiveTaskMonitor />

      <div className="dashboard-metrics">
        {statCards.map(({ title, value, icon, color }) => (
          <StatTile
            key={title}
            label={title}
            value={value}
            icon={<span style={{ color }}>{icon}</span>}
            tone={title === '已失效' ? 'danger' : title === '已订阅' ? 'success' : title === '试用中' ? 'warning' : 'default'}
          />
        ))}
      </div>

      <div className="dashboard-grid">
        <SurfacePanel title="平台分布" subtitle="当前只展示 ChatGPT 数据。">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : stats ? (
            visiblePlatformEntries.length > 0 ? (
              <div className="panel-list">
                {visiblePlatformEntries.map(([platform, count]: any) => (
                  <div key={platform} className="metric-line">
                    <div className="metric-line__head">
                      <Tag color={PLATFORM_COLORS[platform] || 'default'}>{platform}</Tag>
                      <span>{count}</span>
                    </div>
                    <Progress
                      percent={stats.total ? Math.round((count / stats.total) * 100) : 0}
                      strokeColor={PLATFORM_COLORS[platform] || '#6366f1'}
                      showInfo={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-copy">当前还没有 ChatGPT 账号。</div>
            )
          ) : (
            <div className="empty-copy">加载中...</div>
          )}
        </SurfacePanel>

        <SurfacePanel title="状态分布" subtitle="用更短的标签查看当前账号状态。">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : stats ? (
            <div className="panel-list">
              {Object.entries(stats.by_status || {}).map(([status, count]: any) => (
                <div key={status} className="panel-row">
                  <div className="panel-row__label">
                    <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
                  </div>
                  <div className="panel-row__value">{count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-copy">加载中...</div>
          )}
        </SurfacePanel>
      </div>
    </div>
  )
}
