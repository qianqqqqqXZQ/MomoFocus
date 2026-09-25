import SwiftUI

struct RootView: View {
    @EnvironmentObject private var store: AppStore
    @State private var selectedTab = 0
    var body: some View {
        TabView(selection: $selectedTab) {
            FocusView().tabItem { Label("专注", systemImage: "timer") }.tag(0)
            StatsView().tabItem { Label("统计", systemImage: "chart.bar.xaxis") }.tag(1)
            SettingsView().tabItem { Label("设置", systemImage: "gearshape") }.tag(2)
        }.tint(MomoTheme.red).background(MomoTheme.background).preferredColorScheme(.light)
    }
}

struct FocusView: View {
    @EnvironmentObject private var store: AppStore
    @State private var showingTask = false
    @State private var showingMemo = false
    @State private var editingSlogan = false
    @State private var draftSlogan = ""
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    HStack { TomatoMark(); VStack(alignment: .leading) { Text("番茄小窝").font(.headline).foregroundStyle(MomoTheme.ink); Text(Date.now.formatted(date: .complete, time: .omitted)).font(.caption).foregroundStyle(MomoTheme.muted) }; Spacer(); Button { showingMemo = true } label: { Image(systemName: "note.text").font(.title3) }.accessibilityLabel("备忘录") }
                    Group { if editingSlogan { TextEditor(text: $draftSlogan).frame(height: 65).padding(8).background(MomoTheme.paper).clipShape(RoundedRectangle(cornerRadius: 12)).overlay(alignment: .bottomTrailing) { Button("保存") { store.slogan = draftSlogan; store.persist(); editingSlogan = false }.padding(10).font(.caption.weight(.bold)) } } else { Button { draftSlogan = store.slogan; editingSlogan = true } label: { Text(store.slogan).font(.title2.weight(.bold)).multilineTextAlignment(.leading).foregroundStyle(MomoTheme.ink) } } }
                    VStack(spacing: 16) { TimerRing(progress: store.progress, seconds: store.displaySeconds, phase: store.snapshot.phase, isRunning: store.snapshot.isRunning); HStack(spacing: 12) { Button { store.snapshot.isRunning ? store.pause() : store.start() } label: { Label(store.snapshot.isRunning ? "暂停" : "开始", systemImage: store.snapshot.isRunning ? "pause.fill" : "play.fill").frame(maxWidth: .infinity) }.buttonStyle(PrimaryButton()); Button { store.abandon() } label: { Image(systemName: "xmark").frame(width: 48, height: 48) }.buttonStyle(SecondaryButton()).disabled(!store.snapshot.isRunning) } }.frame(maxWidth: .infinity).padding(.vertical, 12)
                    HStack { Text("今日任务").font(.title3.bold()).foregroundStyle(MomoTheme.ink); Spacer(); Button { showingTask = true } label: { Label("新建", systemImage: "plus") }.font(.subheadline.weight(.semibold)) }
                    if store.tasks.isEmpty { Text("创建一个任务，开始今天的专注。").foregroundStyle(MomoTheme.muted).padding(.vertical, 15) } else { ForEach(store.tasks) { task in TaskRow(task: task, selected: task.id == store.snapshot.taskID) { store.select(task) } } }
                    HStack { Text("Todo").font(.title3.bold()).foregroundStyle(MomoTheme.ink); Spacer(); NavigationLink { TodoView() } label: { Text("查看全部") }.font(.caption) }
                    TodoPreview()
                }.padding(20)
            }.background(MomoTheme.background).navigationBarHidden(true)
        }.sheet(isPresented: $showingTask) { TaskEditor() }.sheet(isPresented: $showingMemo) { MemoView() }
    }
}

struct TaskRow: View {
    let task: FocusTask; let selected: Bool; let action: () -> Void
    var body: some View { Button(action: action) { HStack(spacing: 12) { Circle().fill(Color(hex: task.color.color)).frame(width: 13, height: 13); VStack(alignment: .leading, spacing: 3) { Text(task.text).font(.body.weight(.semibold)).foregroundStyle(MomoTheme.ink).lineLimit(2); Text(task.type.label + " · " + formatMinutes(task.focusMinutes)).font(.caption).foregroundStyle(MomoTheme.muted) }; Spacer(); Text("\(task.rounds) 次").font(.caption.monospaced()).foregroundStyle(MomoTheme.muted); Image(systemName: selected ? "checkmark.circle.fill" : "chevron.right").foregroundStyle(selected ? MomoTheme.mint : MomoTheme.muted) } .padding(15).background(Color(hex: task.color.color).opacity(selected ? 0.9 : 0.55)).clipShape(RoundedRectangle(cornerRadius: 14)) }.buttonStyle(.plain) }
}

