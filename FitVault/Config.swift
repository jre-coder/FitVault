import Foundation

enum Config {
    // WARNING: Never ship API keys in production client code.
    // Replace claudeAPIKey with calls to your own backend that proxies Claude requests,
    // and verify the subscription server-side before allowing AI feature access.
    // Get a key at: https://console.anthropic.com
    static let claudeAPIKey = "YOUR_API_KEY_HERE"
    static let claudeModel  = "claude-opus-4-6"
    static let claudeAPIURL = URL(string: "https://api.anthropic.com/v1/messages")!
}
