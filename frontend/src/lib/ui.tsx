import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type AppThemeMode = 'dark' | 'light'
export type AppLanguage = 'zh' | 'en'

interface UiContextValue {
  themeMode: AppThemeMode
  setThemeMode: (mode: AppThemeMode) => void
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  isZh: boolean
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<AppThemeMode>(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'light' ? 'light' : 'dark'
  })
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('language')
    return saved === 'en' ? 'en' : 'zh'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', themeMode === 'light')
    document.documentElement.dataset.theme = themeMode
    document.documentElement.style.colorScheme = themeMode
    localStorage.setItem('theme', themeMode)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.documentElement.dataset.language = language
    localStorage.setItem('language', language)
  }, [language])

  return (
    <UiContext.Provider
      value={{
        themeMode,
        setThemeMode,
        language,
        setLanguage,
        isZh: language === 'zh',
      }}
    >
      {children}
    </UiContext.Provider>
  )
}

export function useUi() {
  const context = useContext(UiContext)
  if (!context) {
    throw new Error('useUi must be used within UiProvider')
  }
  return context
}
