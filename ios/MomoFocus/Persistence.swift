import Foundation

final class JSONStore {
    private let defaults = UserDefaults.standard
    func read<T: Decodable>(_ type: T.Type, key: String, fallback: T) -> T {
        guard let data = defaults.data(forKey: key), let value = try? JSONDecoder().decode(type, from: data) else { return fallback }
        return value
    }
    func write<T: Encodable>(_ value: T, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults.set(data, forKey: key)
    }
}

enum StorageKey {
    static let tasks = "momofocus.ios.tasks"
    static let todos = "momofocus.ios.todos"
    static let notes = "momofocus.ios.notes"
    static let sessions = "momofocus.ios.sessions"
    static let timer = "momofocus.ios.timer"
    static let settings = "momofocus.ios.settings"
    static let slogan = "momofocus.ios.slogan"
}

extension Date {
    var dayKey: String { ISO8601DateFormatter().string(from: self).prefix(10).description }
    var shortText: String { formatted(date: .abbreviated, time: .shortened) }
}
