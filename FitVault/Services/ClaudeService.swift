import Foundation

@MainActor
final class ClaudeService: ObservableObject {
    @Published var isLoading    = false
    @Published var errorMessage: String? = nil

    // MARK: - Public API

    func fetchTopWorkouts(for bodyPart: BodyPart) async throws -> [AIWorkoutSuggestion] {
        let prompt = """
        Find the top 5 workout videos or resources that specifically target \(bodyPart.rawValue). \
        These should be real, highly regarded workouts from YouTube, Instagram, TikTok, or fitness websites.

        \(jsonInstructions(explanationKey: "Why this is one of the best for \(bodyPart.rawValue)"))
        """
        return try await callClaude(prompt: prompt)
    }

    func fetchSimilarWorkouts(to workout: WorkoutItem) async throws -> [AIWorkoutSuggestion] {
        let muscles = workout.bodyParts.map(\.rawValue).joined(separator: ", ")
        let prompt = """
        A user enjoys the workout "\(workout.title)" which targets: \(muscles.isEmpty ? "general fitness" : muscles).
        Find 5 similar workout videos or resources they would likely enjoy. \
        Consider style, difficulty, and muscle groups. Include both same-muscle alternatives and complementary workouts.

        \(jsonInstructions(explanationKey: "Why users who like '\(workout.title)' would enjoy this"))
        """
        return try await callClaude(prompt: prompt)
    }

    func fetchRecommendations(
        goals: String,
        fitnessLevel: String,
        equipment: [String],
        durationMinutes: Int
    ) async throws -> [AIWorkoutSuggestion] {
        let equipmentStr = equipment.isEmpty ? "no equipment" : equipment.joined(separator: ", ")
        let prompt = """
        Recommend 6 workout videos or resources for a user with this profile:
        - Goals: \(goals)
        - Fitness level: \(fitnessLevel)
        - Available equipment: \(equipmentStr)
        - Session duration: \(durationMinutes) minutes

        Find real workouts from YouTube, Instagram, TikTok, or fitness websites. \
        Prioritize variety to give them a well-rounded program.

        \(jsonInstructions(explanationKey: "Why this specifically helps with their goals"))
        """
        return try await callClaude(prompt: prompt)
    }

    // MARK: - Private

    private func jsonInstructions(explanationKey: String) -> String {
        """
        Return ONLY valid JSON with no markdown, no code fences, no extra text.
        Use this exact structure:
        {"recommendations":[{"rank":1,"title":"...","url":"https://...","platform":"youtube|instagram|tiktok|website|other","targetMuscles":["Full Body"],"description":"2-sentence description","explanation":"\(explanationKey)","durationMinutes":20,"difficulty":"Beginner|Intermediate|Advanced"}]}
        targetMuscles values MUST be from this list only: Full Body, Chest, Back, Shoulders, Arms, Core, Legs, Glutes, Cardio, Mobility
        """
    }

    private struct ClaudeRequest: Encodable {
        let model: String
        let max_tokens: Int
        let system: String
        let messages: [Message]
        struct Message: Encodable {
            let role: String
            let content: String
        }
    }

    private struct ClaudeResponse: Decodable {
        let content: [Block]
        struct Block: Decodable {
            let type: String
            let text: String?
        }
    }

    private func callClaude(prompt: String) async throws -> [AIWorkoutSuggestion] {
        guard !Config.claudeAPIKey.isEmpty, Config.claudeAPIKey != "YOUR_API_KEY_HERE" else {
            throw ClaudeError.missingAPIKey
        }

        var request = URLRequest(url: Config.claudeAPIURL)
        request.httpMethod = "POST"
        request.setValue(Config.claudeAPIKey,  forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01",         forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json",   forHTTPHeaderField: "content-type")

        let body = ClaudeRequest(
            model: Config.claudeModel,
            max_tokens: 2048,
            system: "You are a fitness expert. Respond ONLY with valid JSON — no markdown, no code fences, no explanations outside the JSON.",
            messages: [.init(role: "user", content: prompt)]
        )
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let body = String(data: data, encoding: .utf8) {
                throw ClaudeError.apiError(body)
            }
            throw ClaudeError.invalidResponse
        }

        let claude = try JSONDecoder().decode(ClaudeResponse.self, from: data)
        guard let text = claude.content.first(where: { $0.type == "text" })?.text else {
            throw ClaudeError.invalidResponse
        }

        let jsonText = stripFencesAndExtract(from: text)
        guard let jsonData = jsonText.data(using: .utf8) else {
            throw ClaudeError.parsingFailed("Could not encode response text")
        }

        let decoder = JSONDecoder()
        do {
            return try decoder.decode(AIWorkoutResponse.self, from: jsonData).recommendations
        } catch {
            throw ClaudeError.parsingFailed(error.localizedDescription)
        }
    }

    /// Strips markdown code fences and extracts the JSON object/array.
    private func stripFencesAndExtract(from text: String) -> String {
        var cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
        // Remove ```json ... ``` or ``` ... ```
        if cleaned.hasPrefix("```") {
            cleaned = cleaned
                .replacingOccurrences(of: "^```(?:json)?\\s*", with: "", options: .regularExpression)
                .replacingOccurrences(of: "```\\s*$",          with: "", options: .regularExpression)
                .trimmingCharacters(in: .whitespacesAndNewlines)
        }
        // Grab from first { to last }
        if let start = cleaned.firstIndex(of: "{"),
           let end   = cleaned.lastIndex(of: "}") {
            return String(cleaned[start...end])
        }
        return cleaned
    }
}

enum ClaudeError: LocalizedError {
    case missingAPIKey
    case invalidResponse
    case apiError(String)
    case parsingFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "No Claude API key set. Add your key to Config.swift."
        case .invalidResponse:
            return "Received an unexpected response from the AI service."
        case .apiError(let msg):
            return "API error: \(msg)"
        case .parsingFailed(let detail):
            return "Could not read AI response: \(detail)"
        }
    }
}