struct TodoPreview: View { @EnvironmentObject private var store: AppStore; var body: some View { VStack(spacing: 0) { ForEach(store.todos.prefix(3)) { todo in HStack { Button { if let i = store.todos.firstIndex(where: { $0.id == todo.id }) { store.todos[i].done.toggle(); store.persist() } } label: { Image(systemName: todo.done ? "checkmark.circle.fill" : "circle").foregroundStyle(todo.done ? MomoTheme.mint : MomoTheme.muted) }; Text(todo.text).strikethrough(todo.done).foregroundStyle(MomoTheme.ink); Spacer() }.padding(.vertical, 9) } } }
}

struct TodoView: View { @EnvironmentObject private var store: AppStore; @State private var input = ""; @State private var selected: UUID?
    var body: some View { List { Section { HStack { TextField("添加 Todo", text: $input); Button { guard !input.trimmingCharacters(in: .whitespaces).isEmpty else { return }; store.todos.append(Todo(text: input)); input = ""; store.persist() } label: { Image(systemName: "plus.circle.fill") } } } ForEach(store.todos) { todo in VStack(alignment: .leading) { HStack { Button { toggle(todo) } label: { Image(systemName: todo.done ? "checkmark.circle.fill" : "circle") }; Text(todo.text).foregroundStyle(MomoTheme.ink); Spacer(); Button { selected = selected == todo.id ? nil : todo.id } label: { Image(systemName: "text.bubble") } } if selected == todo.id { ForEach(todo.thoughts) { Text($0.text).font(.caption).foregroundStyle(MomoTheme.muted).padding(.leading, 30) } Button("添加想法") { addThought(to: todo) }.font(.caption) } } } .onDelete { store.todos.remove(atOffsets: $0); store.persist() } }.navigationTitle("Todo").toolbar { EditButton() } }
    private func toggle(_ todo: Todo) { if let i = store.todos.firstIndex(where: { $0.id == todo.id }) { store.todos[i].done.toggle(); store.persist() } }
    private func addThought(to todo: Todo) { guard let i = store.todos.firstIndex(where: { $0.id == todo.id }) else { return }; store.todos[i].thoughts.append(TodoThought(text: "新的想法")); store.persist() }
}

struct MemoView: View { @EnvironmentObject private var store: AppStore; @State private var selected: UUID?; @State private var title = ""; @State private var bodyText = ""; var body: some View { NavigationStack { HStack(spacing: 0) { List(store.notes) { note in Button { selected = note.id; title = note.title; bodyText = note.body } label: { VStack(alignment: .leading) { Text(note.title).font(.headline); Text(note.body).font(.caption).lineLimit(2).foregroundStyle(MomoTheme.muted) } } }.frame(width: 150); VStack { TextField("标题", text: $title).font(.title2.bold()).textFieldStyle(.plain); Divider(); TextEditor(text: $bodyText).onChange(of: bodyText) { _, _ in save() } }.padding(16) }.navigationTitle("备忘录").toolbar { Button { let note = MemoNote(title: "新备忘录", body: ""); store.notes.insert(note, at: 0); selected = note.id; title = note.title; bodyText = note.body; store.persist() } label: { Image(systemName: "plus") }; Button(role: .destructive) { delete() } label: { Image(systemName: "trash") } } }.onAppear { if let n = store.notes.first { selected = n.id; title = n.title; bodyText = n.body } } }
    private func save() { guard let id = selected, let i = store.notes.firstIndex(where: { $0.id == id }) else { return }; store.notes[i].title = title; store.notes[i].body = bodyText; store.notes[i].updatedAt = Date(); store.persist() }; private func delete() { guard let id = selected else { return }; store.notes.removeAll { $0.id == id }; store.persist(); selected = nil; title = ""; bodyText = "" }
}

