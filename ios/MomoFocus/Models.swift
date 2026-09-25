import Foundation

enum TaskType: String, Codable, CaseIterable, Identifiable {
    case pomodoro
    case countup
    var id: String { rawValue }
    var label: String { self == .pomodoro ? "番茄钟" : "正计时" }
}

enum TimerPhase: String, Codable {
    case focus
    case breakTime
    var label: String { self == .focus ? "专注中" : "休息中" }
}

enum SessionStatus: String, Codable { case completed, abandoned }

struct FocusTask: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var text: String
    var rounds: Int = 0
    var focusSeconds: Int = 0
    var done: Bool = false
    var type: TaskType = .pomodoro
    var focusMinutes: Int = 25
    var breakMinutes: Int = 5
    var color: TaskColor = .sage
}

struct TodoThought: Codable, Identifiable, Equatable {
    var id = UUID()
    var text: String
    var createdAt = Date()
}

struct Todo: Codable, Identifiable, Equatable {
    var id = UUID()
    var text: String
    var done = false
    var thoughts: [TodoThought] = []
}

struct MemoNote: Codable, Identifiable, Equatable {
    var id = UUID()
    var title: String
    var body: String
    var createdAt = Date()
    var updatedAt = Date()
}

struct FocusSession: Codable, Identifiable, Equatable {
    var id = UUID()
    var taskID: UUID
    var taskName: String
    var seconds: Int
    var rounds: Int
    var date = Date()
    var status: SessionStatus
}

struct TimerSnapshot: Codable, Equatable {
    var taskID: UUID?
    var phase: TimerPhase
    var isRunning: Bool
    var startedAt: Date?
    var sessionStartedAt: Date?
    var startValue: Int
    var remaining: Int
    var elapsed: Int
    var pendingFocusSeconds: Int
}

struct AppSettings: Codable, Equatable {
    var soundOn = true
    var notificationsOn = true
}

enum TaskColor: String, Codable, CaseIterable, Identifiable {
    case sage, sky, lemon, rose, orange, brown, lavender, mint
    var id: String { rawValue }
    var label: String {
        switch self { case .sage: "鼠尾草绿"; case .sky: "天空蓝"; case .lemon: "奶油黄"; case .rose: "樱花粉"; case .orange: "蜜桃橙"; case .brown: "燕麦色"; case .lavender: "薰衣草紫"; case .mint: "薄荷青" }
    }
    var color: String {
        switch self { case .sage: "#E3F3EB"; case .sky: "#E5F1FB"; case .lemon: "#FFF5CF"; case .rose: "#FFE7E4"; case .orange: "#FFEADB"; case .brown: "#F3EADF"; case .lavender: "#EEE8FB"; case .mint: "#DFF4F0" }
    }
}

enum FocusFilter: String, CaseIterable, Identifiable {
    case day, week, month, custom
    var id: String { rawValue }
    var label: String { switch self { case .day: "日"; case .week: "周"; case .month: "月"; case .custom: "自定义" } }
}
