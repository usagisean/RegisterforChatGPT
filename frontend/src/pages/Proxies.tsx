import { useEffect, useState } from 'react'
import { Table, Button, Input, Tag, Space, Popconfirm, message, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapRightOutlined,
  SwapLeftOutlined,
} from '@ant-design/icons'
import { HeroChip, PageHero } from '@/components/PageHero'
import { StatTile } from '@/components/StatTile'
import { SurfacePanel } from '@/components/SurfacePanel'
import { apiFetch } from '@/lib/utils'

const { Text } = Typography

interface ProxyItem {
  id: number
  url: string
  region: string
  success_count: number
  fail_count: number
  is_active: boolean
}

interface ProxyBulkAddResponse {
  added: number
  invalid: Array<{
    line: number
    url: string
    error: string
  }>
}

interface ProxyBatchDeleteResponse {
  deleted: number
  not_found: number[]
  total_requested: number
}

export default function Proxies() {
  const [proxies, setProxies] = useState<ProxyItem[]>([])
  const [newProxy, setNewProxy] = useState('')
  const [region, setRegion] = useState('')
  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/proxies') as ProxyItem[]
      setProxies(data)
      setSelectedRowKeys((prev) => prev.filter((key) => data.some((item) => item.id === key)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!newProxy.trim()) return
    const lines = newProxy.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    try {
      if (lines.length > 1) {
        const result = await apiFetch('/proxies/bulk', {
          method: 'POST',
          body: JSON.stringify({ proxies: lines, region }),
        }) as ProxyBulkAddResponse
        message.success(`新增 ${result.added} 个代理`)
        if (result.invalid.length > 0) {
          const preview = result.invalid
            .slice(0, 3)
            .map((item) => `第 ${item.line} 行`)
            .join('，')
          message.warning(`跳过 ${result.invalid.length} 条无效代理${preview ? `：${preview}` : ''}`)
        }
      } else {
        await apiFetch('/proxies', {
          method: 'POST',
          body: JSON.stringify({ url: lines[0], region }),
        })
        message.success('添加成功')
      }
      setNewProxy('')
      setRegion('')
      await load()
    } catch (e: any) {
      message.error(`添加失败: ${e.message}`)
    }
  }

  const del = async (id: number) => {
    await apiFetch(`/proxies/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    await load()
  }

  const toggle = async (id: number) => {
    await apiFetch(`/proxies/${id}/toggle`, { method: 'PATCH' })
    await load()
  }

  const batchDelete = async () => {
    if (selectedRowKeys.length === 0) return

    const result = await apiFetch('/proxies/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: selectedRowKeys }),
    }) as ProxyBatchDeleteResponse

    message.success(`已删除 ${result.deleted} 个代理`)
    if (result.not_found.length > 0) {
      message.warning(`${result.not_found.length} 个代理不存在或已被删除`)
    }
    setSelectedRowKeys([])
    await load()
  }

  const check = async () => {
    setChecking(true)
    try {
      await apiFetch('/proxies/check', { method: 'POST' })
      setTimeout(() => {
        load()
        setChecking(false)
      }, 3000)
    } catch (e: any) {
      setChecking(false)
      message.error(`检测失败: ${e.message}`)
    }
  }

  const columns: TableColumnsType<ProxyItem> = [
    {
      title: '代理地址',
      dataIndex: 'url',
      key: 'url',
      render: (text: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
    },
    {
      title: '地区',
      dataIndex: 'region',
      key: 'region',
      render: (text: string) => text || '-',
    },
    {
      title: '成功/失败',
      key: 'stats',
      render: (_: any, record: any) => (
        <Space>
          <Tag color="success">{record.success_count}</Tag>
          <span>/</span>
          <Tag color="error">{record.fail_count}</Tag>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'} icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {active ? '活跃' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={record.is_active ? <SwapLeftOutlined /> : <SwapRightOutlined />}
            onClick={() => toggle(record.id)}
          />
          <Popconfirm title="确认删除？" onConfirm={() => del(record.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const activeCount = proxies.filter((item) => item.is_active).length
  const unhealthyCount = proxies.filter((item) => item.fail_count > item.success_count).length

  return (
    <div className="page-shell">
      <PageHero
        title="代理"
        description="导入、检测和维护当前代理池。"
        actions={(
          <Space>
            {selectedRowKeys.length > 0 && <Text type="success">已选 {selectedRowKeys.length} 个</Text>}
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`确认删除选中的 ${selectedRowKeys.length} 个代理？`}
                onConfirm={batchDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除 {selectedRowKeys.length} 个
                </Button>
              </Popconfirm>
            )}
            <Button icon={<ReloadOutlined spin={checking} />} onClick={check} loading={checking}>
              检测全部
            </Button>
          </Space>
        )}
        meta={(
          <>
            <HeroChip>代理总数 {proxies.length}</HeroChip>
            <HeroChip>已选 {selectedRowKeys.length}</HeroChip>
          </>
        )}
      />

      <div className="dashboard-metrics dashboard-metrics--three">
        <StatTile label="代理总数" value={proxies.length} tone="default" />
        <StatTile label="活跃代理" value={activeCount} tone="success" />
        <StatTile label="异常偏多" value={unhealthyCount} tone="warning" />
      </div>

      <SurfacePanel title="导入代理" subtitle="直接粘贴多行代理，系统会自动规范化并入库。">
        <div className="stack-16">
          <Input.TextArea
            value={newProxy}
            onChange={(e) => setNewProxy(e.target.value)}
            placeholder={
              '支持这些格式：\n'
              + 'http://user:pass@host:port\n'
              + 'socks5://user:pass@host:port\n'
              + 'host:port:user:pass'
            }
            rows={3}
            style={{ fontFamily: 'monospace' }}
          />
          <Text type="secondary">
            可直接粘贴 HTTP 或 SOCKS5 标准 URL；导入后会统一规范为标准 URL 存储，SOCKS5 会自动转为 `socks5h://`。
          </Text>
          <Space wrap>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="地区标签 (如 US, SG)"
              style={{ width: 200 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={add}>
              添加
            </Button>
          </Space>
        </div>
      </SurfacePanel>

      <SurfacePanel
        title="代理列表"
        subtitle="支持选择、批量删除和整池检测。"
        actions={selectedRowKeys.length > 0 ? <Text type="success">已选 {selectedRowKeys.length} 个</Text> : null}
        className="page-table-shell"
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={proxies}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as number[]),
          }}
          pagination={false}
        />
      </SurfacePanel>
    </div>
  )
}
