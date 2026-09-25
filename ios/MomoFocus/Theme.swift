import SwiftUI

extension Color {
    init(hex: String) {
        let value = Int(hex.dropFirst(), radix: 16) ?? 0
        self.init(red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255)
    }
}

enum MomoTheme {
    static let ink = Color(hex: "#43515C")
    static let muted = Color(hex: "#8998A0")
    static let line = Color(hex: "#E3E7E4")
    static let red = Color(hex: "#EE9695")
    static let mint = Color(hex: "#9BCFBD")
    static let paper = Color(hex: "#FFFDF9")
    static let background = Color(hex: "#F8F7F3")
}

struct TomatoMark: View {
    var body: some View { Text("🍅").font(.system(size: 28)).accessibilityLabel("番茄小窝") }
}

struct TimerRing: View {
    let progress: Double
    let seconds: Int
    let phase: TimerPhase
    let isRunning: Bool
    var body: some View {
        ZStack {
            Circle().stroke(MomoTheme.line, lineWidth: 12)
            Circle().trim(from: 0, to: progress).stroke(isRunning ? MomoTheme.mint : MomoTheme.red, style: StrokeStyle(lineWidth: 12, lineCap: .round)).rotationEffect(.degrees(-90)).animation(.easeInOut, value: progress)
            VStack(spacing: 8) { Text(phase.label).font(.subheadline.weight(.semibold)).foregroundStyle(MomoTheme.muted); Text(String(format: "%02d:%02d", seconds / 60, seconds % 60)).font(.system(size: 42, weight: .medium, design: .monospaced)).foregroundStyle(MomoTheme.ink); Text(isRunning ? "正在进行" : "准备开始").font(.caption).foregroundStyle(MomoTheme.muted) }
        }.frame(width: 244, height: 244)
    }
}
