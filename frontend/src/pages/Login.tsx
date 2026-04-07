import { useEffect, useState } from 'react'
import { App, Form, Input, Button, Typography, Space, Segmented, Tabs } from 'antd'
import { LockOutlined, SafetyCertificateOutlined, SunOutlined, MoonOutlined, UserOutlined } from '@ant-design/icons'

import { setToken } from '@/lib/utils'
import { useUi } from '@/lib/ui'

type Step = 'login' | 'register' | '2fa'

const copy = {
  zh: {
    title: 'zxaiNexForge',
    subtitle: '控制中心',
    loginTab: '登录',
    registerTab: '注册',
    usernameLabel: '用户名',
    usernamePlaceholder: '输入用户名',
    accessLabel: '密码',
    accessPlaceholder: '输入密码',
    accessButton: '登录',
    registerButton: '注册',
    verifyTitle: '二次验证',
    verifyDesc: '输入 6 位验证码',
    verifyLabel: '验证码',
    verifyPlaceholder: '000000',
    verifyButton: '验证',
    back: '返回',
    loginError: '登录失败',
    registerError: '注册失败',
    verifyError: '验证失败',
    registerSuccess: '注册成功',
    themeDark: '深色',
    themeLight: '浅色',
  },
  en: {
    title: 'zxaiNexForge',
    subtitle: 'Control Center',
    loginTab: 'Sign In',
    registerTab: 'Sign Up',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter username',
    accessLabel: 'Password',
    accessPlaceholder: 'Enter password',
    accessButton: 'Sign in',
    registerButton: 'Sign up',
    verifyTitle: 'Two-factor verification',
    verifyDesc: 'Enter the 6-digit code',
    verifyLabel: 'Verification code',
    verifyPlaceholder: '000000',
    verifyButton: 'Continue',
    back: 'Back',
    loginError: 'Login failed',
    registerError: 'Registration failed',
    verifyError: 'Verification failed',
    registerSuccess: 'Registration successful',
    themeDark: 'Dark',
    themeLight: 'Light',
  },
} as const

function LoginContent() {
  const { message } = App.useApp()
  const { language, setLanguage, themeMode, setThemeMode } = useUi()
  const [step, setStep] = useState<Step>('login')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const t = copy[language]

  useEffect(() => {
    document.title = 'zxaiNexForge'
  }, [])

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username || '', password: values.password }),
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

  const handleRegister = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, password: values.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t.registerError)
      message.success(t.registerSuccess)
      setToken(data.access_token)
      window.location.href = '/'
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

  const loginForm = (
    <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
      <Form.Item
        name="username"
        label={t.usernameLabel}
        rules={[{ required: true, message: t.usernameLabel }]}
      >
        <Input prefix={<UserOutlined />} placeholder={t.usernamePlaceholder} size="large" />
      </Form.Item>
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
  )

  const registerForm = (
    <Form layout="vertical" onFinish={handleRegister} requiredMark={false}>
      <Form.Item
        name="username"
        label={t.usernameLabel}
        rules={[
          { required: true, message: t.usernameLabel },
          { min: 2, message: language === 'zh' ? '用户名至少 2 个字符' : 'At least 2 characters' },
        ]}
      >
        <Input prefix={<UserOutlined />} placeholder={t.usernamePlaceholder} size="large" />
      </Form.Item>
      <Form.Item
        name="password"
        label={t.accessLabel}
        rules={[
          { required: true, message: t.accessLabel },
          { min: 6, message: language === 'zh' ? '密码至少 6 位' : 'At least 6 characters' },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder={t.accessPlaceholder} size="large" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0, marginTop: 10 }}>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          {t.registerButton}
        </Button>
      </Form.Item>
    </Form>
  )

  return (
    <div className="login-scene login-scene--simple">
      <div className="login-stage__topbar login-stage__topbar--floating">
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

      <div className="login-shell login-shell--centered">
        <section className="login-panel login-panel--centered">
          <div className="login-panel__inner">
            <div className="login-panel__brand">
              <div className="login-panel__icon">
                {step === '2fa' ? <SafetyCertificateOutlined /> : <LockOutlined />}
              </div>
              <Typography.Title level={1} className="login-panel__brand-title">
                {t.title}
              </Typography.Title>
              <Typography.Text className="login-panel__brand-subtitle">
                {step === '2fa' ? t.verifyTitle : t.subtitle}
              </Typography.Text>
            </div>

            {step === '2fa' ? (
              <Form layout="vertical" onFinish={handleTotp} requiredMark={false}>
                <Typography.Text className="login-panel__description">{t.verifyDesc}</Typography.Text>
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
                  <Button type="link" size="small" onClick={() => setStep('login')}>
                    {t.back}
                  </Button>
                </div>
              </Form>
            ) : (
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                centered
                items={[
                  { key: 'login', label: t.loginTab, children: loginForm },
                  { key: 'register', label: t.registerTab, children: registerForm },
                ]}
              />
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
