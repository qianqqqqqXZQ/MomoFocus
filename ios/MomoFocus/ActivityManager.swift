import ActivityKit
import Foundation

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

@MainActor
final class ActivityManager {
    private var activity: Activity<MomoFocusActivityAttributes>?

    func start(task: FocusTask, phase: TimerPhase, isRunning: Bool, remaining: Int, elapsed: Int, progress: Double) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let state = MomoFocusActivityAttributes.ContentState(phase: phase.label, isRunning: isRunning, remaining: remaining, elapsed: elapsed, endDate: isRunning && remaining > 0 ? Date().addingTimeInterval(TimeInterval(remaining)) : nil, progress: progress)
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(60))
        do { activity = try Activity.request(attributes: .init(taskName: task.text, taskColor: task.color.color), content: content, pushType: nil) } catch { activity = nil }
    }

    func update(phase: TimerPhase, isRunning: Bool, remaining: Int, elapsed: Int, progress: Double) async {
        guard let activity else { return }
        let state = MomoFocusActivityAttributes.ContentState(phase: phase.label, isRunning: isRunning, remaining: remaining, elapsed: elapsed, endDate: isRunning && remaining > 0 ? Date().addingTimeInterval(TimeInterval(remaining)) : nil, progress: progress)
        await activity.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(60)))
    }

    func end() async {
        guard let activity else { return }
        await activity.end(nil, dismissalPolicy: .immediate)
        self.activity = nil
    }
}
