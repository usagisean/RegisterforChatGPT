import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { App as AntdApp, ConfigProvider, Button, Spin, Segmented } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  GlobalOutlined,
  HistoryOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'

import Dashboard from '@/pages/Dashboard'
import ConsolePage from '@/pages/Console'
import Accounts from '@/pages/Accounts'
import RegisterTaskPage from '@/pages/RegisterTaskPage'
import Proxies from '@/pages/Proxies'
import Settings from '@/pages/Settings'
import TaskHistory from '@/pages/TaskHistory'
import Login from '@/pages/Login'
import { darkTheme, lightTheme } from './theme'
import { clearToken, getToken } from '@/lib/utils'
import { UiProvider, useUi } from '@/lib/ui'
import { useIsMobile } from '@/hooks/useIsMobile'

const copy = {
  zh: {
    brand: 'zxai',
    brandSub: 'ChatGPT 控制台',
    nav: {
      dashboard: { label: '总览', hint: '状态与进度' },
      accounts: { label: '账号', hint: '导入、注册、检查' },
      history: { label: '历史', hint: '已执行任务' },
      proxies: { label: '代理', hint: '网络与可用性' },
      settings: { label: '设置', hint: '服务与安全' },
    },
    page: {
      dashboard: { label: '总览', hint: '先看状态，再决定下一步' },
      accounts: { label: '账号', hint: '录入、注册、补传都在这一页完成' },
      history: { label: '历史', hint: '回看任务与结果' },
      proxies: { label: '代理', hint: '导入、检测和管理代理' },
      settings: { label: '设置', hint: '连接外部服务并保护入口' },
      console: { label: '控制台', hint: '实时监控正在执行的任务' },
    },
    top: {
      dark: '夜间',
      light: '日间',
      logout: '退出',
      mobileTitle: '控制台',
    },
  },
  en: {
    brand: 'zxai',
    brandSub: 'ChatGPT Console',
    nav: {
      dashboard: { label: 'Overview', hint: 'status & progress' },
      accounts: { label: 'Accounts', hint: 'import, register, verify' },
      history: { label: 'History', hint: 'completed jobs' },
      proxies: { label: 'Proxies', hint: 'network & health' },
      settings: { label: 'Settings', hint: 'services & security' },
    },
    page: {
      dashboard: { label: 'Overview', hint: 'start with signals, then take action' },
      accounts: { label: 'Accounts', hint: 'import, register and backfill in one place' },
      history: { label: 'History', hint: 'review past jobs and outcomes' },
      proxies: { label: 'Proxies', hint: 'import, test and maintain proxies' },
      settings: { label: 'Settings', hint: 'connect services and secure access' },
      console: { label: 'Console', hint: 'live monitoring for active jobs' },
    },
    top: {
      dark: 'Dark',
      light: 'Light',
      logout: 'Logout',
      mobileTitle: 'Console',
    },
  },
} as const

function ProtectedLayout() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((s) => {
        if (s.has_password && !s.authenticated && !getToken()) {
          navigate('/login', { replace: true })
        } else {
          setReady(true)
        }
      })
      .catch(() => setReady(true))
  }, [navigate])

  if (!ready) {
    return (
      <div className="app-loading-shell">
        <Spin size="large" />
      </div>
    )
  }

  return <AppContent />
}

