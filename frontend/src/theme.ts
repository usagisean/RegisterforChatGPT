import { theme } from 'antd'

const sharedComponents = {
  Layout: {
    headerBg: 'transparent',
  },
  Card: {
    borderRadiusLG: 24,
  },
  Button: {
    borderRadius: 14,
    controlHeight: 40,
    fontWeight: 600,
  },
  Input: {
    borderRadius: 14,
    controlHeight: 44,
  },
  InputNumber: {
    borderRadius: 14,
    controlHeight: 44,
  },
  Select: {
    borderRadius: 14,
    controlHeight: 44,
  },
  Table: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  Modal: {
    borderRadiusLG: 24,
  },
  Tabs: {
    itemBorderRadius: 14,
    cardGutter: 10,
  },
}

const darkTheme = {
  token: {
    colorPrimary: '#5b8cff',
    colorSuccess: '#34d399',
    colorWarning: '#fbbf24',
    colorInfo: '#60a5fa',
    colorError: '#fb7185',
    colorBgBase: '#000000',
    colorBgLayout: '#000000',
    colorBgContainer: '#0a0a0a',
    colorBgElevated: '#101010',
    colorFillAlter: 'rgba(255,255,255,0.05)',
    colorBorder: 'rgba(255,255,255,0.09)',
    colorText: '#f3f6fb',
    colorTextSecondary: '#afb7c7',
    colorTextTertiary: '#7d8595',
    borderRadius: 14,
    borderRadiusLG: 24,
    boxShadowSecondary: '0 28px 80px rgba(0, 0, 0, 0.55)',
  },
  components: {
    ...sharedComponents,
    Layout: {
      ...sharedComponents.Layout,
      siderBg: '#101722',
      triggerBg: '#101722',
      triggerColor: '#f3f6fb',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkPopupBg: '#101722',
      darkItemSelectedBg: 'rgba(91, 140, 255, 0.16)',
      darkItemSelectedColor: '#eef4ff',
      darkItemHoverBg: 'rgba(255,255,255,0.04)',
      darkItemColor: '#8ea0b8',
      darkSubMenuItemBg: 'transparent',
      itemBorderRadius: 16,
      itemMarginInline: 10,
      itemMarginBlock: 6,
    },
    Table: {
      ...sharedComponents.Table,
      headerBg: 'rgba(255,255,255,0.02)',
      rowHoverBg: 'rgba(255,255,255,0.03)',
    },
  },
  algorithm: theme.darkAlgorithm,
}

const lightTheme = {
  token: {
    colorPrimary: '#356dff',
    colorSuccess: '#0f9f6e',
    colorWarning: '#be7a00',
    colorInfo: '#2563eb',
    colorError: '#e14b69',
    colorBgBase: '#ffffff',
    colorBgLayout: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorFillAlter: 'rgba(18,32,46,0.035)',
    colorBorder: 'rgba(18,32,46,0.12)',
    colorText: '#050505',
    colorTextSecondary: '#4b5565',
    colorTextTertiary: '#7b8493',
    borderRadius: 14,
    borderRadiusLG: 24,
    boxShadowSecondary: '0 24px 70px rgba(15, 23, 42, 0.08)',
  },
  components: {
    ...sharedComponents,
    Layout: {
      ...sharedComponents.Layout,
      siderBg: '#ffffff',
      triggerBg: '#ffffff',
      triggerColor: '#172230',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#5f6f82',
      itemHoverBg: 'rgba(23,34,48,0.04)',
      itemSelectedBg: 'rgba(53, 109, 255, 0.1)',
      itemSelectedColor: '#1f4fc7',
      itemBorderRadius: 16,
      itemMarginInline: 10,
      itemMarginBlock: 6,
    },
    Table: {
      ...sharedComponents.Table,
      headerBg: 'rgba(23,34,48,0.025)',
      rowHoverBg: 'rgba(23,34,48,0.02)',
    },
  },
  algorithm: theme.defaultAlgorithm,
}

export { darkTheme, lightTheme }
