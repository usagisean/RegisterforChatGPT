import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { App as AntdApp, ConfigProvider, Button, Spin, Space, Tag, Typography } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  GlobalOutlined,
  HistoryOutlined,
  SettingOutlined,
  RocketOutlined,
  SunOutlined,
  MoonOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import Dashboard from '@/pages/Dashboard'
import ConsolePage from '@/pages/Console'
import Accounts from '@/pages/Accounts'
import RegisterTaskPage from '@/pages/RegisterTaskPage'
import Proxies from '@/pages/Proxies'
import Settings from '@/pages/Settings'
import TaskHistory from '@/pages/TaskHistory'
import { darkTheme, lightTheme } from './theme'
import { clearToken, getToken } from '@/lib/utils'
import Login from '@/pages/Login'

const { Text } = Typography

function ProtectedLayout() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(s => {
        const token = getToken()
        if (s.has_password && !token) {
          navigate('/login', { replace: true })
        } else {
          setReady(true)
        }
      })
      .catch(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return <AppContent />
}

function AppContent() {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  )
  const [hasPassword, setHasPassword] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.toggle('light', themeMode === 'light')
    document.documentElement.dataset.theme = themeMode
    document.documentElement.style.setProperty(
      '--sider-trigger-border',
      themeMode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'
    )
    localStorage.setItem('theme', themeMode)
  }, [themeMode])

  useEffect(() => {
    fetch('/api/auth/status').then(r => r.json()).then(s => setHasPassword(s.has_password)).catch(() => {})
  }, [])

  const isLight = themeMode === 'light'
  const currentTheme = isLight ? lightTheme : darkTheme
  const navItems = [
    { key: '/', icon: <DashboardOutlined />, label: '总览', description: '今日状态' },
    { key: '/console', icon: <ThunderboltOutlined />, label: '控制台', description: '实时任务' },
    { key: '/accounts/chatgpt', icon: <UserOutlined />, label: '账号', description: 'ChatGPT' },
    { key: '/register', icon: <RocketOutlined />, label: '任务', description: '新建与跟踪' },
    { key: '/history', icon: <HistoryOutlined />, label: '历史', description: '执行记录' },
    { key: '/proxies', icon: <GlobalOutlined />, label: '代理', description: '代理池' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置', description: '服务与安全' },
  ]

  const activeNavKey = (() => {
    const path = location.pathname
    if (path === '/accounts') return '/accounts/chatgpt'
    if (path.startsWith('/accounts')) return '/accounts/chatgpt'
    if (path.startsWith('/console')) return '/console'
    if (path.startsWith('/register')) return '/register'
    if (path.startsWith('/history')) return '/history'
    if (path.startsWith('/proxies')) return '/proxies'
    if (path.startsWith('/settings')) return '/settings'
    return '/'
  })()

  const activeNav = navItems.find((item) => item.key === activeNavKey) || navItems[0]

  return (
    <ConfigProvider theme={currentTheme} locale={zhCN}>
      <AntdApp>
      <div className="app-shell">
        <aside className="app-sider">
          <div className="app-brand">
            <div className="app-brand__badge">
              <ThunderboltOutlined />
            </div>
            <div className="app-brand__text">
              <span className="app-brand__title">Helix</span>
              <span className="app-brand__subtitle">ChatGPT 账号后台</span>
            </div>
          </div>
          <div className="app-nav">
            <div className="sidebar-nav">
              {navItems.map((item) => {
                const active = item.key === activeNavKey
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`sidebar-nav__item${active ? ' is-active' : ''}`}
                    onClick={() => navigate(item.key)}
                  >
                    <span className="sidebar-nav__icon">{item.icon}</span>
                    <span className="sidebar-nav__copy">
                      <span className="sidebar-nav__label">{item.label}</span>
                      <span className="sidebar-nav__hint">{item.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
        <main className="app-main">
          <div className="app-topbar">
            <div className="app-topbar__current">
              <Text className="app-topbar__section">{activeNav.label}</Text>
              <Text className="app-topbar__hint">{activeNav.description}</Text>
            </div>
            <Space wrap>
              <Tag color="blue">ChatGPT</Tag>
              <Button type="default" onClick={() => navigate('/console')}>
                实时控制台
              </Button>
              <Button
                icon={isLight ? <SunOutlined /> : <MoonOutlined />}
                onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
              >
                {isLight ? '亮色模式' : '暗色模式'}
              </Button>
              {hasPassword && (
                <Button
                  danger
                  icon={<LogoutOutlined />}
                  onClick={() => { clearToken(); navigate('/login') }}
                >
                  退出登录
                </Button>
              )}
            </Space>
          </div>
          <div className="content-stage">
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
      </div>
      </AntdApp>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
