import Foundation

struct AIWorkoutSuggestion: Identifiable, Codable {
    var id = UUID()
    let rank: Int
    let title: String
    let url: String
    let platform: String
    let targetMuscles: [String]
    let description: String
    let explanation: String
    let durationMinutes: Int
    let difficulty: String

    // Computed: map platform string to SourceType
    var sourceType: SourceType {
        switch platform.lowercased() {
        case "youtube":   return .youtube
        case "instagram": return .instagram
        case "tiktok":    return .tiktok
        case "website":   return .website
        default:          return .other
        }
    }

    // Computed: match targetMuscles strings against BodyPart rawValues
    var resolvedBodyParts: [BodyPart] {
        targetMuscles.compactMap { muscle in
            BodyPart.allCases.first {
                $0.rawValue.lowercased() == muscle.lowercased()
            }
        }
    }

    // Safe URL: falls back to a YouTube search if Claude didn't provide a valid http URL
    var safeURL: String {
        if url.hasPrefix("http") { return url }
        let query = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? title
        return "https://www.youtube.com/results?search_query=\(query)"
    }

    func toWorkoutItem() -> WorkoutItem {
        WorkoutItem(
            title: title,
            url: safeURL,
            sourceType: sourceType,
            bodyParts: resolvedBodyParts,
            notes: explanation
        )
    }

    // Custom decode so `id` isn't expected in JSON
    enum CodingKeys: String, CodingKey {
        case rank, title, url, platform, targetMuscles
        case description, explanation, durationMinutes, difficulty
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        rank            = try c.decode(Int.self,    forKey: .rank)
        title           = try c.decode(String.self, forKey: .title)
        url             = try c.decode(String.self, forKey: .url)
        platform        = try c.decode(String.self, forKey: .platform)
        targetMuscles   = try c.decode([String].self, forKey: .targetMuscles)
        description     = try c.decode(String.self, forKey: .description)
        explanation     = try c.decode(String.self, forKey: .explanation)
        durationMinutes = try c.decode(Int.self,    forKey: .durationMinutes)
        difficulty      = try c.decode(String.self, forKey: .difficulty)
        id = UUID()
    }
}

// Envelope the Claude API wraps results in
struct AIWorkoutResponse: Codable {
    let recommendations: [AIWorkoutSuggestion]
}
