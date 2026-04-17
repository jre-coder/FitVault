import SwiftUI
import SwiftData

struct EditWorkoutView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var workout: WorkoutItem

    @State private var title: String
    @State private var url: String
    @State private var sourceType: SourceType
    @State private var selectedBodyParts: Set<BodyPart>
    @State private var notes: String

    init(workout: WorkoutItem) {
        self.workout = workout
        _title = State(initialValue: workout.title)
        _url = State(initialValue: workout.url)
        _sourceType = State(initialValue: workout.sourceType)
        _selectedBodyParts = State(initialValue: Set(workout.bodyParts))
        _notes = State(initialValue: workout.notes)
    }

    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !url.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Workout Details") {
                    TextField("Title", text: $title)
                    TextField("URL / Link", text: $url)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()

                    Picker("Source", selection: $sourceType) {
                        ForEach(SourceType.allCases, id: \.self) { type in
                            Label(type.rawValue, systemImage: type.icon).tag(type)
                        }
                    }
                }

                Section("Target Muscles") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                        ForEach(BodyPart.allCases, id: \.self) { part in
                            BodyPartToggle(
                                part: part,
                                isSelected: selectedBodyParts.contains(part),
                                action: {
                                    if selectedBodyParts.contains(part) {
                                        selectedBodyParts.remove(part)
                                    } else {
                                        selectedBodyParts.insert(part)
                                    }
                                }
                            )
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("Notes") {
                    TextField("Add notes...", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Edit Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        workout.title = title.trimmingCharacters(in: .whitespaces)
                        workout.url = url.trimmingCharacters(in: .whitespaces)
                        workout.sourceType = sourceType
                        workout.bodyParts = Array(selectedBodyParts)
                        workout.notes = notes
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(!isValid)
                }
            }
        }
    }
}
