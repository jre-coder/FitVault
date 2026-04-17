import SwiftUI
import StoreKit

struct PaywallView: View {
    @EnvironmentObject private var subscriptionManager: SubscriptionManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    // Hero
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.accentColor.opacity(0.12))
                                .frame(width: 110, height: 110)
                            Image(systemName: "sparkles")
                                .font(.system(size: 48))
                                .foregroundColor(.accentColor)
                        }
                        Text("FitVault Premium")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Unlock AI-powered workout discovery and personalized recommendations.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                    .padding(.top)

                    // Feature list
                    VStack(alignment: .leading, spacing: 14) {
                        PaywallFeatureRow(
                            icon: "sparkles",
                            title: "Discover Top Workouts",
                            description: "AI-curated top workouts for every muscle group"
                        )
                        PaywallFeatureRow(
                            icon: "arrow.triangle.2.circlepath",
                            title: "Find Similar Workouts",
                            description: "Find more like the workouts you already love"
                        )
                        PaywallFeatureRow(
                            icon: "person.fill.checkmark",
                            title: "Personalized Recommendations",
                            description: "Tell us your goals and get a custom workout plan"
                        )
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)

                    // Products
                    if subscriptionManager.products.isEmpty {
                        ProgressView("Loading options...")
                            .padding()
                    } else {
                        VStack(spacing: 10) {
                            ForEach(subscriptionManager.products, id: \.id) { product in
                                PaywallProductButton(
                                    product: product,
                                    badge: product.id == SubscriptionManager.yearlyID ? "Best Value" : nil,
                                    isLoading: subscriptionManager.isPurchasing
                                ) {
                                    Task { await subscriptionManager.purchase(product) }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Restore
                    Button("Restore Purchases") {
                        Task { await subscriptionManager.restorePurchases() }
                    }
                    .font(.footnote)
                    .foregroundColor(.secondary)

                    Text("Subscription renews automatically. Cancel anytime in Settings > Apple ID.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                        .padding(.bottom)
                }
            }
            .navigationTitle("Upgrade")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
            .alert("Error", isPresented: .init(
                get: { subscriptionManager.errorMessage != nil },
                set: { if !$0 { subscriptionManager.errorMessage = nil } }
            )) {
                Button("OK", role: .cancel) { subscriptionManager.errorMessage = nil }
            } message: {
                Text(subscriptionManager.errorMessage ?? "")
            }
            .onChange(of: subscriptionManager.isPremium) { _, isPremium in
                if isPremium { dismiss() }
            }
        }
        .task { await subscriptionManager.loadProducts() }
    }
}

struct PaywallFeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.accentColor)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct PaywallProductButton: View {
    let product: Product
    let badge: String?
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(product.displayName)
                            .fontWeight(.semibold)
                        if let badge {
                            Text(badge)
                                .font(.caption2)
                                .fontWeight(.bold)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(Color.accentColor)
                                .foregroundColor(.white)
                                .clipShape(Capsule())
                        }
                    }
                    Text(product.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if isLoading {
                    ProgressView()
                } else {
                    Text(product.displayPrice)
                        .fontWeight(.bold)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .foregroundColor(.primary)
        .disabled(isLoading)
    }
}
