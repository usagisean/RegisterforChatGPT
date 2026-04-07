/**
 * 个人中心页面
 * 展示用户额度信息和兑换码充值入口
 */
import { useEffect, useState, useCallback } from 'react'
import {
  Card, Input, Button, Table, Tag, Statistic, Row, Col, Space,
  App, Typography,
} from 'antd'
import {
  WalletOutlined, GiftOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { getToken } from '@/lib/utils'

interface UserInfo {
  uid: number
  username: string
  role: string
  quota: number
  total_redeemed: number
  total_consumed: number
  is_active: boolean
  created_at?: string
}

interface QuotaLog {
  id: number
  user_id: number
  change: number
  balance_after: number
  reason: string
  created_at: string
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
})

export default function Profile() {
  const { message } = App.useApp()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [logs, setLogs] = useState<QuotaLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { headers: authHeaders() })
      if (res.ok) {
        setUserInfo(await res.json())
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchLogs = useCallback(async (page: number) => {
    try {
      const res = await fetch(`/api/redeem/logs?page=${page}&page_size=10`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.items || [])
        setLogsTotal(data.total || 0)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchUser(), fetchLogs(1)]).finally(() => setLoading(false))
  }, [fetchUser, fetchLogs])

  const handleRedeem = async () => {
    const code = redeemCode.trim()
    if (!code) {
      message.warning('请输入兑换码')
      return
    }
    setRedeemLoading(true)
    try {
      const res = await fetch('/api/redeem/use', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '兑换失败')
      message.success(data.message || '兑换成功')
      setRedeemCode('')
      fetchUser()
      fetchLogs(1)
      setLogsPage(1)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setRedeemLoading(false)
    }
  }

  const isAdmin = userInfo?.role === 'admin'
  const isUnlimited = userInfo?.quota === -1

  const columns = [
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '变动', dataIndex: 'change', key: 'change', width: 100,
      render: (v: number) => (
        <Tag
          color={v > 0 ? 'green' : 'red'}
          icon={v > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        >
          {v > 0 ? `+${v}` : v}
        </Tag>
      ),
    },
    {
      title: '余额', dataIndex: 'balance_after', key: 'balance_after', width: 100,
    },
    {
      title: '原因', dataIndex: 'reason', key: 'reason',
      render: (v: string) => {
        if (v?.startsWith('redeem:')) return <Tag color="blue">兑换码: {v.replace('redeem:', '')}</Tag>
        if (v?.startsWith('cpa_upload:')) return <Tag color="orange">CPA 上传</Tag>
        if (v?.startsWith('admin_adjust:')) return <Tag color="purple">管理员调整</Tag>
        return v || '-'
      },
    },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        <WalletOutlined style={{ marginRight: 8 }} />
        个人中心
      </Typography.Title>

      {/* 额度卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic
              title="当前额度"
              value={isUnlimited ? '无限' : (userInfo?.quota ?? 0)}
              prefix={isAdmin ? <CrownOutlined /> : <WalletOutlined />}
              suffix={isUnlimited ? '' : '次'}
              valueStyle={{ color: isUnlimited ? '#52c41a' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic
              title="累计充值"
              value={userInfo?.total_redeemed ?? 0}
              prefix={<ArrowUpOutlined />}
              suffix="次"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic
              title="已消耗"
              value={userInfo?.total_consumed ?? 0}
              prefix={<ArrowDownOutlined />}
              suffix="次"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 兑换码充值 */}
      {!isUnlimited && (
        <Card
          title={<><GiftOutlined style={{ marginRight: 8 }} />兑换码充值</>}
          bordered={false}
          style={{ marginBottom: 24 }}
        >
          <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
            <Input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="请输入兑换码 (如 NEXF-XXXX-XXXX-XXXX)"
              size="large"
              style={{ fontFamily: 'monospace', letterSpacing: 1 }}
              onPressEnter={handleRedeem}
            />
            <Button
              type="primary"
              size="large"
              loading={redeemLoading}
              onClick={handleRedeem}
            >
              兑换
            </Button>
          </Space.Compact>
        </Card>
      )}

      {/* 额度流水 */}
      <Card
        title="额度流水"
        bordered={false}
      >
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: logsPage,
            total: logsTotal,
            pageSize: 10,
            showSizeChanger: false,
            onChange: (page) => {
              setLogsPage(page)
              fetchLogs(page)
            },
          }}
        />
      </Card>
    </div>
  )
}
