import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface MobileStore {
  token: string | null
  roles: string[]
  member: MemberInfo | null
  agent: AgentInfo | null
  driver: AgentInfo | null   // alias for agent (same data, different key)
  activeRole: 'farmer' | 'agent' | null

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
        activeRole: state.activeRole
      })
    }
  )
)