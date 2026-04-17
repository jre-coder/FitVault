import SwiftUI
import SwiftData
import UIKit

struct AddWorkoutView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var url = ""
    @State private var sourceType: SourceType = .website
    @State private var selectedBodyParts: Set<BodyPart> = []
    @State private var notes = ""
    @State private var showingURLError = false

    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !url.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Workout Details") {
                    TextField("Title", text: $title)

                    HStack {
                        TextField("URL / Link", text: $url)
                            .keyboardType(.URL)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()

                        if !url.isEmpty {
                            Button(action: { url = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Button(action: pasteFromClipboard) {
                                Image(systemName: "doc.on.clipboard")
                                    .foregroundColor(.accentColor)
                            }
                        }
                    }

                    Picker("Source", selection: $sourceType) {
                        ForEach(SourceType.allCases, id: \.self) { type in
                            Label(type.rawValue, systemImage: type.icon).tag(type)
                        }
                    }
                    .onChange(of: url) { _, newURL in
                        autoDetectSource(from: newURL)
                    }
                }

                Section("Target Muscles") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                        ForEach(BodyPart.allCases, id: \.self) { part in
                            BodyPartToggle(
                                part: part,
                                isSelected: selectedBodyParts.contains(part),
                                action: { toggleBodyPart(part) }
                            )
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("Notes (Optional)") {
                    TextField("Add notes about this workout...", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Add Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") { saveWorkout() }
                        .fontWeight(.semibold)
                        .disabled(!isValid)
                }
            }
            .alert("Invalid URL", isPresented: $showingURLError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Please enter a valid URL starting with http:// or https://")
            }
        }
        .onAppear {
            if let clipboardString = UIPasteboard.general.string,
               clipboardString.hasPrefix("http") {
                url = clipboardString
                autoDetectSource(from: clipboardString)
            }
        }
    }

    private func pasteFromClipboard() {
        if let clipboardString = UIPasteboard.general.string {
            url = clipboardString
            autoDetectSource(from: clipboardString)
        }
    }

    private func autoDetectSource(from urlString: String) {
        let lower = urlString.lowercased()
        if lower.contains("youtube.com") || lower.contains("youtu.be") {
            sourceType = .youtube
        } else if lower.contains("instagram.com") {
            sourceType = .instagram
        } else if lower.contains("tiktok.com") {
            sourceType = .tiktok
        }
    }

    private func toggleBodyPart(_ part: BodyPart) {
        if selectedBodyParts.contains(part) {
            selectedBodyParts.remove(part)
        } else {
            selectedBodyParts.insert(part)
        }
    }

    private func saveWorkout() {
        let trimmedURL = url.trimmingCharacters(in: .whitespaces)
        guard trimmedURL.hasPrefix("http") else {
            showingURLError = true
            return
        }

        let workout = WorkoutItem(
            title: title.trimmingCharacters(in: .whitespaces),
            url: trimmedURL,
            sourceType: sourceType,
            bodyParts: Array(selectedBodyParts),
            notes: notes
        )
        modelContext.insert(workout)
        dismiss()
    }
}

struct BodyPartToggle: View {
    let part: BodyPart
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: part.icon)
                    .font(.caption)
                Text(part.rawValue)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity)
            .background(isSelected ? Color.accentColor : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
