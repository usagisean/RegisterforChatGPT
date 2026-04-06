import { useEffect, useState } from 'react'
import { App, Form, Input, Button, Typography, Space, Tag, Segmented } from 'antd'
import { LockOutlined, SafetyCertificateOutlined, UserOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons'

import { setToken } from '@/lib/utils'
import { useUi } from '@/lib/ui'

type Step = 'password' | '2fa'

const copy = {
  zh: {
    eyebrow: 'zxai console',
    title: '一个给你自己长期使用的 ChatGPT 控制台。',
    description: '登录后直接进入监控、注册、补传一体化后台。页面会自动适配本地、VPS 和 iPhone Safari。',
    points: [
      ['一个入口', '代理、注册、检查、补传和监控都集中在同一套界面。'],
      ['手机可用', 'iPhone 打开后会切成移动导航和单列布局。'],
      ['双语切换', '中文和 English 可以随时切换，不用重新登录。'],
    ],
    accessTitle: '管理员验证',
    accessDesc: '输入管理员密钥进入后台。',
    accessLabel: '管理员密钥',
    accessPlaceholder: '请输入管理员密钥',
    accessButton: '进入控制台',
    verifyTitle: '继续完成验证',
    verifyDesc: '管理员密钥通过后，再输入验证器里的 6 位动态码。',
    verifyLabel: '验证码',
    verifyPlaceholder: '000000',
    verifyButton: '验证并进入',
    back: '返回密钥登录',
    loginError: '登录失败',
    verifyError: '验证失败',
    themeDark: '深色',
    themeLight: '浅色',
  },
  en: {
    eyebrow: 'zxai console',
    title: 'A long-running ChatGPT console built for your own workflow.',
    description: 'After sign-in you land in one workspace for monitoring, registration and backfill. The layout adapts to local machines, VPS hosts and iPhone Safari.',
    points: [
      ['One workspace', 'Proxy setup, registration, checks, backfill and monitoring stay in one flow.'],
      ['iPhone ready', 'Mobile uses a compact navigation and a single-column layout.'],
      ['Bilingual', 'Switch between Chinese and English without signing in again.'],
    ],
    accessTitle: 'Admin access',
    accessDesc: 'Enter the admin key to open the console.',
    accessLabel: 'Admin key',
    accessPlaceholder: 'Enter admin key',
    accessButton: 'Enter console',
    verifyTitle: 'Complete verification',
    verifyDesc: 'After the admin key is accepted, enter the 6-digit code from your authenticator.',
    verifyLabel: 'Verification code',
    verifyPlaceholder: '000000',
    verifyButton: 'Verify and continue',
    back: 'Back to admin key',
    loginError: 'Login failed',
    verifyError: 'Verification failed',
    themeDark: 'Dark',
    themeLight: 'Light',
  },
} as const

function LoginContent() {
  const { message } = App.useApp()
  const { language, setLanguage, themeMode, setThemeMode } = useUi()
  const [step, setStep] = useState<Step>('password')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)
  const t = copy[language]

  useEffect(() => {
    document.title = 'zxai'
  }, [])

  const handleLogin = async (values: { password: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t.loginError)
      if (data.requires_2fa) {
        setTempToken(data.temp_token)
        setStep('2fa')
      } else {
        setToken(data.access_token)
        window.location.href = '/'
      }
    } catch (error: any) {
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTotp = async (values: { code: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, code: values.code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t.verifyError)
      setToken(data.access_token)
      window.location.href = '/'
    } catch (error: any) {
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-scene">
      <div className="login-scene__ambient" />
      <div className="login-shell">
        <section className="login-stage">
          <div className="login-stage__topbar">
            <Tag className="login-stage__tag">{t.eyebrow}</Tag>
            <Space size={10}>
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
                icon={themeMode === 'light' ? <SunOutlined /> : <MoonOutlined />}
                onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
              >
                {themeMode === 'light' ? t.themeLight : t.themeDark}
              </Button>
            </Space>
          </div>

          <div className="login-stage__hero">
            <h1>{t.title}</h1>
            <p>{t.description}</p>
          </div>

          <div className="login-stage__grid">
            {t.points.map(([title, description]) => (
              <article key={title} className="login-stage__card">
                <strong>{title}</strong>
                <span>{description}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel__inner">
            <div className="login-panel__icon">
              {step === '2fa' ? <SafetyCertificateOutlined /> : <UserOutlined />}
            </div>
            <Typography.Title level={2} className="login-panel__title">
              {step === '2fa' ? t.verifyTitle : t.accessTitle}
            </Typography.Title>
            <Typography.Text className="login-panel__description">
              {step === '2fa' ? t.verifyDesc : t.accessDesc}
            </Typography.Text>

            {step === '2fa' ? (
              <Form layout="vertical" onFinish={handleTotp} requiredMark={false}>
                <Form.Item
                  name="code"
                  label={t.verifyLabel}
                  rules={[
                    { required: true, message: t.verifyLabel },
                    { len: 6, message: '6 digits' },
                  ]}
                >
                  <Input
                    prefix={<SafetyCertificateOutlined />}
                    placeholder={t.verifyPlaceholder}
                    size="large"
                    maxLength={6}
                    style={{ letterSpacing: 6, textAlign: 'center' }}
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, marginTop: 10 }}>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    {t.verifyButton}
                  </Button>
                </Form.Item>
                <div className="login-panel__footer">
                  <Button type="link" size="small" onClick={() => setStep('password')}>
                    {t.back}
                  </Button>
                </div>
              </Form>
            ) : (
              <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
                <Form.Item
                  name="password"
                  label={t.accessLabel}
                  rules={[{ required: true, message: t.accessLabel }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder={t.accessPlaceholder} size="large" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, marginTop: 10 }}>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    {t.accessButton}
                  </Button>
                </Form.Item>
              </Form>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default function Login() {
  return <LoginContent />
}
