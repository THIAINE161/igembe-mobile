import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MobileState {
  token: string | null
  roles: string[]
  activeRole: string | null
  member: any | null
  agent: any | null
  driver: any | null
  isAuthenticated: boolean
  login: (token: string, member: any, agent: any, roles: string[]) => void
  setActiveRole: (role: string) => void
  updateMember: (member: any) => void
  updateAgent: (agent: any) => void
  logout: () => void
}

export const useMobileStore = create<MobileState>()(
  persist(
    (set) => ({
      token: null,
      roles: [],
      activeRole: null,
      member: null,
      agent: null,
      driver: null,
      isAuthenticated: false,

      login: (token, member, agent, roles) => {
        localStorage.setItem('mobile_token', token)
        set({
          token,
          member,
          agent,
          driver: agent,
          roles,
          activeRole: roles[0],
          isAuthenticated: true
        })
      },

      setActiveRole: (role) => set({ activeRole: role }),
      updateMember: (member) => set({ member }),
      updateAgent: (agent) => set({ agent, driver: agent }),

      logout: () => {
        localStorage.removeItem('mobile_token')
        set({
          token: null,
          member: null,
          agent: null,
          driver: null,
          roles: [],
          activeRole: null,
          isAuthenticated: false
        })
      }
    }),
    { name: 'mobile-store' }
  )
)