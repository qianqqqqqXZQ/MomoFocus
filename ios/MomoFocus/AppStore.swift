import Foundation
import UserNotifications

@MainActor
final class AppStore: ObservableObject {
    @Published var tasks: [FocusTask]
    @Published var todos: [Todo]
    @Published var notes: [MemoNote]
    @Published var sessions: [FocusSession]
    @Published var settings: AppSettings
    @Published var slogan: String
    @Published var snapshot: TimerSnapshot
    @Published var now = Date()

    let activityManager = ActivityManager()
    private let store = JSONStore()
    private var timer: Timer?
    private var currentTask: FocusTask? { tasks.first { $0.id == snapshot.taskID } }

    init() {
        tasks = store.read([FocusTask].self, key: StorageKey.tasks, fallback: [])
        todos = store.read([Todo].self, key: StorageKey.todos, fallback: [Todo(text: "整理今天的优先事项"), Todo(text: "给自己留一段安静时间")])
        notes = store.read([MemoNote].self, key: StorageKey.notes, fallback: [MemoNote(title: "今天的节奏", body: "今天的节奏很好，下午留一点时间做收尾。")])
        sessions = store.read([FocusSession].self, key: StorageKey.sessions, fallback: [])
        settings = store.read(AppSettings.self, key: StorageKey.settings, fallback: AppSettings())
        slogan = store.read(String.self, key: StorageKey.slogan, fallback: "慢一点，\n也很好。")
        snapshot = store.read(TimerSnapshot.self, key: StorageKey.timer, fallback: TimerSnapshot(taskID: nil, phase: .focus, isRunning: false, startedAt: nil, sessionStartedAt: nil, startValue: 1500, remaining: 1500, elapsed: 0, pendingFocusSeconds: 0))
        restoreTimer()
    }

    func persist() {
        store.write(tasks, key: StorageKey.tasks); store.write(todos, key: StorageKey.todos); store.write(notes, key: StorageKey.notes); store.write(sessions, key: StorageKey.sessions); store.write(settings, key: StorageKey.settings); store.write(slogan, key: StorageKey.slogan); store.write(snapshot, key: StorageKey.timer)
    }

    func requestNotificationPermissionIfNeeded() async {
        guard settings.notificationsOn else { return }
        _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
    }

    func select(_ task: FocusTask) { if snapshot.isRunning { return }; snapshot.taskID = task.id; snapshot.phase = .focus; snapshot.remaining = task.type == .countup ? 0 : task.focusMinutes * 60; snapshot.elapsed = 0; snapshot.startValue = snapshot.remaining; persist() }
    func start() {
        guard let task = currentTask, !snapshot.isRunning else { return }
        if snapshot.taskID == nil { select(task) }
        snapshot.isRunning = true; snapshot.startedAt = Date(); if snapshot.sessionStartedAt == nil { snapshot.sessionStartedAt = Date() }; persist(); startTimer(); activityManager.start(task: task, phase: snapshot.phase, isRunning: true, remaining: snapshot.remaining, elapsed: snapshot.elapsed, progress: progress)
    }
    func pause() { updateLiveTime(); snapshot.isRunning = false; snapshot.startedAt = nil; persist(); Task { await activityManager.update(phase: snapshot.phase, isRunning: false, remaining: snapshot.remaining, elapsed: snapshot.elapsed, progress: progress) } }
    func abandon() { updateLiveTime(); if let task = currentTask, let started = snapshot.sessionStartedAt { let seconds = snapshot.phase == .focus ? focusElapsedSeconds : snapshot.pendingFocusSeconds; if seconds >= 5 { sessions.insert(FocusSession(taskID: task.id, taskName: task.text, seconds: seconds, rounds: 0, date: started, status: .abandoned)) } }; resetTimer(); Task { await activityManager.end() } }

    var displaySeconds: Int { snapshot.phase == .focus && currentTask?.type == .countup ? snapshot.elapsed : max(0, snapshot.remaining) }
    var progress: Double { guard let task = currentTask else { return 0 }; let total = snapshot.phase == .focus ? task.focusMinutes * 60 : task.breakMinutes * 60; return min(1, max(0, snapshot.phase == .focus && task.type == .countup ? Double(snapshot.elapsed) / Double(max(1, total)) : 1 - Double(snapshot.remaining) / Double(max(1, total)))) }

    private func startTimer() { timer?.invalidate(); timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in Task { @MainActor in self?.tick() } } }
    private func tick() { guard snapshot.isRunning else { return }; updateLiveTime(); now = Date(); if snapshot.phase == .focus && currentTask?.type == .countup { return }; if snapshot.remaining <= 0 { finishPhase() }; persist(); if let _ = currentTask { Task { await activityManager.update(phase: snapshot.phase, isRunning: snapshot.isRunning, remaining: snapshot.remaining, elapsed: snapshot.elapsed, progress: progress) } } }
    private func updateLiveTime() { guard let started = snapshot.startedAt else { return }; let delta = max(0, Int(Date().timeIntervalSince(started))); if snapshot.phase == .focus && currentTask?.type == .countup { snapshot.elapsed = snapshot.startValue + delta } else { snapshot.remaining = max(0, snapshot.startValue - delta) } }
    private func finishPhase() { guard let task = currentTask else { return }; if snapshot.phase == .focus && task.type == .pomodoro { snapshot.pendingFocusSeconds = focusElapsedSeconds; snapshot.phase = .breakTime; snapshot.startValue = task.breakMinutes * 60; snapshot.remaining = snapshot.startValue; snapshot.startedAt = Date(); snapshot.isRunning = true; notify("专注完成，休息已开始", "休息结束后本轮将完成。") } else { let seconds = snapshot.phase == .focus ? focusElapsedSeconds : snapshot.pendingFocusSeconds; if seconds >= 5 { sessions.insert(FocusSession(taskID: task.id, taskName: task.text, seconds: seconds, rounds: snapshot.phase == .breakTime ? 1 : 0, date: snapshot.sessionStartedAt ?? Date(), status: .completed)); if snapshot.phase == .breakTime { if let i = tasks.firstIndex(where: { $0.id == task.id }) { tasks[i].rounds += 1; tasks[i].focusSeconds += seconds } } }; notify("番茄钟完成", "专注和休息都已完成。"); resetTimer(); Task { await activityManager.end() } } }
    private func resetTimer() { timer?.invalidate(); timer = nil; snapshot = TimerSnapshot(taskID: nil, phase: .focus, isRunning: false, startedAt: nil, sessionStartedAt: nil, startValue: 1500, remaining: 1500, elapsed: 0, pendingFocusSeconds: 0); persist() }
    private func restoreTimer() { guard snapshot.isRunning else { return }; updateLiveTime(); if snapshot.remaining <= 0 && snapshot.phase == .breakTime { finishPhase() } else { startTimer() } }
    private func notify(_ title: String, _ body: String) { guard settings.notificationsOn else { return }; let content = UNMutableNotificationContent(); content.title = title; content.body = body; content.sound = settings.soundOn ? .default : nil; let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil); UNUserNotificationCenter.current().add(request) }
    private var focusElapsedSeconds: Int { currentTask?.type == .countup ? snapshot.elapsed : snapshot.focusedSeconds }
}

private extension TimerSnapshot { var focusedSeconds: Int { max(0, startValue - remaining) } }
