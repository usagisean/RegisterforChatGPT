import { useCallback, useEffect, useState } from 'react'
import { Table, Select, Button, Tag, Space, Popconfirm, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { HeroChip, PageHero } from '@/components/PageHero'
import { StatTile } from '@/components/StatTile'
import { SurfacePanel } from '@/components/SurfacePanel'
import { apiFetch } from '@/lib/utils'

const { Text } = Typography

interface TaskLogItem {
  id: number
  created_at: string
  platform: string
  email: string
  status: 'success' | 'failed'
  error: string
}

interface TaskLogListResponse {
  total: number
  items: TaskLogItem[]
}

interface TaskLogBatchDeleteResponse {
  deleted: number
  not_found: number[]
  total_requested: number
}

export default function TaskHistory() {
  const [logs, setLogs] = useState<TaskLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [platform, setPlatform] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      if (platform) params.set('platform', platform)
      const data = await apiFetch(`/tasks/logs?${params}`) as TaskLogListResponse
      setLogs(data.items || [])
      setTotal(data.total || 0)
      setSelectedRowKeys((prev) => prev.filter((key) => data.items.some((item) => item.id === key)))
    } finally {
      setLoading(false)
    }
  }, [platform])

  useEffect(() => {
    load()
  }, [load])

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return

    const result = await apiFetch('/tasks/logs/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: selectedRowKeys }),
    }) as TaskLogBatchDeleteResponse

    message.success(`已删除 ${result.deleted} 条任务历史`)
    if (result.not_found.length > 0) {
      message.warning(`${result.not_found.length} 条记录不存在或已被删除`)
    }
    setSelectedRowKeys([])
    await load()
  }

  const columns: TableColumnsType<TaskLogItem> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (text: string) => text || '-',
    },
  ]

  const successCount = logs.filter((item) => item.status === 'success').length
  const failedCount = logs.filter((item) => item.status === 'failed').length

  return (
    <div className="page-shell">
      <PageHero
        title="任务"
        description="查看执行记录和失败原因。"
        actions={(
          <Space>
            <Text type="secondary">{total} 条记录</Text>
            {selectedRowKeys.length > 0 && <Text type="success">已选 {selectedRowKeys.length} 条</Text>}
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`确认删除选中的 ${selectedRowKeys.length} 条任务历史？`}
                onConfirm={handleBatchDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除 {selectedRowKeys.length} 条
                </Button>
              </Popconfirm>
            )}
            <Select
              value={platform}
              onChange={(value) => {
                setPlatform(value)
                setSelectedRowKeys([])
              }}
              style={{ width: 140 }}
              options={[
                { value: '', label: '全部任务' },
                { value: 'chatgpt', label: 'ChatGPT' },
              ]}
            />
            <Button icon={<ReloadOutlined spin={loading} />} onClick={load} loading={loading} />
          </Space>
        )}
        meta={(
          <>
            <HeroChip>历史记录 {total}</HeroChip>
            <HeroChip>已选 {selectedRowKeys.length}</HeroChip>
          </>
        )}
      />

      <div className="dashboard-metrics dashboard-metrics--three">
        <StatTile label="最近记录" value={logs.length} tone="default" />
        <StatTile label="成功" value={successCount} tone="success" />
        <StatTile label="失败" value={failedCount} tone="danger" />
      </div>

      <SurfacePanel
        title="执行历史"
        subtitle="保留最近任务结果，支持按平台筛选和批量删除。"
        actions={(
          <Space wrap>
            <Select
              value={platform}
              onChange={(value) => {
                setPlatform(value)
                setSelectedRowKeys([])
              }}
              style={{ width: 140 }}
              options={[
                { value: '', label: '全部任务' },
                { value: 'chatgpt', label: 'ChatGPT' },
              ]}
            />
            <Button icon={<ReloadOutlined spin={loading} />} onClick={load} loading={loading}>
              刷新
            </Button>
          </Space>
        )}
        className="page-table-shell"
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as number[]),
          }}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />
      </SurfacePanel>
    </div>
  )
}
