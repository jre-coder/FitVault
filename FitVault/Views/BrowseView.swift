import SwiftUI
import SwiftData

struct BrowseView: View {
    @Query private var workouts: [WorkoutItem]
    @State private var selectedBodyPart: BodyPart? = nil
    @State private var selectedWorkout: WorkoutItem? = nil

    let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            if selectedBodyPart == nil {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(BodyPart.allCases, id: \.self) { part in
                            BodyPartCard(
                                bodyPart: part,
                                count: workouts.filter { $0.bodyParts.contains(part) }.count,
                                action: { selectedBodyPart = part }
                            )
                        }
                    }
                    .padding()
                }
                .navigationTitle("Browse")
            } else {
                let filtered = workouts.filter { $0.bodyParts.contains(selectedBodyPart!) }
                Group {
                    if filtered.isEmpty {
                        VStack(spacing: 16) {
                            Spacer()
                            Image(systemName: selectedBodyPart!.icon)
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)
                            Text("No \(selectedBodyPart!.rawValue) workouts yet")
                                .font(.title3)
                                .fontWeight(.semibold)
                            Text("Add workouts and tag them with \(selectedBodyPart!.rawValue) to see them here.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 40)
                            Spacer()
                        }
                    } else {
                        List(filtered) { workout in
                            WorkoutRowView(workout: workout)
                                .contentShape(Rectangle())
                                .onTapGesture { selectedWorkout = workout }
                        }
                        .listStyle(.plain)
                    }
                }
                .navigationTitle(selectedBodyPart!.rawValue)
                .navigationBarBackButtonHidden()
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button(action: { selectedBodyPart = nil }) {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                Text("Browse")
                            }
                        }
                    }
                }
                .sheet(item: $selectedWorkout) { workout in
                    WorkoutDetailView(workout: workout)
                }
            }
        }
    }
}

struct BodyPartCard: View {
    let bodyPart: BodyPart
    let count: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: bodyPart.icon)
                    .font(.system(size: 32))
                    .foregroundColor(.accentColor)

                Text(bodyPart.rawValue)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)

                Text("\(count) workout\(count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}
