import { Button, Space } from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { ActiveTaskMonitor } from '@/components/ActiveTaskMonitor'
import { HeroChip, PageHero } from '@/components/PageHero'

export default function ConsolePage() {
  const navigate = useNavigate()

  return (
    <div className="page-shell">
      <PageHero
        title="实时控制台"
        description="单独查看当前任务的实时状态和日志，不影响你继续操作其他页面。"
        actions={(
          <Space>
            <Button type="primary" icon={<RocketOutlined />} onClick={() => navigate('/register')}>
              新建任务
            </Button>
          </Space>
        )}
        meta={(
          <>
            <HeroChip>独立页面</HeroChip>
            <HeroChip>自动追踪</HeroChip>
          </>
        )}
      />

      <ActiveTaskMonitor showEmptyState />
    </div>
  )
}