function AppContent() {
  const { themeMode, setThemeMode, language, setLanguage } = useUi()
  const [hasPassword, setHasPassword] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isLight = themeMode === 'light'
  const t = copy[language]

  useEffect(() => {
    fetch('/api/auth/status').then((r) => r.json()).then((s) => setHasPassword(s.has_password)).catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    clearToken()
    navigate('/login')
  }

  const navItems = [
    { key: '/', icon: <DashboardOutlined />, ...t.nav.dashboard },
    { key: '/accounts/chatgpt', icon: <UserOutlined />, ...t.nav.accounts },
    { key: '/history', icon: <HistoryOutlined />, ...t.nav.history },
    { key: '/proxies', icon: <GlobalOutlined />, ...t.nav.proxies },
    { key: '/settings', icon: <SettingOutlined />, ...t.nav.settings },
  ]

  const pageMeta = (() => {
    const path = location.pathname
    if (path.startsWith('/console')) return { navKey: '/', ...t.page.console }
    if (path.startsWith('/register')) return { navKey: '/accounts/chatgpt', ...t.page.accounts }
    if (path === '/accounts' || path.startsWith('/accounts')) return { navKey: '/accounts/chatgpt', ...t.page.accounts }
    if (path.startsWith('/history')) return { navKey: '/history', ...t.page.history }
    if (path.startsWith('/proxies')) return { navKey: '/proxies', ...t.page.proxies }
    if (path.startsWith('/settings')) return { navKey: '/settings', ...t.page.settings }
    return { navKey: '/', ...t.page.dashboard }
  })()

  useEffect(() => {
    document.title = `${t.brand} · ${pageMeta.label}`
  }, [pageMeta.label, t.brand])

  const renderNavItems = (compact = false) =>
    navItems.map((item) => {
      const active = item.key === pageMeta.navKey
      return (
        <button
          key={item.key}
          type="button"
          className={`shell-nav__item${active ? ' is-active' : ''}${compact ? ' is-compact' : ''}`}
          onClick={() => navigate(item.key)}
        >
          <span className="shell-nav__icon">{item.icon}</span>
          <span className="shell-nav__text">
            <span className="shell-nav__label">{item.label}</span>
            {!compact ? <span className="shell-nav__hint">{item.hint}</span> : null}
          </span>
        </button>
      )
    })

  return (
    <div className="shell">
      {!isMobile ? (
        <aside className="shell-sidebar">
          <div className="shell-brand">
            <div className="shell-brand__mark">
              <ThunderboltOutlined />
            </div>
            <div className="shell-brand__copy">
              <span className="shell-brand__title">{t.brand}</span>
              <span className="shell-brand__subtitle">{t.brandSub}</span>
            </div>
          </div>
          <nav className="shell-nav">
            <div className="shell-nav__list">{renderNavItems()}</div>
          </nav>
        </aside>
      ) : null}

      <main className="shell-main">
        <header className="shell-header">
          <div className="shell-header__left">
            <div className="shell-header__page">
              <div className="shell-header__eyebrow">{t.brand}</div>
              <div className="shell-header__title">{isMobile ? t.top.mobileTitle : pageMeta.label}</div>
              <div className="shell-header__hint">{pageMeta.hint}</div>
            </div>
          </div>

          <div className="shell-header__right">
            <Segmented
              size="small"
              value={language}
              onChange={(value) => setLanguage(value as 'zh' | 'en')}
              options={[
                { label: '中文', value: 'zh' },
                { label: 'EN', value: 'en' },
              ]}
            />
            <Button
              type="text"
              icon={isLight ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
            >
              {isLight ? t.top.light : t.top.dark}
            </Button>
            {hasPassword ? (
              <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
                {t.top.logout}
              </Button>
            ) : null}
          </div>
        </header>

        <div className="shell-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/console" element={<ConsolePage />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:platform" element={<Accounts />} />
            <Route path="/register" element={<RegisterTaskPage />} />
            <Route path="/history" element={<TaskHistory />} />
            <Route path="/proxies" element={<Proxies />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

      {isMobile ? (
        <nav className="shell-mobile-tabs">
          {renderNavItems(true)}
        </nav>
      ) : null}
    </div>
  )
}

function AppRouter() {
  const { themeMode, language } = useUi()
  const currentTheme = themeMode === 'light' ? lightTheme : darkTheme
  return (
    <ConfigProvider theme={currentTheme} locale={language === 'zh' ? zhCN : enUS}>
      <AntdApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <UiProvider>
      <AppRouter />
    </UiProvider>
  )
}
