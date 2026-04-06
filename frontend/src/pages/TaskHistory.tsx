import { useCallback, useEffect, useState } from 'react'
import { Table, Select, Button, Tag, Space, Popconfirm, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { ReloadOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons'

import { StatTile } from '@/components/StatTile'
import { SurfacePanel } from '@/components/SurfacePanel'
import { useUi } from '@/lib/ui'
import { apiFetch } from '@/lib/utils'

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

const copy = {
  zh: {
    title: '历史',
    subtitle: '任务结果与失败原因',
    refresh: '刷新',
    records: '记录数',
    success: '成功',
    failed: '失败',
    all: '全部任务',
    tableTitle: '执行历史',
    tableDesc: '保留最近任务结果，支持筛选和批量删除。',
    selected: '已选',
    deleteSelected: '删除所选',
    columns: {
      time: '时间',
      platform: '平台',
      email: '邮箱',
      status: '状态',
      error: '错误信息',
    },
    status: {
      success: '成功',
      failed: '失败',
    },
  },
  en: {
    title: 'History',
    subtitle: 'job results and failure reasons',
    refresh: 'Refresh',
    records: 'Records',
    success: 'Success',
    failed: 'Failed',
    all: 'All jobs',
    tableTitle: 'Execution history',
    tableDesc: 'Recent jobs, filters and batch deletion.',
    selected: 'Selected',
    deleteSelected: 'Delete selected',
    columns: {
      time: 'Time',
      platform: 'Platform',
      email: 'Email',
      status: 'Status',
      error: 'Error',
    },
    status: {
      success: 'Success',
      failed: 'Failed',
    },
  },
} as const

export default function TaskHistory() {
  const { language } = useUi()
  const t = copy[language]
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

    message.success(`${t.deleteSelected} ${result.deleted}`)
    if (result.not_found.length > 0) {
      message.warning(`${result.not_found.length} missing`)
    }
    setSelectedRowKeys([])
    await load()
  }

  const columns: TableColumnsType<TaskLogItem> = [
    {
      title: t.columns.time,
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US') : '-'),
    },
    {
      title: t.columns.platform,
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: t.columns.email,
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
    },
    {
      title: t.columns.status,
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>
          {status === 'success' ? t.status.success : t.status.failed}
        </Tag>
      ),
    },
    {
      title: t.columns.error,
      dataIndex: 'error',
      key: 'error',
      render: (text: string) => text || '-',
    },
  ]

  const successCount = logs.filter((item) => item.status === 'success').length
  const failedCount = logs.filter((item) => item.status === 'failed').length

  return (
    <div className="page-shell">
      <SurfacePanel
        className="dashboard-overview"
        bodyClassName="dashboard-overview__body"
        actions={(
          <Button icon={<ReloadOutlined spin={loading} />} onClick={load} loading={loading}>
            {t.refresh}
          </Button>
        )}
      >
        <div className="dashboard-overview__head">
          <div className="dashboard-overview__copy">
            <div className="dashboard-overview__title">{t.title}</div>
            <div className="dashboard-overview__subtitle">{t.subtitle}</div>
          </div>
          <div className="dashboard-overview__meta">
            <span>{t.records} {total}</span>
            <span>{t.selected} {selectedRowKeys.length}</span>
          </div>
        </div>

        <div className="dashboard-metrics dashboard-metrics--three">
          <StatTile label={t.records} value={logs.length} icon={<HistoryOutlined />} />
          <StatTile label={t.success} value={successCount} tone="success" />
          <StatTile label={t.failed} value={failedCount} tone="danger" />
        </div>
      </SurfacePanel>

      <SurfacePanel
        title={t.tableTitle}
        subtitle={t.tableDesc}
        actions={(
          <Space wrap>
            <Select
              value={platform}
              onChange={(value) => {
                setPlatform(value)
                setSelectedRowKeys([])
              }}
              style={{ width: 160 }}
              options={[
                { value: '', label: t.all },
                { value: 'chatgpt', label: 'ChatGPT' },
              ]}
            />
            {selectedRowKeys.length > 0 && (
              <Popconfirm title={`${t.deleteSelected} ${selectedRowKeys.length} ?`} onConfirm={handleBatchDelete}>
                <Button danger icon={<DeleteOutlined />}>
                  {t.deleteSelected} {selectedRowKeys.length}
                </Button>
              </Popconfirm>
            )}
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
