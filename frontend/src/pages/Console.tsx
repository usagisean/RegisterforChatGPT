import { Button, Space } from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { ActiveTaskMonitor } from '@/components/ActiveTaskMonitor'
import { HeroChip, PageHero } from '@/components/PageHero'
import { useUi } from '@/lib/ui'

export default function ConsolePage() {
  const navigate = useNavigate()
  const { language } = useUi()
  const isZh = language === 'zh'

  return (
    <div className="page-shell">
      <PageHero
        title={isZh ? '实时控制台' : 'Live console'}
        description={isZh ? '单独查看当前任务的实时状态和日志，不影响你继续操作其他页面。' : 'Track active jobs and logs in a dedicated view without blocking the rest of the app.'}
        actions={(
          <Space>
            <Button type="primary" icon={<RocketOutlined />} onClick={() => navigate('/register')}>
              {isZh ? '新建任务' : 'New run'}
            </Button>
          </Space>
        )}
        meta={(
          <>
            <HeroChip>{isZh ? '独立页面' : 'Dedicated page'}</HeroChip>
            <HeroChip>{isZh ? '自动追踪' : 'Auto tracking'}</HeroChip>
          </>
        )}
      />

      <ActiveTaskMonitor showEmptyState />
    </div>
  )
}
