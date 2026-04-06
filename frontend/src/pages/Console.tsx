import { Button } from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { ActiveTaskMonitor } from '@/components/ActiveTaskMonitor'
import { SurfacePanel } from '@/components/SurfacePanel'
import { useUi } from '@/lib/ui'

export default function ConsolePage() {
  const navigate = useNavigate()
  const { language } = useUi()
  const isZh = language === 'zh'

  return (
    <div className="page-shell">
      <SurfacePanel
        className="dashboard-overview"
        bodyClassName="dashboard-overview__body"
        actions={(
          <Button type="primary" icon={<RocketOutlined />} onClick={() => navigate('/register')}>
            {isZh ? '新建注册任务' : 'New registration job'}
          </Button>
        )}
      >
        <div className="dashboard-overview__head">
          <div className="dashboard-overview__copy">
            <div className="dashboard-overview__title">{isZh ? '控制台' : 'Console'}</div>
            <div className="dashboard-overview__subtitle">
              {isZh ? '实时查看线程、热力图和日志。' : 'Live threads, heatmap and logs.'}
            </div>
          </div>
        </div>
      </SurfacePanel>

      <SurfacePanel>
        <ActiveTaskMonitor showEmptyState />
      </SurfacePanel>
    </div>
  )
}
