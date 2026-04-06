import { useEffect, useState } from 'react'
import { App, Form, Input, Button, Typography, Space, Segmented } from 'antd'
import { LockOutlined, SafetyCertificateOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons'

import { setToken } from '@/lib/utils'
import { useUi } from '@/lib/ui'

type Step = 'password' | '2fa'

const copy = {
  zh: {
    title: 'ZXAI',
    subtitle: '控制中心',
    accessLabel: '管理员密钥',
    accessPlaceholder: '输入管理员密钥',
    accessButton: '登录',
    verifyTitle: '二次验证',
    verifyDesc: '输入 6 位验证码',
    verifyLabel: '验证码',
    verifyPlaceholder: '000000',
    verifyButton: '验证',
    back: '返回',
    loginError: '登录失败',
    verifyError: '验证失败',
    themeDark: '深色',
    themeLight: '浅色',
  },
  en: {
    title: 'ZXAI',
    subtitle: 'Control Center',
    accessLabel: 'Admin key',
    accessPlaceholder: 'Enter admin key',
    accessButton: 'Sign in',
    verifyTitle: 'Two-factor verification',
    verifyDesc: 'Enter the 6-digit code',
    verifyLabel: 'Verification code',
    verifyPlaceholder: '000000',
    verifyButton: 'Continue',
    back: 'Back',
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
