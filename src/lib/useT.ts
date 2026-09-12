import { useMobileStore } from '../store/mobileStore'
import { translate } from './i18n'

// Usage: const t = useT(); t('nav.home'); t('farmerHome.todayLimitMax', { max: 50 })
export function useT() {
  const language = useMobileStore(s => s.language)
  return (key: string, vars?: Record<string, string | number>) => translate(language, key, vars)
}
