import SwiftUI

// AIResultRow, AIResultDetailView, AIDisclaimerView, LockedView are defined in DiscoverView.swift

struct ForYouView: View {
    @EnvironmentObject private var subscriptionManager: SubscriptionManager
    @State private var showingPaywall = false

    var body: some View {
        Group {
            if subscriptionManager.isPremium {
                ForYouContentView()
            } else {
                LockedView(
                    icon: "person.fill.checkmark",
                    title: "For You",
                    description: "Tell us your goals and get a personalized AI workout plan built around your fitness level, equipment, and schedule.",
                    onUnlock: { showingPaywall = true }
                )
            }
        }
        .sheet(isPresented: $showingPaywall) {
            PaywallView()
                .environmentObject(subscriptionManager)
        }
    }
}

// MARK: - For You Content

private struct ForYouContentView: View {
    @EnvironmentObject private var claudeService: ClaudeService
    @Environment(\.modelContext) private var modelContext

    @State private var goals          = ""
    @State private var fitnessLevel   = FitnessLevel.beginner
    @State private var selectedEquipment: Set<Equipment> = [.bodyweight]
    @State private var durationMinutes = 30
    @State private var results: [AIWorkoutSuggestion] = []
    @State private var hasSearched    = false
    @State private var selectedResult: AIWorkoutSuggestion? = nil
    @State private var savedTitle: String? = nil

    enum FitnessLevel: String, CaseIterable {
        case beginner     = "Beginner"
        case intermediate = "Intermediate"
        case advanced     = "Advanced"
    }

    enum Equipment: String, CaseIterable, Hashable {
        case bodyweight = "Bodyweight"
        case dumbbells  = "Dumbbells"
        case barbell    = "Barbell"
        case bands      = "Resistance Bands"
        case kettlebell = "Kettlebell"
        case fullGym    = "Full Gym"

        var icon: String {
            switch self {
            case .bodyweight: return "figure.strengthtraining.traditional"
            case .dumbbells:  return "dumbbell.fill"
            case .barbell:    return "figure.strengthtraining.functional"
            case .bands:      return "figure.flexibility"
            case .kettlebell: return "circle.grid.cross.fill"
            case .fullGym:    return "building.2.fill"
            }
        }
    }

    var canSearch: Bool {
        !goals.trimmingCharacters(in: .whitespaces).isEmpty && !claudeService.isLoading
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Form {
                    Section {
                        TextField(
                            "e.g. Build bigger arms, lose belly fat, improve my cardio endurance…",
                            text: $goals,
                            axis: .vertical
                        )
                        .lineLimit(3...5)
                    } header: {
                        Text("What are your goals?")
                    }

                    Section("About You") {
                        Picker("Fitness Level", selection: $fitnessLevel) {
                            ForEach(FitnessLevel.allCases, id: \.self) {
                                Text($0.rawValue).tag($0)
                            }
                        }

                        HStack {
                            Text("Session Length")
                            Spacer()
                            Text("\(durationMinutes) min")
                                .foregroundColor(.secondary)
                        }
                        Stepper("", value: $durationMinutes, in: 15...90, step: 15)
                            .labelsHidden()
                    }

                    Section("Available Equipment") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110))], spacing: 8) {
                            ForEach(Equipment.allCases, id: \.self) { eq in
                                EquipmentToggle(
                                    equipment: eq,
                                    isSelected: selectedEquipment.contains(eq)
                                ) {
                                    if selectedEquipment.contains(eq) {
                                        selectedEquipment.remove(eq)
                                    } else {
                                        selectedEquipment.insert(eq)
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    Section {
                        Button(action: getRecommendations) {
                            HStack {
                                Spacer()
                                if claudeService.isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Label("Get My Recommendations", systemImage: "sparkles")
                                        .fontWeight(.semibold)
                                }
                                Spacer()
                            }
                        }
                        .listRowBackground(canSearch ? Color.accentColor : Color(.systemGray4))
                        .foregroundColor(.white)
                        .disabled(!canSearch)
                    }
                }
                .frame(maxHeight: 500)

                if let error = claudeService.errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                        Text(error).font(.subheadline)
                    }
                    .foregroundColor(.red)
                    .padding()
                }

                if results.isEmpty {
                    if hasSearched && !claudeService.isLoading {
                        Spacer()
                        Text("No results. Try rephrasing your goals.")
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                } else {
                    AIDisclaimerView()
                        .padding(.horizontal)
                        .padding(.top, 4)

                    List(results) { result in
                        AIResultRow(result: result) {
                            let item = result.toWorkoutItem()
                            modelContext.insert(item)
                            savedTitle = item.title
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { selectedResult = result }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("For You")
            .sheet(item: $selectedResult) { result in
                AIResultDetailView(result: result) {
                    let item = result.toWorkoutItem()
                    modelContext.insert(item)
                    savedTitle = item.title
                    selectedResult = nil
                }
            }
            .alert("Saved!", isPresented: .init(
                get: { savedTitle != nil },
                set: { if !$0 { savedTitle = nil } }
            )) {
                Button("OK", role: .cancel) { savedTitle = nil }
            } message: {
                Text("\(savedTitle ?? "Workout") added to My Workouts.")
            }
        }
    }

    private func getRecommendations() {
        claudeService.errorMessage = nil
        results = []
        hasSearched = true
        Task {
            do {
                results = try await claudeService.fetchRecommendations(
                    goals: goals,
                    fitnessLevel: fitnessLevel.rawValue,
                    equipment: selectedEquipment.map(\.rawValue),
                    durationMinutes: durationMinutes
                )
            } catch {
                claudeService.errorMessage = error.localizedDescription
            }
        }
    }
}

private struct EquipmentToggle: View {
    let equipment: ForYouContentView.Equipment
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: equipment.icon).font(.caption)
                Text(equipment.rawValue)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .padding(.horizontal, 8).padding(.vertical, 6)
            .frame(maxWidth: .infinity)
            .background(isSelected ? Color.accentColor : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
