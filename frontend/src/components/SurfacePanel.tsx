import type { ReactNode } from 'react'

interface SurfacePanelProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function SurfacePanel({
  title,
  subtitle,
  actions,
  className = '',
  bodyClassName = '',
  children,
}: SurfacePanelProps) {
  return (
    <section className={`surface-panel ${className}`.trim()}>
      {title || subtitle || actions ? (
        <div className="surface-panel__header">
          <div className="surface-panel__copy">
            {title ? <div className="surface-panel__title">{title}</div> : null}
            {subtitle ? <div className="surface-panel__subtitle">{subtitle}</div> : null}
          </div>
          {actions ? <div className="surface-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`surface-panel__body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  )
}
