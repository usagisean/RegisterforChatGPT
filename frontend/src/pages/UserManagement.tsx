/**
 * 用户管理 + 兑换码管理页面（仅管理员可见）
 */
import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Tag, Button, Space, Modal, InputNumber, Select,
  Switch, App, Typography, Tabs, Input, Popconfirm,
} from 'antd'
import {
  UserOutlined, GiftOutlined, CopyOutlined, DeleteOutlined,
  PlusOutlined, CrownOutlined,
} from '@ant-design/icons'
import { getToken } from '@/lib/utils'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
})

interface User {
  id: number
  username: string
  role: string
  quota: number
  total_redeemed: number
  total_consumed: number
  is_active: boolean
  created_at?: string
}

interface RedeemCode {
  id: number
  code: string
  quota: number
  used_by: number | null
  used_at: string | null
  created_at: string
}

function UsersTab() {
  const { message } = App.useApp()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?page=${p}&page_size=20`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.items || [])
        setTotal(data.total || 0)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers(1) }, [fetchUsers])

  const handleToggleActive = async (userId: number, active: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ is_active: active }),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      message.success(active ? '已启用' : '已禁用')
      fetchUsers(page)
    } catch (err: any) { message.error(err.message) }
  }

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      message.success('角色已更新')
      fetchUsers(page)
    } catch (err: any) { message.error(err.message) }
  }

  const handleQuotaAdjust = async (userId: number) => {
    let amount = 0
    Modal.confirm({
      title: '调整额度',
      content: (
        <div style={{ marginTop: 16 }}>
          <InputNumber
            style={{ width: '100%' }}
            placeholder="正数加额度，负数减额度"
            onChange={(v) => { amount = v as number }}
          />
        </div>
      ),
      onOk: async () => {
        if (!amount) return
        try {
          const res = await fetch(`/api/users/${userId}`, {
            method: 'PATCH', headers: authHeaders(),
            body: JSON.stringify({ quota_adjust: amount }),
          })
          if (!res.ok) throw new Error((await res.json()).detail)
          message.success(`额度已调整 ${amount > 0 ? '+' : ''}${amount}`)
          fetchUsers(page)
        } catch (err: any) { message.error(err.message) }
      },
    })
  }

  const handleDelete = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      message.success('已删除')
      fetchUsers(page)
    } catch (err: any) { message.error(err.message) }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '用户名', dataIndex: 'username', key: 'username',
      render: (v: string, r: User) => (
        <Space>
          {v}
          {r.role === 'admin' && <Tag icon={<CrownOutlined />} color="gold">管理员</Tag>}
        </Space>
      ),
    },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 120,
      render: (v: string, r: User) => (
        <Select
          size="small" value={v} style={{ width: 100 }}
          onChange={(val) => handleRoleChange(r.id, val)}
          options={[
            { label: '管理员', value: 'admin' },
            { label: '用户', value: 'user' },
          ]}
        />
      ),
    },
    {
      title: '额度', dataIndex: 'quota', key: 'quota', width: 100,
      render: (v: number) => <Tag color={v > 0 ? 'green' : 'default'}>{v}</Tag>,
    },
    { title: '已充值', dataIndex: 'total_redeemed', key: 'total_redeemed', width: 80 },
    { title: '已消耗', dataIndex: 'total_consumed', key: 'total_consumed', width: 80 },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80,
      render: (v: boolean, r: User) => (
        <Switch size="small" checked={v} onChange={(checked) => handleToggleActive(r.id, checked)} />
      ),
    },
    {
      title: '操作', key: 'actions', width: 160,
      render: (_: any, r: User) => (
        <Space size="small">
          <Button size="small" onClick={() => handleQuotaAdjust(r.id)}>调额度</Button>
          <Popconfirm title="确认删除此用户？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={users}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{
        current: page, total, pageSize: 20, showSizeChanger: false,
        onChange: (p) => { setPage(p); fetchUsers(p) },
      }}
    />
  )
}

function RedeemCodesTab() {
  const { message } = App.useApp()
  const [codes, setCodes] = useState<RedeemCode[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [genCount, setGenCount] = useState(10)
  const [genQuota, setGenQuota] = useState(1)
  const [genLoading, setGenLoading] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  const fetchCodes = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/redeem/list?page=${p}&page_size=20`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCodes(data.items || [])
        setTotal(data.total || 0)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCodes(1) }, [fetchCodes])

  const handleGenerate = async () => {
    setGenLoading(true)
    try {
      const res = await fetch('/api/redeem/generate', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ count: genCount, quota: genQuota }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      const newCodes = (data.codes || []).map((c: any) => c.code)
      setGeneratedCodes(newCodes)
      message.success(`已生成 ${newCodes.length} 个兑换码`)
      fetchCodes(1)
      setPage(1)
    } catch (err: any) { message.error(err.message) } finally {
      setGenLoading(false)
    }
  }

  const handleCopyAll = () => {
    const text = generatedCodes.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/redeem/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      message.success('已删除')
      fetchCodes(page)
    } catch (err: any) { message.error(err.message) }
  }

  const columns = [
    {
      title: '兑换码', dataIndex: 'code', key: 'code',
      render: (v: string) => (
        <Typography.Text copyable style={{ fontFamily: 'monospace' }}>{v}</Typography.Text>
      ),
    },
    {
      title: '额度', dataIndex: 'quota', key: 'quota', width: 80,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '状态', key: 'status', width: 100,
      render: (_: any, r: RedeemCode) => (
        r.used_by
          ? <Tag color="default">已使用</Tag>
          : <Tag color="green">未使用</Tag>
      ),
    },
    {
      title: '使用时间', dataIndex: 'used_at', key: 'used_at', width: 180,
      render: (v: string | null) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '操作', key: 'actions', width: 80,
      render: (_: any, r: RedeemCode) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      {/* 生成器 */}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>生成数量：</span>
          <InputNumber min={1} max={100} value={genCount} onChange={(v) => setGenCount(v || 1)} />
          <span>每码额度：</span>
          <InputNumber min={1} max={10000} value={genQuota} onChange={(v) => setGenQuota(v || 1)} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={genLoading}
            onClick={handleGenerate}
          >
            批量生成
          </Button>
        </Space>
      </Card>

      {/* 刚刚生成的兑换码 */}
      {generatedCodes.length > 0 && (
        <Card
          title={`刚刚生成的 ${generatedCodes.length} 个兑换码`}
          bordered={false}
          style={{ marginBottom: 16 }}
          extra={
            <Button icon={<CopyOutlined />} onClick={handleCopyAll}>
              一键复制
            </Button>
          }
        >
          <Input.TextArea
            value={generatedCodes.join('\n')}
            readOnly
            rows={Math.min(generatedCodes.length, 10)}
            style={{ fontFamily: 'monospace' }}
          />
        </Card>
      )}

      {/* 兑换码列表 */}
      <Table
        columns={columns}
        dataSource={codes}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: page, total, pageSize: 20, showSizeChanger: false,
          onChange: (p) => { setPage(p); fetchCodes(p) },
        }}
      />
    </div>
  )
}

export default function UserManagement() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        用户与兑换码管理
      </Typography.Title>

      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: <><UserOutlined /> 用户管理</>,
            children: <UsersTab />,
          },
          {
            key: 'redeem',
            label: <><GiftOutlined /> 兑换码管理</>,
            children: <RedeemCodesTab />,
          },
        ]}
      />
    </div>
  )
}
