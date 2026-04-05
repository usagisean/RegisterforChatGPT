import { useState } from 'react'
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
          <span className="login-hero__eyebrow">HELIX ACCESS</span>
          <h1 className="login-hero__title">继续完成二次验证</h1>
          <p className="login-hero__description">
            访问密码已经通过，剩下这一步只是确认你手上的验证器。完成后会直接回到主控台。
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
                  返回密码登录
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
        <span className="login-hero__eyebrow">HELIX</span>
        <h1 className="login-hero__title">一个更像产品，而不是脚本面板的后台。</h1>
        <p className="login-hero__description">
          聚焦 ChatGPT 账号的注册、状态、代理和远端维护。所有页面都围绕一个目标设计：更快定位问题，更顺手地批量操作。
        </p>
        <div className="login-hero__grid">
          <div className="login-hero__card">
            <strong>单平台聚焦</strong>
            <span>前台只保留 ChatGPT，不再把别的平台塞进主导航里。</span>
          </div>
          <div className="login-hero__card">
            <strong>实时追踪</strong>
            <span>日志进入首页监控面板，不用一直守着弹窗。</span>
          </div>
          <div className="login-hero__card">
            <strong>高对比视图</strong>
            <span>表格、日志、控制条全部提高对比度，信息层级更直接。</span>
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
            Helix
          </Typography.Title>
          <Typography.Text className="login-panel__description">
            输入访问密码进入控制台。
          </Typography.Text>
          <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入访问密码" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                登录
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
