import SwiftUI
import SwiftData

// Note: AIResultRow, AIResultDetailView, AIDisclaimerView, and LockedView are
// defined in this file and shared with ForYouView.swift (same module).

struct DiscoverView: View {
    @EnvironmentObject private var subscriptionManager: SubscriptionManager
    @State private var showingPaywall = false

    var body: some View {
        Group {
            if subscriptionManager.isPremium {
                DiscoverContentView()
            } else {
                LockedView(
                    icon: "sparkles",
                    title: "Discover",
                    description: "Find AI-curated top workouts for any muscle group, or discover workouts similar to ones you already love.",
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

// MARK: - Discover Content

private struct DiscoverContentView: View {
    @EnvironmentObject private var claudeService: ClaudeService
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WorkoutItem.dateAdded, order: .reverse) private var savedWorkouts: [WorkoutItem]

    enum Mode: String, CaseIterable {
        case top     = "Top Workouts"
        case similar = "Find Similar"
    }

    @State private var mode: Mode = .top
    @State private var selectedBodyPart: BodyPart = .fullBody
    @State private var selectedSavedWorkout: WorkoutItem? = nil
    @State private var results: [AIWorkoutSuggestion] = []
    @State private var hasSearched = false
    @State private var selectedResult: AIWorkoutSuggestion? = nil
    @State private var savedTitle: String? = nil

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Mode", selection: $mode) {
                    ForEach(Mode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding()
                .onChange(of: mode) { _, _ in results = []; hasSearched = false }

                Form {
                    if mode == .top {
                        Section("Muscle Group") {
                            Picker("Body Part", selection: $selectedBodyPart) {
                                ForEach(BodyPart.allCases, id: \.self) { part in
                                    Label(part.rawValue, systemImage: part.icon).tag(part)
                                }
                            }
                        }
                    } else {
                        Section("Pick a saved workout") {
                            if savedWorkouts.isEmpty {
                                Text("No saved workouts yet — add some from My Workouts first.")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            } else {
                                Picker("Workout", selection: $selectedSavedWorkout) {
                                    Text("Select…").tag(WorkoutItem?.none)
                                    ForEach(savedWorkouts) { w in
                                        Text(w.title).tag(WorkoutItem?.some(w))
                                    }
                                }
                            }
                        }
                    }

                    Section {
                        Button(action: search) {
                            HStack {
                                Spacer()
                                if claudeService.isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Label("Find Workouts", systemImage: "sparkles")
                                        .fontWeight(.semibold)
                                }
                                Spacer()
                            }
                        }
                        .listRowBackground(searchEnabled ? Color.accentColor : Color(.systemGray4))
                        .foregroundColor(.white)
                        .disabled(!searchEnabled)
                    }
                }
                .frame(maxHeight: 260)

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
                        Text("No results. Try a different selection.")
                            .foregroundColor(.secondary)
                        Spacer()
                    } else if !hasSearched {
                        Spacer()
                        Image(systemName: "sparkles")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary.opacity(0.4))
                            .padding(.bottom, 8)
                        Text(mode == .top ? "Select a muscle group and tap Find" : "Pick a workout to find similar ones")
                            .font(.subheadline)
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
            .navigationTitle("Discover")
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

    private var searchEnabled: Bool {
        !claudeService.isLoading && (mode == .top || selectedSavedWorkout != nil)
    }

    private func search() {
        claudeService.errorMessage = nil
        results = []
        hasSearched = true
        Task {
            do {
                if mode == .top {
                    results = try await claudeService.fetchTopWorkouts(for: selectedBodyPart)
                } else if let workout = selectedSavedWorkout {
                    results = try await claudeService.fetchSimilarWorkouts(to: workout)
                }
            } catch {
                claudeService.errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Shared Result Components

struct AIResultRow: View {
    let result: AIWorkoutSuggestion
    let onSave: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                // Rank badge
                ZStack {
                    Circle()
                        .fill(rankColor.opacity(0.15))
                        .frame(width: 34, height: 34)
                    Text("#\(result.rank)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(rankColor)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(result.title)
                        .font(.headline)
                        .lineLimit(2)
                    HStack(spacing: 4) {
                        Label(result.platform.capitalized, systemImage: result.sourceType.icon)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("·").foregroundColor(.secondary).font(.caption)
                        Text(result.difficulty).font(.caption).foregroundColor(.secondary)
                        Text("·").foregroundColor(.secondary).font(.caption)
                        Text("\(result.durationMinutes) min").font(.caption).foregroundColor(.secondary)
                    }
                }

                Spacer()

                Button(action: onSave) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.accentColor)
                }
            }

            Text(result.explanation)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
        .padding(.vertical, 4)
    }

    private var rankColor: Color {
        switch result.rank {
        case 1: return .yellow
        case 2: return Color(red: 0.75, green: 0.75, blue: 0.75)
        case 3: return Color(red: 0.80, green: 0.50, blue: 0.20)
        default: return .accentColor
        }
    }
}

struct AIResultDetailView: View {
    let result: AIWorkoutSuggestion
    let onSave: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("#\(result.rank) Pick")
                                .font(.caption).fontWeight(.semibold)
                                .padding(.horizontal, 10).padding(.vertical, 4)
                                .background(Color.accentColor.opacity(0.15))
                                .foregroundColor(.accentColor)
                                .clipShape(Capsule())
                            Spacer()
                            Label(result.difficulty, systemImage: "flame")
                                .font(.caption).foregroundColor(.secondary)
                        }
                        Text(result.title)
                            .font(.title3).fontWeight(.bold)
                        HStack {
                            Label(result.platform.capitalized, systemImage: result.sourceType.icon)
                            Text("·")
                            Label("\(result.durationMinutes) min", systemImage: "clock")
                        }
                        .font(.subheadline).foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Open link
                    if let url = URL(string: result.safeURL) {
                        Link(destination: url) {
                            HStack {
                                Image(systemName: "arrow.up.right.square.fill")
                                Text("Open Link").fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity).padding()
                            .background(Color.accentColor).foregroundColor(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    // Why recommended
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Why We Recommend This", systemImage: "sparkles")
                            .font(.headline)
                        Text(result.explanation)
                            .font(.subheadline).foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Description
                    VStack(alignment: .leading, spacing: 8) {
                        Text("About").font(.headline)
                        Text(result.description)
                            .font(.subheadline).foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Target muscles
                    if !result.targetMuscles.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Target Muscles").font(.headline)
                            FlowLayout(spacing: 8) {
                                ForEach(result.targetMuscles, id: \.self) { muscle in
                                    Text(muscle)
                                        .font(.subheadline)
                                        .padding(.horizontal, 12).padding(.vertical, 6)
                                        .background(Color.accentColor.opacity(0.15))
                                        .foregroundColor(.accentColor)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }

                    AIDisclaimerView()
                }
                .padding()
            }
            .navigationTitle("Workout Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: onSave) {
                        Label("Save", systemImage: "plus")
                    }
                }
            }
        }
    }
}

struct AIDisclaimerView: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "info.circle").font(.caption)
            Text("AI-suggested workouts. Verify links are current before sharing.")
                .font(.caption2)
        }
        .foregroundColor(.secondary)
        .padding(.vertical, 4)
    }
}

struct LockedView: View {
    let icon: String
    let title: String
    let description: String
    let onUnlock: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Spacer()
                ZStack(alignment: .bottomTrailing) {
                    Circle()
                        .fill(Color.accentColor.opacity(0.1))
                        .frame(width: 120, height: 120)
                    Image(systemName: icon)
                        .font(.system(size: 50))
                        .foregroundColor(.accentColor)
                        .frame(width: 120, height: 120)
                    Image(systemName: "lock.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(7)
                        .background(Color.accentColor)
                        .clipShape(Circle())
                        .offset(x: 6, y: 6)
                }
                Text(title).font(.title2).fontWeight(.bold)
                Text(description)
                    .font(.subheadline).foregroundColor(.secondary)
                    .multilineTextAlignment(.center).padding(.horizontal, 40)
                Button(action: onUnlock) {
                    Label("Unlock with Premium", systemImage: "sparkles")
                        .fontWeight(.semibold)
                        .padding(.horizontal, 28).padding(.vertical, 14)
                        .background(Color.accentColor).foregroundColor(.white)
                        .clipShape(Capsule())
                }
                .padding(.top, 8)
                Spacer()
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
