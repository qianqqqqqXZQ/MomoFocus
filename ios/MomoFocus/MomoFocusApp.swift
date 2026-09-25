import SwiftUI
import UserNotifications

@main
struct MomoFocusApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .task { await store.requestNotificationPermissionIfNeeded() }
        }
    }
}
