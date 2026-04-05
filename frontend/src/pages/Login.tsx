import { useEffect, useState } from 'react'
import { App, ConfigProvider, Form, Input, Button, Typography } from 'antd'
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { setToken } from '@/lib/utils'
import { darkTheme } from '@/theme'

type Step = 'password' | '2fa'

function LoginContent() {
  const { message } = App.useApp()
  const [step, setStep] = useState<Step>('password')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)

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
      if (!res.ok) throw new Error(data.detail || '登录失败')
      if (data.requires_2fa) {
        setTempToken(data.temp_token)
        setStep('2fa')
      } else {
        setToken(data.access_token)
        window.location.href = '/'
      }
    } catch (e: any) {
      message.error(e.message)
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
      if (!res.ok) throw new Error(data.detail || '验证失败')
      setToken(data.access_token)
      window.location.href = '/'
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === '2fa') {
    return (
      <div className="login-shell">
        <div className="login-hero">
          <span className="login-hero__eyebrow">ZXAI ACCESS</span>
          <h1 className="login-hero__title">继续完成管理员验证</h1>
          <p className="login-hero__description">
            管理员密钥已经通过，剩下这一步只是确认你手上的验证器。完成后会直接回到主控台。
          </p>
        </div>
        <div className="login-panel">
          <div className="login-panel__inner">
            <div className="login-panel__icon">
              <SafetyCertificateOutlined />
            </div>
            <Typography.Title level={2} className="login-panel__title">
              双因素验证
            </Typography.Title>
            <Typography.Text className="login-panel__description">
              请输入验证器 App 中的 6 位验证码。
            </Typography.Text>
            <Form layout="vertical" onFinish={handleTotp} requiredMark={false}>
              <Form.Item
                name="code"
                label="验证码"
                rules={[
                  { required: true, message: '请输入验证码' },
                  { len: 6, message: '验证码为 6 位数字' },
                ]}
              >
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="000000"
                  size="large"
                  maxLength={6}
                  style={{ letterSpacing: 6, textAlign: 'center' }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                  验证并登录
                </Button>
              </Form.Item>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Button type="link" size="small" onClick={() => setStep('password')}>
                  返回管理员密钥登录
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <span className="login-hero__eyebrow">ZXAI</span>
        <h1 className="login-hero__title">只为你自己保留入口的 ChatGPT 控制台。</h1>
        <p className="login-hero__description">
          通过管理员密钥进入后台。所有页面只保留 ChatGPT 相关工作流，适合在本地或 VPS 上长期运行和盯盘。
        </p>
        <div className="login-hero__grid">
          <div className="login-hero__card">
            <strong>管理员密钥</strong>
            <span>启用后，页面和 API 都必须先通过管理员密钥验证。</span>
          </div>
          <div className="login-hero__card">
            <strong>实时追踪</strong>
            <span>日志进入首页监控面板，不用一直守着弹窗。</span>
          </div>
          <div className="login-hero__card">
            <strong>手机兼容</strong>
            <span>iPhone 打开也能正常导航、滚动和查看监控墙。</span>
          </div>
          <div className="login-hero__card">
            <strong>长期运行</strong>
            <span>本地和 VPS 用同一套入口，不用切换另一套工作方式。</span>
          </div>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-panel__inner">
          <div className="login-panel__icon">
            <UserOutlined />
          </div>
          <Typography.Title level={2} className="login-panel__title">
            zxai
          </Typography.Title>
          <Typography.Text className="login-panel__description">
            输入管理员密钥进入控制台。
          </Typography.Text>
          <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
            <Form.Item
              name="password"
              label="管理员密钥"
              rules={[{ required: true, message: '请输入管理员密钥' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入管理员密钥" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                进入后台
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <ConfigProvider theme={darkTheme}>
      <App>
        <LoginContent />
      </App>
    </ConfigProvider>
  )
}
