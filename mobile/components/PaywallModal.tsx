import React from 'react'
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import { useSubscription } from '../context/SubscriptionContext'

interface PaywallModalProps {
  visible: boolean
  onClose: () => void
}

const FEATURES = [
  {
    icon: 'sparkles-outline',
    title: 'Fix My Workout',
    detail: 'AI diagnoses your workout and delivers an optimized plan',
  },
  {
    icon: 'trophy-outline',
    title: 'Discover Top Workouts',
    detail: 'AI-curated top workouts for any muscle group',
  },
  {
    icon: 'copy-outline',
    title: 'Find Similar',
    detail: 'Find workouts similar to ones you already love',
  },
  {
    icon: 'person-outline',
    title: 'Personalized Recommendations',
    detail: 'Tailored to your goals, level, and equipment',
  },
]

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { products, isPurchasing, purchase, restore } = useSubscription()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.secondaryText} />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="sparkles" size={48} color={COLORS.accent} />
            </View>
            <Text style={styles.heroTitle}>FitVault Premium</Text>
            <Text style={styles.heroSubtitle}>Unlock AI-powered workout discovery</Text>
          </View>

          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureRow}>
                <View style={styles.featureIconCircle}>
                  <Ionicons name={f.icon as never} size={22} color={COLORS.accent} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDetail}>{f.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.products}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => purchase(product.id)}
                disabled={isPurchasing}
                activeOpacity={0.8}
              >
                <View style={styles.productCardContent}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                </View>
                {product.badge && (
                  <View style={styles.productBadge}>
                    <Text style={styles.productBadgeText}>{product.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {isPurchasing && (
            <ActivityIndicator style={styles.loader} color={COLORS.accent} />
          )}

          <TouchableOpacity style={styles.restoreButton} onPress={restore} disabled={isPurchasing}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            Subscriptions renew automatically unless cancelled. Cancel anytime in your App Store settings.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 28,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  heroIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.secondaryText,
    textAlign: 'center',
  },
  featureList: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureDetail: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  products: {
    gap: 12,
  },
  productCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCardContent: {
    gap: 2,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  productBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  productBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loader: {
    marginTop: 8,
  },
  restoreButton: {
    alignItems: 'center',
  },
  restoreText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  legal: {
    fontSize: 11,
    color: COLORS.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
  },
})
