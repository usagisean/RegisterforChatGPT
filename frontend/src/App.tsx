import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { App as AntdApp, ConfigProvider, Button, Spin, Space, Typography } from 'antd'
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
        if (s.has_password && !s.authenticated && !getToken()) {
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    clearToken()
    navigate('/login')
  }

  const isLight = themeMode === 'light'
  const currentTheme = isLight ? lightTheme : darkTheme
  const navItems = [
    { key: '/', icon: <DashboardOutlined />, label: '总览', description: '监控与进度' },
    { key: '/accounts/chatgpt', icon: <UserOutlined />, label: '账号', description: '筛选与操作' },
    { key: '/history', icon: <HistoryOutlined />, label: '历史', description: '执行记录' },
    { key: '/proxies', icon: <GlobalOutlined />, label: '代理', description: '连接管理' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置', description: '服务与安全' },
  ]

  const pageMeta = (() => {
    const path = location.pathname
    if (path.startsWith('/console')) return { navKey: '/', label: '总览', description: '实时任务监控' }
    if (path.startsWith('/register')) return { navKey: '/accounts/chatgpt', label: '账号', description: '注册与批量处理' }
    if (path === '/accounts' || path.startsWith('/accounts')) return { navKey: '/accounts/chatgpt', label: '账号', description: '筛选与操作' }
    if (path.startsWith('/history')) return { navKey: '/history', label: '历史', description: '执行记录' }
    if (path.startsWith('/proxies')) return { navKey: '/proxies', label: '代理', description: '连接管理' }
    if (path.startsWith('/settings')) return { navKey: '/settings', label: '设置', description: '服务与安全' }
    return { navKey: '/', label: '总览', description: '监控与进度' }
  })()
  const activeNavKey = pageMeta.navKey

  useEffect(() => {
    document.title = `zxai · ${pageMeta.label}`
  }, [pageMeta.label])

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
              <span className="app-brand__title">zxai</span>
              <span className="app-brand__subtitle">运营后台</span>
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
              <Text className="app-topbar__section">{pageMeta.label}</Text>
              <Text className="app-topbar__hint">{pageMeta.description}</Text>
            </div>
            <Space wrap>
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
                  onClick={handleLogout}
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
