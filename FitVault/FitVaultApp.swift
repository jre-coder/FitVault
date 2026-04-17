import SwiftUI
import SwiftData

@main
struct FitVaultApp: App {
    @StateObject private var subscriptionManager = SubscriptionManager()
    @StateObject private var claudeService       = ClaudeService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(subscriptionManager)
                .environmentObject(claudeService)
        }
        .modelContainer(for: WorkoutItem.self)
    }
}
