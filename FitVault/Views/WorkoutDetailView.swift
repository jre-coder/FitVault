import SwiftUI
import SwiftData

struct WorkoutDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var workout: WorkoutItem
    @State private var showingDeleteAlert = false
    @State private var isEditing = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header card
                    HStack(spacing: 16) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(sourceColor(for: workout.sourceType).opacity(0.15))
                                .frame(width: 64, height: 64)
                            Image(systemName: workout.sourceType.icon)
                                .foregroundColor(sourceColor(for: workout.sourceType))
                                .font(.system(size: 28))
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(workout.title)
                                .font(.title3)
                                .fontWeight(.bold)
                                .lineLimit(2)
                            Text(workout.sourceType.rawValue)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text(workout.dateAdded.formatted(date: .abbreviated, time: .omitted))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Button(action: { workout.isFavorite.toggle() }) {
                            Image(systemName: workout.isFavorite ? "star.fill" : "star")
                                .foregroundColor(workout.isFavorite ? .yellow : .secondary)
                                .font(.title2)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Open link button
                    if let url = URL(string: workout.url) {
                        Link(destination: url) {
                            HStack {
                                Image(systemName: "arrow.up.right.square.fill")
                                Text("Open \(workout.sourceType.rawValue) Link")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.accentColor)
                            .foregroundColor(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    // Target muscles
                    if !workout.bodyParts.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Target Muscles")
                                .font(.headline)
                            FlowLayout(spacing: 8) {
                                ForEach(workout.bodyParts, id: \.self) { part in
                                    HStack(spacing: 4) {
                                        Image(systemName: part.icon)
                                            .font(.caption)
                                        Text(part.rawValue)
                                            .font(.subheadline)
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
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

                    // URL display
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Link")
                            .font(.headline)
                        Text(workout.url)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(3)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Notes
                    if !workout.notes.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes")
                                .font(.headline)
                            Text(workout.notes)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
                .padding()
            }
            .navigationTitle("Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { isEditing = true }) {
                            Label("Edit", systemImage: "pencil")
                        }
                        Button(role: .destructive, action: { showingDeleteAlert = true }) {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .alert("Delete Workout?", isPresented: $showingDeleteAlert) {
                Button("Delete", role: .destructive) {
                    modelContext.delete(workout)
                    dismiss()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This action cannot be undone.")
            }
            .sheet(isPresented: $isEditing) {
                EditWorkoutView(workout: workout)
            }
        }
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

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var height: CGFloat = 0
        var currentX: CGFloat = 0
        var currentRowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, currentX > 0 {
                height += currentRowHeight + spacing
                currentX = 0
                currentRowHeight = 0
            }
            currentX += size.width + spacing
            currentRowHeight = max(currentRowHeight, size.height)
        }
        height += currentRowHeight
        return CGSize(width: maxWidth, height: height)
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        var currentX = bounds.minX
        var currentY = bounds.minY
        var currentRowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > bounds.maxX, currentX > bounds.minX {
                currentY += currentRowHeight + spacing
                currentX = bounds.minX
                currentRowHeight = 0
            }
            subview.place(at: CGPoint(x: currentX, y: currentY), proposal: .unspecified)
            currentX += size.width + spacing
            currentRowHeight = max(currentRowHeight, size.height)
        }
    }
}
