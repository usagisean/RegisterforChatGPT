import { useEffect, useState } from 'react'
import { Button, Progress, Spin, Tag } from 'antd'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  ReloadOutlined,
  RocketOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { ActiveTaskMonitor } from '@/components/ActiveTaskMonitor'
import { SurfacePanel } from '@/components/SurfacePanel'
import { StatTile } from '@/components/StatTile'
import { apiFetch } from '@/lib/utils'
import { useUi } from '@/lib/ui'

const copy = {
  zh: {
    eyebrow: 'control surface',
    title: '今天先看状态，再决定下一步。',
    description: '这不是资料页，而是操作台。先看代理、运行中的任务和账号存量，再进入账号页执行注册、检查和补传。',
    refresh: '刷新',
    stepsTitle: '建议顺序',
    stepsSubtitle: '第一次使用时，按这三步走最稳。',
    liveTitle: '实时控制台',
    liveSubtitle: '正在运行的任务会自动显示在这里，不需要守着弹窗。',
    statusTitle: '全局状态',
    statusSubtitle: '只留最关键的数字和状态分类。',
    empty: '暂无数据',
    stats: {
      total: '账号总数',
      active: '可用账号',
      waiting: '待补传',
      invalid: '失效账号',
    },
    steps: [
      { title: '准备代理', desc: '先导入代理并做连通性检测，再开始跑任务。', action: '打开代理', to: '/proxies', icon: <GlobalOutlined /> },
      { title: '进入账号页', desc: '发起注册、导入已有账号、查看实时状态都在账号页里。', action: '打开账号库', to: '/accounts/chatgpt', icon: <RocketOutlined /> },
      { title: '完成后补传', desc: '本地检测通过后，再把远端缺失的 auth-file 补传上去。', action: '打开设置', to: '/settings', icon: <SettingOutlined /> },
    ],
    platform: '平台分布',
    accountState: '账号状态',
    onlyChatgpt: '当前只保留 ChatGPT 工作流',
    noAccounts: '当前还没有账号数据。',
  },
  en: {
    eyebrow: 'control surface',
    title: 'Start with signals, then decide the next step.',
    description: 'This is an operating console, not a brochure. Review proxies, live jobs and account inventory first, then jump into the account workspace to act.',
    refresh: 'Refresh',
    stepsTitle: 'Suggested order',
    stepsSubtitle: 'If this is your first visit, follow these three steps.',
    liveTitle: 'Live console',
    liveSubtitle: 'Running jobs stay here automatically. No more babysitting popups.',
    statusTitle: 'Global state',
    statusSubtitle: 'Only the metrics and state buckets that matter.',
    empty: 'No data yet',
    stats: {
      total: 'Accounts',
      active: 'Healthy',
      waiting: 'Pending upload',
      invalid: 'Invalid',
    },
    steps: [
      { title: 'Prepare proxies', desc: 'Import working proxies and run connectivity checks before launching any job.', action: 'Open proxies', to: '/proxies', icon: <GlobalOutlined /> },
      { title: 'Open accounts', desc: 'Registration, importing and live account operations all happen in the accounts workspace.', action: 'Open accounts', to: '/accounts/chatgpt', icon: <RocketOutlined /> },
      { title: 'Backfill after checks', desc: 'Once local checks pass, backfill only the auth-files that are missing remotely.', action: 'Open settings', to: '/settings', icon: <SettingOutlined /> },
    ],
    platform: 'Platform split',
    accountState: 'Account states',
    onlyChatgpt: 'Only ChatGPT workflow is active',
    noAccounts: 'No account data yet.',
  },
} as const

const STATUS_TAGS: Record<string, string> = {
  registered: 'default',
  trial: 'success',
  subscribed: 'success',
  expired: 'warning',
  invalid: 'error',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { language } = useUi()
  const t = copy[language]
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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

  const total = stats?.total ?? 0
  const byStatus = stats?.by_status || {}
  const totalPending = Math.max(0, (byStatus.registered ?? 0) - (byStatus.trial ?? 0) - (byStatus.subscribed ?? 0))

  return (
    <div className="page-shell page-shell--dashboard">
      <section className="command-hero">
        <div className="command-hero__copy">
          <div className="command-hero__eyebrow">{t.eyebrow}</div>
          <h1 className="command-hero__title">{t.title}</h1>
          <p className="command-hero__description">{t.description}</p>
          <div className="command-hero__actions">
            <Button type="primary" icon={<RocketOutlined />} onClick={() => navigate('/accounts/chatgpt')}>
              {language === 'zh' ? '进入账号库' : 'Open accounts'}
            </Button>
            <Button icon={<ReloadOutlined spin={loading} />} onClick={load} loading={loading}>
              {t.refresh}
            </Button>
          </div>
          <div className="command-hero__meta">
            <Tag color="success">{t.onlyChatgpt}</Tag>
            <Tag>{language === 'zh' ? `总账号 ${total}` : `${total} accounts`}</Tag>
          </div>
        </div>
      </section>

      <div className="dashboard-metrics dashboard-metrics--four">
        <StatTile label={t.stats.total} value={total} icon={<UserOutlined />} />
        <StatTile label={t.stats.active} value={(byStatus.trial ?? 0) + (byStatus.subscribed ?? 0)} icon={<CheckCircleOutlined />} tone="success" />
        <StatTile label={t.stats.waiting} value={totalPending} icon={<ClockCircleOutlined />} tone="warning" />
        <StatTile label={t.stats.invalid} value={(byStatus.invalid ?? 0) + (byStatus.expired ?? 0)} icon={<CheckCircleOutlined />} tone="danger" />
      </div>

      <div className="dashboard-grid dashboard-grid--wide">
        <SurfacePanel title={t.stepsTitle} subtitle={t.stepsSubtitle}>
          <div className="journey-list">
            {t.steps.map((step, index) => (
              <button key={step.title} type="button" className="journey-card" onClick={() => navigate(step.to)}>
                <div className="journey-card__index">{index + 1}</div>
                <div className="journey-card__icon">{step.icon}</div>
                <div className="journey-card__copy">
                  <div className="journey-card__title">{step.title}</div>
                  <div className="journey-card__desc">{step.desc}</div>
                </div>
                <ArrowRightOutlined className="journey-card__arrow" />
              </button>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel title={t.statusTitle} subtitle={t.statusSubtitle}>
          <div className="panel-list">
            <div className="metric-line">
              <div className="metric-line__head">
                <span>{t.platform}</span>
                <span>{total}</span>
              </div>
              <Progress percent={total ? 100 : 0} showInfo={false} strokeColor="#4ade80" />
            </div>
            {loading ? (
              <div className="empty-copy"><Spin /></div>
            ) : total ? (
              <div className="panel-list">
                {Object.entries(byStatus).map(([status, count]: any) => (
                  <div key={status} className="panel-row">
                    <div className="panel-row__label">
                      <Tag color={STATUS_TAGS[status] || 'default'}>{status}</Tag>
                    </div>
                    <div className="panel-row__value">{count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-copy">{t.noAccounts}</div>
            )}
          </div>
        </SurfacePanel>
      </div>

      <SurfacePanel title={t.liveTitle} subtitle={t.liveSubtitle}>
        <ActiveTaskMonitor showEmptyState />
      </SurfacePanel>
    </div>
  )
}
