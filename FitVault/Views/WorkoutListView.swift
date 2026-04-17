import SwiftUI
import SwiftData

struct WorkoutListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WorkoutItem.dateAdded, order: .reverse) private var workouts: [WorkoutItem]

    @State private var searchText = ""
    @State private var selectedBodyPart: BodyPart? = nil
    @State private var showingAddWorkout = false
    @State private var selectedWorkout: WorkoutItem? = nil

    var filteredWorkouts: [WorkoutItem] {
        workouts.filter { workout in
            let matchesSearch = searchText.isEmpty ||
                workout.title.localizedCaseInsensitiveContains(searchText) ||
                workout.notes.localizedCaseInsensitiveContains(searchText)
            let matchesBodyPart = selectedBodyPart == nil ||
                workout.bodyParts.contains(selectedBodyPart!)
            return matchesSearch && matchesBodyPart
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: selectedBodyPart == nil) {
                            selectedBodyPart = nil
                        }
                        ForEach(BodyPart.allCases, id: \.self) { part in
                            FilterChip(title: part.rawValue, isSelected: selectedBodyPart == part) {
                                selectedBodyPart = selectedBodyPart == part ? nil : part
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
                .background(Color(.systemBackground))

                Divider()

                if filteredWorkouts.isEmpty {
                    EmptyStateView(
                        hasWorkouts: !workouts.isEmpty,
                        onAdd: { showingAddWorkout = true }
                    )
                } else {
                    List {
                        ForEach(filteredWorkouts) { workout in
                            WorkoutRowView(workout: workout)
                                .contentShape(Rectangle())
                                .onTapGesture { selectedWorkout = workout }
                        }
                        .onDelete(perform: deleteWorkouts)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("FitVault")
            .searchable(text: $searchText, prompt: "Search workouts...")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddWorkout = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddWorkout) {
                AddWorkoutView()
            }
            .sheet(item: $selectedWorkout) { workout in
                WorkoutDetailView(workout: workout)
            }
        }
    }

    private func deleteWorkouts(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(filteredWorkouts[index])
        }
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? Color.accentColor : Color(.systemGray6))
                .foregroundColor(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
    }
}

struct WorkoutRowView: View {
    let workout: WorkoutItem

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(sourceColor(for: workout.sourceType).opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: workout.sourceType.icon)
                    .foregroundColor(sourceColor(for: workout.sourceType))
                    .font(.system(size: 20))
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(workout.title)
                        .font(.headline)
                        .lineLimit(1)
                    if workout.isFavorite {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                    }
                }

                if !workout.bodyParts.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(workout.bodyParts.prefix(3), id: \.self) { part in
                            Text(part.rawValue)
                                .font(.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color(.systemGray5))
                                .clipShape(Capsule())
                        }
                        if workout.bodyParts.count > 3 {
                            Text("+\(workout.bodyParts.count - 3)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Text(workout.url)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }

    private func sourceColor(for type: SourceType) -> Color {
        switch type {
        case .youtube: return .red
        case .instagram: return .purple
        case .tiktok: return .primary
        case .website: return .blue
        case .other: return .gray
        }
    }
}

struct EmptyStateView: View {
    let hasWorkouts: Bool
    let onAdd: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "dumbbell")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text(hasWorkouts ? "No workouts match your filters" : "No workouts yet")
                .font(.title3)
                .fontWeight(.semibold)

            Text(
                hasWorkouts
                    ? "Try adjusting your search or filters"
                    : "Save your favorite workouts from YouTube, Instagram, and more"
            )
            .font(.subheadline)
            .foregroundColor(.secondary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 40)

            if !hasWorkouts {
                Button(action: onAdd) {
                    Label("Add Your First Workout", systemImage: "plus")
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.accentColor)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }
                .padding(.top, 8)
            }

            Spacer()
        }
    }
}