struct TaskEditor: View { @EnvironmentObject private var store: AppStore; @Environment(\.dismiss) private var dismiss; @State private var name = ""; @State private var type: TaskType = .pomodoro; @State private var focus = 25; @State private var rest = 5; @State private var color: TaskColor = .sage; var body: some View { NavigationStack { Form { TextField("任务名称", text: $name); Picker("类型", selection: $type) { ForEach(TaskType.allCases) { Text($0.label).tag($0) } }; Stepper("专注 \(focus) 分钟", value: $focus, in: 1...180); Stepper("休息 \(rest) 分钟", value: $rest, in: 1...60); Picker("颜色", selection: $color) { ForEach(TaskColor.allCases) { Text($0.label).tag($0) } } }.navigationTitle("新建任务").toolbar { ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("保存") { guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return }; store.tasks.append(FocusTask(text: name, type: type, focusMinutes: focus, breakMinutes: rest, color: color)); store.persist(); dismiss() } } } } }

struct StatsView: View { @EnvironmentObject private var store: AppStore; @State private var filter: FocusFilter = .day; var filtered: [FocusSession] { let now = Date(); return store.sessions.filter { session in switch filter { case .day: session.date.dayKey == now.dayKey; case .week: session.date >= Calendar.current.date(byAdding: .day, value: -7, to: now)!; case .month: session.date >= Calendar.current.date(byAdding: .month, value: -1, to: now)!; case .custom: true } } }; var body: some View { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 18) { Text("专注统计").font(.largeTitle.bold()).foregroundStyle(MomoTheme.ink); Picker("范围", selection: $filter) { ForEach(FocusFilter.allCases) { Text($0.label).tag($0) } }.pickerStyle(.segmented); HStack { Metric(title: "专注次数", value: "\(filtered.filter { $0.status == .completed }.count)"); Metric(title: "累计时长", value: formatDuration(filtered.reduce(0) { $0 + $1.seconds })) }; Text("按任务分布").font(.title3.bold()); ForEach(Dictionary(grouping: filtered, by: \.taskName).sorted { $0.value.reduce(0) { $0 + $1.seconds } > $1.value.reduce(0) { $0 + $1.seconds } }, id: \.key) { item in HStack { Text(item.key).lineLimit(1); Spacer(); Text(formatDuration(item.value.reduce(0) { $0 + $1.seconds })).foregroundStyle(MomoTheme.muted) }.padding().background(MomoTheme.paper).clipShape(RoundedRectangle(cornerRadius: 12)) } }.padding(20) }.background(MomoTheme.background).navigationBarHidden(true) } } }
struct Metric: View { let title: String; let value: String; var body: some View { VStack(alignment: .leading) { Text(title).font(.caption).foregroundStyle(MomoTheme.muted); Text(value).font(.title2.monospaced().bold()).foregroundStyle(MomoTheme.ink) }.frame(maxWidth: .infinity, alignment: .leading).padding().background(MomoTheme.paper).clipShape(RoundedRectangle(cornerRadius: 12)) } }

struct SettingsView: View { @EnvironmentObject private var store: AppStore; var body: some View { NavigationStack { Form { Section("偏好") { Toggle("提示音", isOn: $store.settings.soundOn).onChange(of: store.settings.soundOn) { _, _ in store.persist() }; Toggle("通知", isOn: $store.settings.notificationsOn).onChange(of: store.settings.notificationsOn) { _, _ in store.persist() } }; Section { Text("本地数据存储，不上传服务器。\n支持 iOS 16.1 及以上的锁屏实时活动；支持灵动岛的机型会显示动态倒计时。\n版本 0.1.0").font(.footnote).foregroundStyle(MomoTheme.muted) } }.navigationTitle("设置") } } }

struct PrimaryButton: ButtonStyle { func makeBody(configuration: Configuration) -> some View { configuration.label.font(.headline).foregroundStyle(.white).padding(.vertical, 15).background(MomoTheme.red).clipShape(RoundedRectangle(cornerRadius: 14)).opacity(configuration.isPressed ? 0.75 : 1) } }
struct SecondaryButton: ButtonStyle { func makeBody(configuration: Configuration) -> some View { configuration.label.font(.headline).foregroundStyle(MomoTheme.muted).background(MomoTheme.paper).clipShape(RoundedRectangle(cornerRadius: 14)).overlay(RoundedRectangle(cornerRadius: 14).stroke(MomoTheme.line)) } }

func formatMinutes(_ minutes: Int) -> String { "\(minutes) 分钟" }
func formatDuration(_ seconds: Int) -> String { let minutes = seconds / 60; return minutes < 60 ? "\(minutes) 分钟" : "\(minutes / 60) 小时 \(minutes % 60) 分钟" }
