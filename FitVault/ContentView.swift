import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            WorkoutListView()
                .tabItem {
                    Label("My Workouts", systemImage: "dumbbell.fill")
                }

            BrowseView()
                .tabItem {
                    Label("Browse", systemImage: "square.grid.2x2.fill")
                }

            DiscoverView()
                .tabItem {
                    Label("Discover", systemImage: "sparkles")
                }

            ForYouView()
                .tabItem {
                    Label("For You", systemImage: "person.fill.checkmark")
                }
        }
    }
}
