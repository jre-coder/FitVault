import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { UserProfile } from '../types'
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '../services/profileStorage'

interface ProfileContextValue {
  profile: UserProfile
  isLoaded: boolean
  updateProfile: (updates: Partial<UserProfile>) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    loadProfile()
      .then(loaded => {
        setProfile(loaded)
        setIsLoaded(true)
      })
      .catch(() => {
        setIsLoaded(true)
      })
  }, [])

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates }
      saveProfile(next)
      return next
    })
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, isLoaded, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
