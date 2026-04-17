import Foundation
import SwiftData

enum SourceType: String, CaseIterable, Codable {
    case youtube = "YouTube"
    case instagram = "Instagram"
    case tiktok = "TikTok"
    case website = "Website"
    case other = "Other"

    var icon: String {
        switch self {
        case .youtube: return "play.rectangle.fill"
        case .instagram: return "camera.fill"
        case .tiktok: return "music.note"
        case .website: return "globe"
        case .other: return "link"
        }
    }
}

enum BodyPart: String, CaseIterable, Codable {
    case fullBody = "Full Body"
    case chest = "Chest"
    case back = "Back"
    case shoulders = "Shoulders"
    case arms = "Arms"
    case core = "Core"
    case legs = "Legs"
    case glutes = "Glutes"
    case cardio = "Cardio"
    case mobility = "Mobility"

    var icon: String {
        switch self {
        case .fullBody: return "figure.strengthtraining.traditional"
        case .chest: return "figure.strengthtraining.functional"
        case .back: return "figure.walk"
        case .shoulders: return "figure.arms.open"
        case .arms: return "dumbbell.fill"
        case .core: return "figure.core.training"
        case .legs: return "figure.run"
        case .glutes: return "figure.cooldown"
        case .cardio: return "heart.fill"
        case .mobility: return "figure.flexibility"
        }
    }
}

@Model
class WorkoutItem {
    var id: UUID
    var title: String
    var url: String
    var sourceTypeRaw: String
    var bodyPartsRaw: [String]
    var notes: String
    var dateAdded: Date
    var isFavorite: Bool

    var sourceType: SourceType {
        get { SourceType(rawValue: sourceTypeRaw) ?? .other }
        set { sourceTypeRaw = newValue.rawValue }
    }

    var bodyParts: [BodyPart] {
        get { bodyPartsRaw.compactMap { BodyPart(rawValue: $0) } }
        set { bodyPartsRaw = newValue.map { $0.rawValue } }
    }

    init(
        title: String,
        url: String,
        sourceType: SourceType = .website,
        bodyParts: [BodyPart] = [],
        notes: String = ""
    ) {
        self.id = UUID()
        self.title = title
        self.url = url
        self.sourceTypeRaw = sourceType.rawValue
        self.bodyPartsRaw = bodyParts.map { $0.rawValue }
        self.notes = notes
        self.dateAdded = Date()
        self.isFavorite = false
    }
}
