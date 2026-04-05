import type { ReactNode } from 'react'
import { Space, Tag, Typography } from 'antd'

const { Text, Title } = Typography

interface PageHeroProps {
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
}

export function PageHero({ title, description, actions, meta }: PageHeroProps) {
  return (
    <div className="page-hero">
      <div className="page-hero__content">
        <Title level={2} className="page-hero__title">
          {title}
        </Title>
        {description ? <Text className="page-hero__description">{description}</Text> : null}
        {meta ? <Space wrap className="page-hero__meta">{meta}</Space> : null}
      </div>
      {actions ? <div className="page-hero__actions">{actions}</div> : null}
    </div>
  )
}

export function HeroChip({ children }: { children: ReactNode }) {
  return <Tag className="hero-chip">{children}</Tag>
}
