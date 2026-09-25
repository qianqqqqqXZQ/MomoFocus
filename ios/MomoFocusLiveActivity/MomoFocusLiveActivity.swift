import ActivityKit
import SwiftUI
import WidgetKit

struct MomoFocusActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var phase: String
        var isRunning: Bool
        var remaining: Int
        var elapsed: Int
        var endDate: Date?
        var progress: Double
    }
    var taskName: String
    var taskColor: String
}

struct MomoFocusLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MomoFocusActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 8) {
                HStack { Image(systemName: context.state.phase == "专注中" ? "timer" : "cup.and.saucer.fill"); Text(context.attributes.taskName).lineLimit(1).font(.headline); Spacer(); Text(context.state.phase).font(.caption.weight(.semibold)) }
                if context.state.isRunning, let endDate = context.state.endDate { Text(timerInterval: Date()...endDate, countsDown: true).font(.system(size: 28, weight: .medium, design: .monospaced)) } else { Text("已暂停").font(.title3.bold()) }
                ProgressView(value: context.state.progress).tint(context.state.phase == "专注中" ? .pink : .mint)
            }.padding().activityBackgroundTint(Color(hex: context.attributes.taskColor)).activitySystemActionForegroundColor(.primary)
        } dynamicIsland: { context in
            DynamicIsland { expanded in
                DynamicIslandExpandedRegion(.leading) { Image(systemName: context.state.phase == "专注中" ? "timer" : "cup.and.saucer.fill") }
                DynamicIslandExpandedRegion(.center) { Text(context.attributes.taskName).lineLimit(1).font(.headline) }
                DynamicIslandExpandedRegion(.trailing) { Text(context.state.phase).font(.caption) }
                DynamicIslandExpandedRegion(.bottom) { if let endDate = context.state.endDate, context.state.isRunning { Text(timerInterval: Date()...endDate, countsDown: true).font(.system(.title2, design: .monospaced)) } else { Text("已暂停") }; ProgressView(value: context.state.progress).tint(.mint) }
            } compactLeading: { Image(systemName: context.state.phase == "专注中" ? "timer" : "cup.and.saucer.fill") } compactTrailing: { if let endDate = context.state.endDate, context.state.isRunning { Text(timerInterval: Date()...endDate, countsDown: true).monospacedDigit() } else { Text("暂停") } } minimal: { Image(systemName: "timer") }
        }
    }
}

private extension Color { init(hex: String) { let value = Int(hex.dropFirst(), radix: 16) ?? 0; self.init(red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255) } }
