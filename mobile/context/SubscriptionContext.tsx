import React, { createContext, useCallback, useContext, useState } from 'react'
import { SubscriptionProduct } from '../types'

interface SubscriptionContextValue {
  isPremium: boolean
  products: SubscriptionProduct[]
  isPurchasing: boolean
  purchase: (productId: string) => Promise<void>
  restore: () => Promise<void>
}

const MOCK_PRODUCTS: SubscriptionProduct[] = [
  {
    id: 'fitvault_yearly',
    title: 'Annual',
    price: '$29.99/year',
    period: 'year',
    badge: 'Best Value',
  },
  {
    id: 'fitvault_monthly',
    title: 'Monthly',
    price: '$4.99/month',
    period: 'month',
  },
]

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  // TODO: Replace with react-native-iap or RevenueCat
  const purchase = useCallback(async (_productId: string): Promise<void> => {
    setIsPurchasing(true)
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    setIsPremium(true)
    setIsPurchasing(false)
  }, [])

  // TODO: Replace with react-native-iap or RevenueCat
  const restore = useCallback(async (): Promise<void> => {
    setIsPurchasing(true)
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    setIsPurchasing(false)
  }, [])

  return (
    <SubscriptionContext.Provider
      value={{ isPremium, products: MOCK_PRODUCTS, isPurchasing, purchase, restore }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
