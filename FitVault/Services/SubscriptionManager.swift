import StoreKit
import SwiftUI

@MainActor
final class SubscriptionManager: ObservableObject {
    static let monthlyID = "com.fitvault.app.premium.monthly"
    static let yearlyID  = "com.fitvault.app.premium.yearly"

    @Published var isPremium    = false
    @Published var products: [Product] = []
    @Published var isPurchasing = false
    @Published var errorMessage: String? = nil

    private var updatesTask: Task<Void, Never>?

    init() {
        updatesTask = Task { [weak self] in
            await self?.refreshStatus()
            await self?.listenForUpdates()
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    func loadProducts() async {
        do {
            let loaded = try await Product.products(for: [Self.monthlyID, Self.yearlyID])
            // Yearly first (better value), then monthly
            products = loaded.sorted { lhs, rhs in
                lhs.id == Self.yearlyID && rhs.id != Self.yearlyID
            }
        } catch {
            errorMessage = "Could not load subscription options."
        }
    }

    func purchase(_ product: Product) async {
        isPurchasing = true
        defer { isPurchasing = false }
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                await refreshStatus()
                await transaction.finish()
            case .userCancelled:
                break
            case .pending:
                break
            @unknown default:
                break
            }
        } catch {
            errorMessage = "Purchase failed: \(error.localizedDescription)"
        }
    }

    func restorePurchases() async {
        isPurchasing = true
        defer { isPurchasing = false }
        do {
            try await AppStore.sync()
            await refreshStatus()
        } catch {
            errorMessage = "Restore failed: \(error.localizedDescription)"
        }
    }

    private func refreshStatus() async {
        var active = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let tx) = result,
               tx.productType == .autoRenewable,
               tx.revocationDate == nil,
               (tx.productID == Self.monthlyID || tx.productID == Self.yearlyID) {
                active = true
                break
            }
        }
        isPremium = active
    }

    private func listenForUpdates() async {
        for await result in Transaction.updates {
            if case .verified(let tx) = result {
                await refreshStatus()
                await tx.finish()
            }
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified: throw StoreKitError.notEntitled
        case .verified(let value): return value
        }
    }
}
