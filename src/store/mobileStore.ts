import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '../lib/i18n'

interface MemberInfo {
  id: string
  fullName: string
  memberNumber: string
  phoneNumber: string
  village?: string
  ward?: string
  status?: string
  profilePhotoUrl?: string
  harvestAccountBalance?: number
  harvestAccountNumber?: string
  loanScore?: number
  maxLoanAmount?: number
}

interface AgentInfo {
  id: string
  fullName: string
  phoneNumber: string
  vehicleReg?: string
  vehicleType?: string
  agentCode?: string
  role?: string
}

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
  harvestId?: string
  loanId?: string
}

const MAX_NOTIFICATIONS = 50

interface MobileStore {
  token: string | null
  roles: string[]
  member: MemberInfo | null
  agent: AgentInfo | null
  driver: AgentInfo | null   // alias for agent (same data, different key)
  activeRole: 'farmer' | 'agent' | null
  language: Language
  notifications: AppNotification[]

  // Actions
  setAuth: (data: {
    token: string
    roles: string[]
    member: MemberInfo | null
    agent: AgentInfo | null
    driver: AgentInfo | null
  }) => void
  setMember: (member: MemberInfo) => void
  setActiveRole: (role: 'farmer' | 'agent') => void
  setLanguage: (language: Language) => void
  setToken: (token: string) => void
  addNotification: (n: Omit<AppNotification, 'id' | 'read'>) => void
  markAllNotificationsRead: () => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  logout: () => void
}

export const useMobileStore = create<MobileStore>()(
  persist(
    (set) => ({
      token: null,
      roles: [],
      member: null,
      agent: null,
      driver: null,
      activeRole: null,
      language: 'en',
      notifications: [],

      setAuth: (data) => set({
        token: data.token,
        roles: data.roles,
        member: data.member,
        agent: data.agent,
        driver: data.driver,
        activeRole: data.roles.includes('farmer') ? 'farmer' : data.roles.includes('agent') ? 'agent' : null
      }),

      setMember: (member) => set({ member }),

      setActiveRole: (role) => set({ activeRole: role }),

      setLanguage: (language) => set({ language }),

      // Swaps in a freshly-issued token without touching the rest of the
      // session (used by the api.ts response interceptor when the backend
      // opportunistically refreshes a soon-to-expire token).
      setToken: (token) => set({ token }),

      addNotification: (n) => set((state) => {
        // De-dupe: EventSource + a fast refresh could otherwise double-add
        // the exact same event if both fire close together.
        const isDup = state.notifications.some(
          existing => existing.type === n.type && existing.message === n.message &&
            Math.abs(new Date(existing.createdAt).getTime() - new Date(n.createdAt).getTime()) < 2000
        )
        if (isDup) return state
        const withId: AppNotification = { ...n, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, read: false }
        return { notifications: [withId, ...state.notifications].slice(0, MAX_NOTIFICATIONS) }
      }),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      })),

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),

      clearNotifications: () => set({ notifications: [] }),

      // Note: language and notifications are intentionally NOT reset here —
      // they're device/user preferences that should survive logging out and
      // logging back in (e.g. an agent checking a message after signing out).
      logout: () => set({
        token: null,
        roles: [],
        member: null,
        agent: null,
        driver: null,
        activeRole: null
      })
    }),
    {
      name: 'igembe-mobile-auth',
      partialize: (state) => ({
        token: state.token,
        roles: state.roles,
        member: state.member,
        agent: state.agent,
        driver: state.driver,
        activeRole: state.activeRole,
        language: state.language,
        notifications: state.notifications
      })
    }
  )
)