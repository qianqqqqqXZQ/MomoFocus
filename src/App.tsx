import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coffee,
  FileText,
  Palette,
  Pencil,
  Leaf,
  Menu,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type Mode = "focus" | "short" | "long";
type TaskType = "pomodoro" | "countup";
type View = "timer" | "stats";
type RightPanelView = "todo" | "notes";
type FocusStatus = "completed" | "abandoned" | "skipped";
type FocusTask = {
  id: number;
  text: string;
  rounds: number;
  focusSeconds: number;
  done: boolean;
  type: TaskType;
  focusMinutes?: number;
  breakMinutes?: number;
  color?: string;
};
type TodoThought = { id: number; text: string; createdAt: string };
type Todo = {
  id: number;
  text: string;
  done: boolean;
  thoughts?: TodoThought[];
};
type Note = { id: number; text: string; createdAt: string };
type MemoNote = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
type FocusSession = {
  id: number;
  taskName: string;
  taskId?: number;
  seconds: number;
  rounds: number;
  date?: string;
  status?: FocusStatus;
  startedAt?: string;
};
type Filter = "day" | "week" | "month" | "custom";
type TimerSnapshot = {
  taskId: number | null;
  mode: Mode;
  isRunning: boolean;
  startedAt: number | null;
  startValue: number;
  remaining: number;
  elapsed: number;
  completedPending: boolean;
  sessionStartedAt?: number | null;
};
type AppSettings = { soundOn: boolean; notificationsOn: boolean };

const MODES: Record<
  Mode,
  { label: string; minutes: number; icon: typeof Clock3 }
> = {
  focus: { label: "专注", minutes: 25, icon: Clock3 },
  short: { label: "短休息", minutes: 5, icon: Coffee },
  long: { label: "长休息", minutes: 15, icon: Leaf },
};
const DEFAULT_FOCUS_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;
const initialNotes: Note[] = [
  {
    id: 1,
    text: "今天的节奏很好，下午留一点时间做收尾。",
    createdAt: "今天 09:42",
  },
];
const initialMemoNotes: MemoNote[] = [
  {
    id: 1,
    title: "今天的节奏",
    body: "今天的节奏很好，下午留一点时间做收尾。",
    createdAt: "今天 09:42",
    updatedAt: "今天 09:42",
  },
];
const initialTodos: Todo[] = [
  { id: 1, text: "整理今天的优先事项", done: false },
  { id: 2, text: "给自己留一段安静时间", done: false },
];
const STORAGE_KEYS = {
  todos: "momofocus.todos",
  notes: "momofocus.notes",
  quickNotes: "momofocus.quickNotes",
  tasks: "momofocus.tasks",
  sessions: "momofocus.sessions",
  timer: "momofocus.timer",
  settings: "momofocus.settings",
  slogan: "momofocus.slogan",
} as const;
const DEFAULT_SLOGAN = "慢一点，\n也很好。";
const TASK_COLORS = [
  { id: "sage", label: "鼠尾草绿", background: "#e3f3eb", border: "#c8e5d7" },
  { id: "sky", label: "天空蓝", background: "#e5f1fb", border: "#c8e0f2" },
  { id: "lemon", label: "奶油黄", background: "#fff5cf", border: "#f1e2a5" },
  { id: "rose", label: "樱花粉", background: "#ffe7e4", border: "#f2ccc9" },
  { id: "orange", label: "蜜桃橙", background: "#ffeadb", border: "#f2d0b8" },
  { id: "brown", label: "燕麦色", background: "#f3eadf", border: "#e2d5c7" },
  {
    id: "lavender",
    label: "薰衣草紫",
    background: "#eee8fb",
    border: "#dcd0f0",
  },
  { id: "mint", label: "薄荷青", background: "#dff4f0", border: "#c2e4dc" },
];
const DEFAULT_TASK_COLOR = TASK_COLORS[0].id;
const getTaskColor = (color?: string) =>
  TASK_COLORS.find((item) => item.id === color) ?? TASK_COLORS[0];
const readStorage = <T,>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
) => {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(key) ?? "null",
    );
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
};
const writeStorage = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or full; the in-memory state still remains usable.
  }
};
const nextId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
const isArray = <T,>(value: unknown): value is T[] => Array.isArray(value);
const normalizeTask = (task: FocusTask): FocusTask => ({
  ...task,
  focusMinutes: task.focusMinutes ?? DEFAULT_FOCUS_MINUTES,
  breakMinutes: task.breakMinutes ?? DEFAULT_BREAK_MINUTES,
});
const isFocusTaskArray = (value: unknown): value is FocusTask[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as FocusTask).id === "number" &&
      typeof (item as FocusTask).text === "string" &&
      typeof (item as FocusTask).rounds === "number" &&
      typeof (item as FocusTask).focusSeconds === "number" &&
      typeof (item as FocusTask).done === "boolean" &&
      ["pomodoro", "countup"].includes((item as FocusTask).type),
  );
const isTodoThoughtArray = (value: unknown): value is TodoThought[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as TodoThought).id === "number" &&
      typeof (item as TodoThought).text === "string" &&
      typeof (item as TodoThought).createdAt === "string",
  );
const isTodoArray = (value: unknown): value is Todo[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as Todo).id === "number" &&
      typeof (item as Todo).text === "string" &&
      typeof (item as Todo).done === "boolean" &&
      ((item as Todo).thoughts === undefined ||
        isTodoThoughtArray((item as Todo).thoughts)),
  );
const isMemoArray = (value: unknown): value is MemoNote[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as MemoNote).id === "number" &&
      typeof (item as MemoNote).title === "string" &&
      typeof (item as MemoNote).body === "string" &&
      typeof (item as MemoNote).createdAt === "string" &&
      typeof (item as MemoNote).updatedAt === "string",
  );
const isNoteArray = (value: unknown): value is Note[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as Note).id === "number" &&
      typeof (item as Note).text === "string" &&
      typeof (item as Note).createdAt === "string",
  );
const isTimerSnapshot = (value: unknown): value is TimerSnapshot =>
  Boolean(
    value &&
    typeof value === "object" &&
    ["focus", "short", "long"].includes((value as TimerSnapshot).mode) &&
    typeof (value as TimerSnapshot).remaining === "number" &&
    typeof (value as TimerSnapshot).elapsed === "number",
  );
const isSettings = (value: unknown): value is AppSettings =>
  Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as AppSettings).soundOn === "boolean" &&
    typeof (value as AppSettings).notificationsOn === "boolean",
  );
const formatTime = (seconds: number) =>
  `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return minutes < 60
    ? `${minutes} 分钟`
    : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
};
const dateKey = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};
const dateLabel = (date = new Date()) =>
  `${date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()} · ${date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}`;
const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

function TomatoIcon() {
  return (
    <svg
      className="tomato-icon"
      viewBox="0 0 48 48"
      role="img"
      aria-label="番茄小窝图标"
    >
      <path
        d="M24 13c-10.8 0-18 7.3-18 16.2C6 38.4 13.8 44 24 44s18-5.6 18-14.8C42 20.3 34.8 13 24 13Z"
        fill="currentColor"
      />
      <path
        d="M24 14.5c-1.9-5.2.8-9.7 5.8-11.5.9 4.2-.6 8.6-5.8 11.5Z"
        fill="#548a72"
      />
      <path
        d="M23.8 14.5c-4.1-4-9-3.7-12.5-.8 3.6 3.4 8.2 4.2 12.5.8Z"
        fill="#6ca384"
      />
      <path
        d="M14.5 20.5c2.3-2.2 5.1-3.1 7.2-2.1-1.4 2.6-3.8 4.1-7.2 2.1Z"
        fill="rgba(255,255,255,.34)"
      />
    </svg>
  );
}

function App() {
  const [view, setView] = useState<View>("timer");
  const [slogan, setSlogan] = useState(() =>
    readStorage(
      STORAGE_KEYS.slogan,
      DEFAULT_SLOGAN,
      (value): value is string => typeof value === "string",
    ),
  );
  const [tasks, setTasks] = useState<FocusTask[]>(() =>
    readStorage(STORAGE_KEYS.tasks, [], isFocusTaskArray).map(normalizeTask),
  );
  const [todos, setTodos] = useState<Todo[]>(() =>
    readStorage(STORAGE_KEYS.todos, initialTodos, isTodoArray),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetailsId, setTaskDetailsId] = useState<number | null>(null);
  const [taskEditText, setTaskEditText] = useState("");
  const [taskEditType, setTaskEditType] = useState<TaskType>("pomodoro");
  const [taskEditFocusMinutes, setTaskEditFocusMinutes] = useState(
    DEFAULT_FOCUS_MINUTES,
  );
  const [taskEditBreakMinutes, setTaskEditBreakMinutes] = useState(
    DEFAULT_BREAK_MINUTES,
  );
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [isChoosingTaskColor, setIsChoosingTaskColor] = useState(false);
  const [confirmingTaskDelete, setConfirmingTaskDelete] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [taskTypeInput, setTaskTypeInput] = useState<TaskType>("pomodoro");
  const [taskFocusMinutesInput, setTaskFocusMinutesInput] = useState(
    DEFAULT_FOCUS_MINUTES,
  );
  const [taskBreakMinutesInput, setTaskBreakMinutesInput] = useState(
    DEFAULT_BREAK_MINUTES,
  );
  const [todoInput, setTodoInput] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(MODES.focus.minutes * 60);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<FocusSession[]>(() =>
    readStorage(STORAGE_KEYS.sessions, [], isArray<FocusSession>),
  );
  const [notes, setNotes] = useState<Note[]>(() =>
    readStorage(STORAGE_KEYS.quickNotes, initialNotes, isNoteArray),
  );
  const [noteInput, setNoteInput] = useState("");
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [memoNotes, setMemoNotes] = useState<MemoNote[]>(() =>
    readStorage(STORAGE_KEYS.notes, initialMemoNotes, isMemoArray),
  );
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>("todo");
  const [soundOn, setSoundOn] = useState(
    () =>
      readStorage(
        STORAGE_KEYS.settings,
        { soundOn: true, notificationsOn: true },
        isSettings,
      ).soundOn,
  );
  const [notificationsOn, setNotificationsOn] = useState(
    () =>
      readStorage(
        STORAGE_KEYS.settings,
        { soundOn: true, notificationsOn: true },
        isSettings,
      ).notificationsOn,
  );
  const [showSoundTip, setShowSoundTip] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const pendingPomodoroFocusSecondsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const pendingStartTaskIdRef = useRef<number | null>(null);
  const restoringRef = useRef(true);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const taskInDetails = tasks.find((task) => task.id === taskDetailsId) ?? null;
  const isCountup = selectedTask?.type === "countup";
  const focusMinutes = selectedTask?.focusMinutes ?? DEFAULT_FOCUS_MINUTES;
  const breakMinutes = selectedTask?.breakMinutes ?? DEFAULT_BREAK_MINUTES;
  const totalSeconds =
    (isCountup
      ? DEFAULT_FOCUS_MINUTES
      : mode === "focus"
        ? focusMinutes
        : breakMinutes) * 60;
  const displayedSeconds = isCountup ? elapsed : remaining;
  const progress = isCountup
    ? Math.min(1, elapsed / totalSeconds)
    : Math.min(1, 1 - remaining / totalSeconds);
  const radius = 136;
  const circumference = 2 * Math.PI * radius;
  const totalRounds = useMemo(
    () => tasks.reduce((total, task) => total + task.rounds, 0),
    [tasks],
  );
  const doneCount = useMemo(
    () => todos.filter((todo) => todo.done).length,
    [todos],
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.tasks, tasks);
  }, [tasks]);
  useEffect(() => {
    writeStorage(STORAGE_KEYS.todos, todos);
  }, [todos]);
  useEffect(() => {
    writeStorage(STORAGE_KEYS.sessions, sessions);
  }, [sessions]);
  useEffect(() => {
    writeStorage(STORAGE_KEYS.notes, memoNotes);
  }, [memoNotes]);
  useEffect(() => {
    writeStorage(STORAGE_KEYS.quickNotes, notes);
  }, [notes]);
  useEffect(() => {
    writeStorage(STORAGE_KEYS.settings, { soundOn, notificationsOn });
  }, [soundOn, notificationsOn]);
  useEffect(() => {
    writeStorage(STORAGE_KEYS.slogan, slogan);
  }, [slogan]);
  useEffect(() => {
    if (restoringRef.current) return;
    writeStorage(STORAGE_KEYS.timer, {
      taskId: selectedTaskId,
      mode,
      isRunning,
      startedAt: startedAtRef.current,
      startValue: startValueRef.current,
      remaining,
      elapsed,
      completedPending: !isCountup && remaining === 0,
      sessionStartedAt: sessionStartedAtRef.current,
    });
  }, [selectedTaskId, mode, isRunning, remaining, elapsed, isCountup]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  const notifyUser = useCallback(
    (title: string, body: string) => {
      if (notificationsOn) void window.momoFocusNative?.notify({ title, body });
    },
    [notificationsOn],
  );
  const playCompletionSound = useCallback(() => {
    if (!soundOn) return;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 740;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.55,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.6);
    } catch {
      /* Audio is optional and must not interrupt timing. */
    }
  }, [soundOn]);
  const recordSession = useCallback(
    (seconds: number, status: FocusStatus, completedRound: boolean) => {
      if (!selectedTask || seconds <= 0) return;
      const startedAt = sessionStartedAtRef.current ?? Date.now();
      setTasks((items) =>
        items.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                focusSeconds: task.focusSeconds + seconds,
                rounds: task.rounds + (completedRound ? 1 : 0),
              }
            : task,
        ),
      );
      setSessions((items) => [
        {
          id: nextId(),
          taskId: selectedTask.id,
          taskName: selectedTask.text,
          seconds,
          rounds: completedRound ? 1 : 0,
          date: dateKey(new Date(startedAt)),
          status,
          startedAt: new Date(startedAt).toISOString(),
        },
        ...items,
      ]);
      sessionStartedAtRef.current = null;
    },
    [selectedTask],
  );
  const getCurrentPhaseSeconds = useCallback(() => {
    if (isCountup) {
      return startedAtRef.current
        ? startValueRef.current +
            Math.floor((Date.now() - startedAtRef.current) / 1000)
        : elapsed;
    }
    const liveRemaining = startedAtRef.current
      ? Math.max(
          0,
          Math.ceil(
            (startedAtRef.current + startValueRef.current * 1000 - Date.now()) /
              1000,
          ),
        )
      : remaining;
    return Math.max(0, startValueRef.current - liveRemaining);
  }, [elapsed, isCountup, remaining]);
  const finishPhase = useCallback(() => {
    if (!selectedTask) return;
    playCompletionSound();
    if (isCountup) return;
    if (mode === "focus") {
      pendingPomodoroFocusSecondsRef.current = getCurrentPhaseSeconds();
      setMode("short");
      setRemaining(breakMinutes * 60);
      setElapsed(0);
      setCompletionMessage("专注完成，休息已开始");
      notifyUser("专注完成，休息已开始", "请休息一下，休息结束后本轮将完成。");
      startedAtRef.current = Date.now();
      startValueRef.current = breakMinutes * 60;
      setIsRunning(true);
      timerRef.current = window.setInterval(updateTimer, 250);
      return;
    }
    recordSession(pendingPomodoroFocusSecondsRef.current, "completed", true);
    pendingPomodoroFocusSecondsRef.current = 0;
    setIsRunning(false);
    startedAtRef.current = null;
    setRemaining(0);
    setCompletionMessage("番茄钟完成");
    notifyUser("番茄钟完成", "专注和休息都已完成。");
  }, [
    breakMinutes,
    getCurrentPhaseSeconds,
    isCountup,
    mode,
    notifyUser,
    playCompletionSound,
    recordSession,
    selectedTask,
  ]);
  const updateTimer = useCallback(() => {
    if (!startedAtRef.current) return;
    if (isCountup) {
      setElapsed(
        startValueRef.current +
          Math.floor((Date.now() - startedAtRef.current) / 1000),
      );
      return;
    }
    const next = Math.max(
      0,
      Math.ceil(
        (startedAtRef.current + startValueRef.current * 1000 - Date.now()) /
          1000,
      ),
    );
    setRemaining(next);
    if (next === 0) {
      stopTimer();
      setIsRunning(false);
      finishPhase();
    }
  }, [finishPhase, isCountup, stopTimer]);
  const startTimer = useCallback(() => {
    if (!selectedTask || startedAtRef.current || (!isCountup && remaining <= 0))
      return;
    startedAtRef.current = Date.now();
    if (!sessionStartedAtRef.current) sessionStartedAtRef.current = Date.now();
    startValueRef.current = isCountup ? elapsed : remaining;
    setCompletionMessage("");
    setIsRunning(true);
    stopTimer();
    timerRef.current = window.setInterval(updateTimer, 250);
  }, [elapsed, isCountup, remaining, selectedTask, stopTimer, updateTimer]);
  useEffect(() => {
    if (!restoringRef.current) return;
    const snapshot = readStorage<TimerSnapshot | null>(
      STORAGE_KEYS.timer,
      null,
      (value): value is TimerSnapshot | null =>
        value === null || isTimerSnapshot(value),
    );
    if (
      snapshot &&
      snapshot.taskId !== null &&
      tasks.some((task) => task.id === snapshot.taskId)
    ) {
      setSelectedTaskId(snapshot.taskId);
      const restoredTask = tasks.find((task) => task.id === snapshot.taskId);
      setMode(
        restoredTask?.type === "countup"
          ? "focus"
          : snapshot.mode === "short"
            ? "short"
            : "focus",
      );
      setRemaining(snapshot.remaining);
      setElapsed(snapshot.elapsed);
      startValueRef.current = snapshot.startValue;
      startedAtRef.current = snapshot.startedAt;
      sessionStartedAtRef.current =
        snapshot.sessionStartedAt ?? snapshot.startedAt;
      if (snapshot.isRunning && snapshot.startedAt) {
        setIsRunning(true);
        if (snapshot.mode !== "focus" || snapshot.remaining > 0)
          timerRef.current = window.setInterval(updateTimer, 250);
      }
      if (snapshot.completedPending) {
        setRemaining(0);
        setIsRunning(false);
        startedAtRef.current = null;
        setCompletionMessage("本轮已完成，可以开始休息了");
      }
    }
    restoringRef.current = false;
  }, [tasks, updateTimer]);
  useEffect(() => {
    if (
      !selectedTask ||
      restoringRef.current ||
      pendingStartTaskIdRef.current !== selectedTask.id
    )
      return;
    pendingStartTaskIdRef.current = null;
    startTimer();
  }, [selectedTask, startTimer]);
  useEffect(() => () => stopTimer(), [stopTimer]);
  const toggleTimer = () => {
    if (isRunning) {
      updateTimer();
      setIsRunning(false);
      stopTimer();
      startedAtRef.current = null;
      setCompletionMessage("已暂停");
      return;
    }
    startTimer();
  };
  const abandonTask = () => {
    if (!selectedTask) return;
    updateTimer();
    const seconds =
      mode === "short"
        ? pendingPomodoroFocusSecondsRef.current
        : getCurrentPhaseSeconds();
    const shouldRecord = seconds >= 5;
    if (shouldRecord) recordSession(seconds, "abandoned", false);
    else alert("专注时长不足 5 秒，不计入历史记录");
    stopTimer();
    setIsRunning(false);
    startedAtRef.current = null;
    sessionStartedAtRef.current = null;
    pendingPomodoroFocusSecondsRef.current = 0;
    setSelectedTaskId(null);
    setElapsed(0);
    setCompletionMessage("");
  };
  const openTaskDetails = (task: FocusTask) => {
    setTaskDetailsId(task.id);
    setTaskEditText(task.text);
    setTaskEditType(task.type);
    setTaskEditFocusMinutes(task.focusMinutes ?? DEFAULT_FOCUS_MINUTES);
    setTaskEditBreakMinutes(task.breakMinutes ?? DEFAULT_BREAK_MINUTES);
    setIsEditingTask(false);
    setIsChoosingTaskColor(false);
    setConfirmingTaskDelete(false);
  };
  const selectTask = (task: FocusTask) => {
    openTaskDetails(task);
  };
  const startTask = (task: FocusTask) => {
    setTaskDetailsId(null);
    if (selectedTask?.id === task.id) {
      if (!isRunning) startTimer();
      return;
    }
    if (isRunning) abandonTask();
    stopTimer();
    setIsRunning(false);
    pendingStartTaskIdRef.current = task.id;
    setSelectedTaskId(task.id);
    setMode(task.type === "countup" ? "focus" : "focus");
    setRemaining(
      (task.type === "countup"
        ? DEFAULT_FOCUS_MINUTES
        : (task.focusMinutes ?? DEFAULT_FOCUS_MINUTES)) * 60,
    );
    setElapsed(0);
    startedAtRef.current = null;
    sessionStartedAtRef.current = null;
    pendingPomodoroFocusSecondsRef.current = 0;
  };
  const saveTaskEdit = () => {
    const text = taskEditText.trim();
    if (!taskInDetails || !text) return;
    const previousName = taskInDetails.text;
    if (
      selectedTaskId === taskInDetails.id &&
      (taskEditType !== taskInDetails.type ||
        taskEditFocusMinutes !==
          (taskInDetails.focusMinutes ?? DEFAULT_FOCUS_MINUTES) ||
        taskEditBreakMinutes !==
          (taskInDetails.breakMinutes ?? DEFAULT_BREAK_MINUTES))
    ) {
      if (isRunning) abandonTask();
      stopTimer();
      setIsRunning(false);
      startedAtRef.current = null;
      setMode("focus");
      setRemaining(
        (taskEditType === "countup"
          ? DEFAULT_FOCUS_MINUTES
          : taskEditFocusMinutes) * 60,
      );
      setElapsed(0);
    }
    setTasks((items) =>
      items.map((task) =>
        task.id === taskInDetails.id
          ? {
              ...task,
              text,
              type: taskEditType,
              focusMinutes: taskEditFocusMinutes,
              breakMinutes: taskEditBreakMinutes,
            }
          : task,
      ),
    );
    setSessions((items) =>
      items.map((session) =>
        session.taskId === taskInDetails.id ||
        (!session.taskId && session.taskName === previousName)
          ? { ...session, taskId: taskInDetails.id, taskName: text }
          : session,
      ),
    );
    setIsEditingTask(false);
  };
  const setTaskColor = (color: string) => {
    if (!taskInDetails) return;
    setTasks((items) =>
      items.map((task) =>
        task.id === taskInDetails.id ? { ...task, color } : task,
      ),
    );
    setIsChoosingTaskColor(false);
  };
  const deleteTask = () => {
    if (!taskInDetails) return;
    if (selectedTaskId === taskInDetails.id) {
      if (isRunning) abandonTask();
      stopTimer();
      setIsRunning(false);
      setSelectedTaskId(null);
      setRemaining(DEFAULT_FOCUS_MINUTES * 60);
      setElapsed(0);
      startedAtRef.current = null;
      sessionStartedAtRef.current = null;
      pendingPomodoroFocusSecondsRef.current = 0;
      pendingStartTaskIdRef.current = null;
    }
    setTasks((items) => items.filter((task) => task.id !== taskInDetails.id));
    setTaskDetailsId(null);
    setConfirmingTaskDelete(false);
  };
  const addTask = () => {
    const text = taskInput.trim();
    if (!text) return;
    setTasks((items) => [
      ...items,
      {
        id: nextId(),
        text,
        rounds: 0,
        focusSeconds: 0,
        done: false,
        type: taskTypeInput,
        focusMinutes: taskFocusMinutesInput,
        breakMinutes: taskBreakMinutesInput,
        color: DEFAULT_TASK_COLOR,
      },
    ]);
    setTaskInput("");
    setIsCreatingTask(false);
  };
  const addTodo = () => {
    const text = todoInput.trim();
    if (!text) return;
    setTodos((items) => [...items, { id: nextId(), text, done: false }]);
    setTodoInput("");
  };
  const addNote = () => {
    const text = noteInput.trim();
    if (!text) return;
    setNotes((items) => [{ id: nextId(), text, createdAt: "刚刚" }, ...items]);
    setNoteInput("");
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape" && taskDetailsId !== null) {
        setTaskDetailsId(null);
        return;
      }
      if (taskDetailsId !== null) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === " ") {
        event.preventDefault();
        if (selectedTask) toggleTimer();
      } else if (event.key.toLowerCase() === "s" && selectedTask) abandonTask();
      else if (event.key === "Escape") {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        else if (showSoundTip) setShowSoundTip(false);
        else if (selectedTask) abandonTask();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
  const renderTaskEntry = () => (
    <div className="central-task-state">
      {tasks.length === 0 ? (
        <>
          <span className="empty-kicker">专注工作区</span>
          <h2>
            先从一件事开始，
            <br />
            <em>把注意力放回来。</em>
          </h2>
          <p>创建一个专注任务，再选择适合你的计时方式。</p>
        </>
      ) : (
        <>
          <span className="empty-kicker">专注任务</span>
          <h2>
            准备好开始
            <br />
            <em>下一件事了吗？</em>
          </h2>
          <div className="central-task-list">
            {tasks.map((task) => {
              const color = getTaskColor(task.color);
              return (
                <div
                  className="central-task-row"
                  key={task.id}
                  style={{
                    backgroundColor: color.background,
                    borderColor: color.border,
                  }}
                >
                  <button
                    className="central-task-info"
                    onClick={() => selectTask(task)}
                    aria-label={`查看任务 ${task.text} 的详情`}
                  >
                    <span className="central-task-mark" />
                    <span>
                      <b>{task.text}</b>
                      <small>
                        {task.type === "countup"
                          ? "正计时"
                          : `番茄钟 · ${task.focusMinutes ?? DEFAULT_FOCUS_MINUTES}/${task.breakMinutes ?? DEFAULT_BREAK_MINUTES} 分钟`}{" "}
                        · {formatDuration(task.focusSeconds)}
                      </small>
                    </span>
                    <ChevronDown size={15} />
                  </button>
                  <button
                    className="central-task-start"
                    onClick={() => startTask(task)}
                    aria-label={`开始任务 ${task.text}`}
                  >
                    开始
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      <div className={`new-task-form ${isCreatingTask ? "is-open" : ""}`}>
        {isCreatingTask ? (
          <>
            <div className="new-task-fields">
              <input
                autoFocus
                value={taskInput}
                onChange={(event) => setTaskInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addTask();
                }}
                placeholder="任务名称"
                aria-label="任务名称"
              />
              <select
                value={taskTypeInput}
                onChange={(event) =>
                  setTaskTypeInput(event.target.value as TaskType)
                }
              >
                <option value="pomodoro">番茄钟</option>
                <option value="countup">正计时 · 自由记录</option>
              </select>
              {taskTypeInput === "pomodoro" && (
                <div className="task-duration-fields">
                  <label>
                    专注
                    <input
                      type="number"
                      min={MIN_TIMER_MINUTES}
                      max={MAX_TIMER_MINUTES}
                      value={taskFocusMinutesInput}
                      onChange={(event) =>
                        setTaskFocusMinutesInput(
                          Math.max(
                            MIN_TIMER_MINUTES,
                            Number(event.target.value),
                          ),
                        )
                      }
                      aria-label="专注时长（分钟）"
                    />
                    分钟
                  </label>
                  <label>
                    休息
                    <input
                      type="number"
                      min={MIN_TIMER_MINUTES}
                      max={MAX_TIMER_MINUTES}
                      value={taskBreakMinutesInput}
                      onChange={(event) =>
                        setTaskBreakMinutesInput(
                          Math.max(
                            MIN_TIMER_MINUTES,
                            Number(event.target.value),
                          ),
                        )
                      }
                      aria-label="休息时长（分钟）"
                    />
                    分钟
                  </label>
                </div>
              )}
            </div>
            <div className="new-task-actions">
              <button
                className="primary-button"
                onClick={addTask}
                disabled={!taskInput.trim()}
              >
                <Plus size={16} />
                创建专注任务
              </button>
              <button
                className="text-button"
                onClick={() => setIsCreatingTask(false)}
              >
                取消
              </button>
            </div>
          </>
        ) : (
          <button
            className="new-task-button"
            onClick={() => setIsCreatingTask(true)}
          >
            <Plus size={18} />
            新建专注任务
          </button>
        )}
      </div>
      {sessions.length > 0 && <FocusHistory sessions={sessions} />}
    </div>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <TomatoIcon />
          </div>
          <div>
            <strong>MomoFocus</strong>
            <span>番茄小窝</span>
          </div>
        </div>
        <div className="top-actions">
          {view === "timer" ? (
            <div className="today-state">
              <span className="status-dot" />
              今日专注{" "}
              <b>
                {
                  sessions.filter(
                    (s) => s.date === dateKey() && s.status === "completed",
                  ).length
                }{" "}
                次
              </b>
            </div>
          ) : (
            <button className="back-button" onClick={() => setView("timer")}>
              <ArrowLeft size={15} />
              返回计时
            </button>
          )}
          <button
            className={`icon-button ${soundOn ? "" : "is-muted"}`}
            aria-label="切换声音"
            onClick={() => {
              setSoundOn((value) => !value);
              setShowSoundTip(true);
            }}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {showSoundTip && (
            <div className="mini-popover sound-popover">
              <span>{soundOn ? "提示音已开启" : "提示音已关闭"}</span>
              <button
                aria-label="关闭声音提示"
                onClick={() => setShowSoundTip(false)}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <button
            className="mobile-menu"
            aria-label="打开菜单"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            <Menu size={20} />
          </button>
          {mobileMenuOpen && (
            <div className="mini-popover mobile-menu-popover">
              <button
                onClick={() => {
                  setView("timer");
                  setMobileMenuOpen(false);
                }}
              >
                返回计时
              </button>
              <button
                onClick={() => {
                  setView("stats");
                  setMobileMenuOpen(false);
                }}
              >
                查看统计
              </button>
              <button onClick={() => setNotificationsOn((value) => !value)}>
                系统通知：{notificationsOn ? "开" : "关"}
              </button>
            </div>
          )}
        </div>
      </header>
      {view === "timer" ? (
        <TimerView
          {...{
            tasks,
            todos,
            selectedTask,
            setTodos,
            todoInput,
            setTodoInput,
            addTodo,
            notes,
            noteInput,
            setNoteInput,
            addNote,
            expandedNote,
            setExpandedNote,
            memoNotes,
            setMemoNotes,
            rightPanelView,
            setRightPanelView,
            totalRounds,
            doneCount,
            renderTaskEntry,
            openTaskDetails,
            isCountup,
            mode,
            displayedSeconds,
            radius,
            circumference,
            progress,
            isRunning,
            remaining,
            completionMessage,
            toggleTimer,
            abandonTask,
            sessions,
            setView,
            slogan,
            setSlogan,
          }}
        />
      ) : (
        <StatsView sessions={sessions} />
      )}
      {taskInDetails && (
        <TaskDetailsDialog
          task={taskInDetails}
          sessions={sessions.filter(
            (session) =>
              session.taskId === taskInDetails.id ||
              (!session.taskId && session.taskName === taskInDetails.text),
          )}
          editText={taskEditText}
          setEditText={setTaskEditText}
          editType={taskEditType}
          setEditType={setTaskEditType}
          editFocusMinutes={taskEditFocusMinutes}
          setEditFocusMinutes={setTaskEditFocusMinutes}
          editBreakMinutes={taskEditBreakMinutes}
          setEditBreakMinutes={setTaskEditBreakMinutes}
          isEditing={isEditingTask}
          setIsEditing={setIsEditingTask}
          choosingColor={isChoosingTaskColor}
          setChoosingColor={setIsChoosingTaskColor}
          confirmingDelete={confirmingTaskDelete}
          setConfirmingDelete={setConfirmingTaskDelete}
          onClose={() => setTaskDetailsId(null)}
          onSave={saveTaskEdit}
          onSetColor={setTaskColor}
          onDelete={deleteTask}
          onStart={() => startTask(taskInDetails)}
        />
      )}
    </main>
  );
}

function TaskDetailsDialog({
  task,
  sessions,
  editText,
  setEditText,
  editType,
  setEditType,
  editFocusMinutes,
  setEditFocusMinutes,
  editBreakMinutes,
  setEditBreakMinutes,
  isEditing,
  setIsEditing,
  choosingColor,
  setChoosingColor,
  confirmingDelete,
  setConfirmingDelete,
  onClose,
  onSave,
  onSetColor,
  onDelete,
  onStart,
}: {
  task: FocusTask;
  sessions: FocusSession[];
  editText: string;
  setEditText: Dispatch<SetStateAction<string>>;
  editType: TaskType;
  setEditType: Dispatch<SetStateAction<TaskType>>;
  editFocusMinutes: number;
  setEditFocusMinutes: Dispatch<SetStateAction<number>>;
  editBreakMinutes: number;
  setEditBreakMinutes: Dispatch<SetStateAction<number>>;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  choosingColor: boolean;
  setChoosingColor: Dispatch<SetStateAction<boolean>>;
  confirmingDelete: boolean;
  setConfirmingDelete: Dispatch<SetStateAction<boolean>>;
  onClose: () => void;
  onSave: () => void;
  onSetColor: (color: string) => void;
  onDelete: () => void;
  onStart: () => void;
}) {
  const completedCount = sessions.filter(
    (session) => (session.status ?? "completed") === "completed",
  ).length;
  const abandonedCount = sessions.filter(
    (session) => session.status === "abandoned",
  ).length;
  const color = getTaskColor(task.color);
  return (
    <div className="task-dialog-backdrop" onMouseDown={onClose}>
      <section
        className="task-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={task.text}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          className="task-dialog-header"
          style={{ background: color.background }}
        >
          <div className="task-dialog-title-wrap">
            <span className="central-task-mark" />
            <div>
              <span className="section-kicker">专注任务</span>
              {isEditing ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  aria-label="任务名称"
                />
              ) : (
                <h2>{task.text}</h2>
              )}
            </div>
          </div>
          <button
            className="icon-button"
            aria-label="关闭任务详情"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>
        {isEditing && (
          <div className="task-edit-fields">
            <label className="task-type-field">
              计时方式
              <select
                value={editType}
                onChange={(event) =>
                  setEditType(event.target.value as TaskType)
                }
              >
                <option value="pomodoro">番茄钟 · 倒计时</option>
                <option value="countup">正计时</option>
              </select>
            </label>
            {editType === "pomodoro" && (
              <>
                <label className="task-type-field">
                  专注时长（分钟）
                  <input
                    type="number"
                    min={MIN_TIMER_MINUTES}
                    max={MAX_TIMER_MINUTES}
                    value={editFocusMinutes}
                    onChange={(event) =>
                      setEditFocusMinutes(
                        Math.max(MIN_TIMER_MINUTES, Number(event.target.value)),
                      )
                    }
                  />
                </label>
                <label className="task-type-field">
                  休息时长（分钟）
                  <input
                    type="number"
                    min={MIN_TIMER_MINUTES}
                    max={MAX_TIMER_MINUTES}
                    value={editBreakMinutes}
                    onChange={(event) =>
                      setEditBreakMinutes(
                        Math.max(MIN_TIMER_MINUTES, Number(event.target.value)),
                      )
                    }
                  />
                </label>
              </>
            )}
          </div>
        )}
        <div className="task-detail-metrics">
          <div>
            <strong>{completedCount}</strong>
            <span>专注次数</span>
          </div>
          <div>
            <strong>{formatDuration(task.focusSeconds)}</strong>
            <span>累计时长</span>
          </div>
          <div>
            <strong>{abandonedCount}</strong>
            <span>放弃次数</span>
          </div>
        </div>
        {choosingColor && (
          <div className="task-color-picker" aria-label="选择任务颜色">
            {TASK_COLORS.map((option) => (
              <button
                key={option.id}
                className={
                  getTaskColor(task.color).id === option.id ? "selected" : ""
                }
                style={{
                  background: option.background,
                  borderColor: option.border,
                }}
                aria-label={option.label}
                aria-pressed={getTaskColor(task.color).id === option.id}
                onClick={() => onSetColor(option.id)}
              />
            ))}
          </div>
        )}
        {confirmingDelete ? (
          <div className="task-delete-confirm">
            <span>确定删除“{task.text}”？此操作无法撤销。</span>
            <button onClick={() => setConfirmingDelete(false)}>取消</button>
            <button className="task-delete-button" onClick={onDelete}>
              确认删除
            </button>
          </div>
        ) : (
          <footer className="task-dialog-actions">
            {isEditing ? (
              <>
                <button
                  className="primary-button"
                  disabled={!editText.trim()}
                  onClick={onSave}
                >
                  保存
                </button>
                <button
                  className="text-button"
                  onClick={() => setIsEditing(false)}
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button className="task-dialog-start" onClick={onStart}>
                  <Play size={14} fill="currentColor" />
                  开始专注
                </button>
                <button
                  className="icon-button"
                  aria-label="更换任务颜色"
                  title="更换任务颜色"
                  onClick={() => setChoosingColor((value) => !value)}
                >
                  <Palette size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="编辑任务"
                  title="编辑任务"
                  onClick={() => {
                    setEditText(task.text);
                    setEditType(task.type);
                    setEditFocusMinutes(
                      task.focusMinutes ?? DEFAULT_FOCUS_MINUTES,
                    );
                    setEditBreakMinutes(
                      task.breakMinutes ?? DEFAULT_BREAK_MINUTES,
                    );
                    setIsEditing(true);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="task-delete-button"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}

type TimerViewProps = {
  todos: Todo[];
  selectedTask: FocusTask | null;
  setTodos: Dispatch<SetStateAction<Todo[]>>;
  todoInput: string;
  setTodoInput: Dispatch<SetStateAction<string>>;
  addTodo: () => void;
  notes: Note[];
  noteInput: string;
  setNoteInput: Dispatch<SetStateAction<string>>;
  addNote: () => void;
  expandedNote: number | null;
  setExpandedNote: Dispatch<SetStateAction<number | null>>;
  memoNotes: MemoNote[];
  setMemoNotes: Dispatch<SetStateAction<MemoNote[]>>;
  rightPanelView: RightPanelView;
  setRightPanelView: Dispatch<SetStateAction<RightPanelView>>;
  totalRounds: number;
  doneCount: number;
  renderTaskEntry: () => JSX.Element;
  openTaskDetails: (task: FocusTask) => void;
  isCountup: boolean;
  mode: Mode;
  displayedSeconds: number;
  radius: number;
  circumference: number;
  progress: number;
  isRunning: boolean;
  remaining: number;
  completionMessage: string;
  toggleTimer: () => void;
  abandonTask: () => void;
  sessions: FocusSession[];
  setView: (view: View) => void;
  slogan: string;
  setSlogan: Dispatch<SetStateAction<string>>;
};

function TimerView(props: TimerViewProps) {
  const {
    todos,
    selectedTask,
    setTodos,
    todoInput,
    setTodoInput,
    addTodo,
    notes,
    noteInput,
    setNoteInput,
    addNote,
    expandedNote,
    setExpandedNote,
    memoNotes,
    setMemoNotes,
    rightPanelView,
    setRightPanelView,
    totalRounds,
    doneCount,
    renderTaskEntry,
    openTaskDetails,
    isCountup,
    mode,
    displayedSeconds,
    radius,
    circumference,
    progress,
    isRunning,
    remaining,
    completionMessage,
    toggleTimer,
    abandonTask,
    sessions,
    setView,
    slogan,
    setSlogan,
  } = props;
  const [isEditingSlogan, setIsEditingSlogan] = useState(false);
  const [sloganDraft, setSloganDraft] = useState(slogan);
  const startSloganEdit = () => {
    setSloganDraft(slogan);
    setIsEditingSlogan(true);
  };
  const saveSlogan = () => {
    const trimmedSlogan = sloganDraft.trim();
    if (!trimmedSlogan) return;
    setSlogan(trimmedSlogan);
    setIsEditingSlogan(false);
  };
  return (
    <>
      <section className="workspace">
        <aside className="side-rail">
          <div className="welcome-copy">
            <span className="eyebrow">{dateLabel()}</span>
            {isEditingSlogan ? (
              <div className="slogan-editor">
                <textarea
                  aria-label="编辑首页标语"
                  autoFocus
                  value={sloganDraft}
                  onChange={(event) => setSloganDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setIsEditingSlogan(false);
                  }}
                />
                <div className="slogan-editor-actions">
                  <button className="slogan-save" onClick={saveSlogan}>
                    保存
                  </button>
                  <button onClick={() => setIsEditingSlogan(false)}>
                    取消
                  </button>
                  <button
                    onClick={() => {
                      setSlogan(DEFAULT_SLOGAN);
                      setSloganDraft(DEFAULT_SLOGAN);
                      setIsEditingSlogan(false);
                    }}
                  >
                    恢复默认
                  </button>
                </div>
              </div>
            ) : (
              <h1>
                <button
                  className="slogan-trigger"
                  aria-label="点击编辑首页标语"
                  onClick={startSloganEdit}
                >
                  {slogan.split("\n").map((line, index) => (
                    <span
                      key={`${index}-${line}`}
                      className={index > 0 ? "slogan-accent" : undefined}
                    >
                      {line}
                    </span>
                  ))}
                </button>
              </h1>
            )}
            <p>给今天的自己，留一小段专心的时间。</p>
          </div>
          <div className="daily-summary">
            <div className="summary-head">
              <span>待办进度</span>
              <strong>
                {doneCount}/{todos.length} 事项
              </strong>
            </div>
            <div className="summary-line">
              <span
                style={{
                  width: `${todos.length ? (doneCount / todos.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="summary-foot">
              <span>
                <CheckCircle2 size={14} /> 已完成 {doneCount} 件
              </span>
              <span>{totalRounds} 个番茄</span>
            </div>
          </div>
          <button className="stats-nav" onClick={() => setView("stats")}>
            <BarChart3 size={16} />
            查看专注统计
            <TrendingUp size={14} />
          </button>
          <div className="rail-note">
            <Sparkles size={16} />
            <span>
              专注不是把事情做完，
              <br />
              是把注意力带回来。
            </span>
          </div>
        </aside>
        <div className="main-grid">
          <section
            className={`focus-panel ${selectedTask ? "has-selection" : "no-selection"}`}
          >
            {selectedTask ? (
              <>
                <div className="section-kicker">
                  <span>
                    {isCountup ? <Timer size={15} /> : <Clock3 size={15} />}
                    {isCountup ? "正计时时钟" : "专注时钟"}
                    <button
                      className="active-task-label"
                      onClick={() => openTaskDetails(selectedTask)}
                    >
                      · {selectedTask.text}
                    </button>
                  </span>
                  <span className="live-label">
                    <i />
                    {isRunning
                      ? "正在进行"
                      : !isCountup && remaining === 0
                        ? "本轮完成"
                        : "准备开始"}
                  </span>
                </div>
                <div className={`timer-wrap ${isRunning ? "is-running" : ""}`}>
                  <svg className="timer-ring" viewBox="0 0 300 300">
                    <circle
                      className="ring-track"
                      cx="150"
                      cy="150"
                      r={radius}
                    />
                    <circle
                      className="ring-progress"
                      cx="150"
                      cy="150"
                      r={radius}
                      style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: circumference * (1 - progress),
                      }}
                    />
                  </svg>
                  <div className="timer-content">
                    <span>
                      {isCountup
                        ? "正计时"
                        : mode === "focus"
                          ? "专注中"
                          : "休息中"}
                    </span>
                    <b className="timer-task-name">{selectedTask.text}</b>
                    <strong>{formatTime(displayedSeconds)}</strong>
                    <small>
                      {completionMessage ||
                        (isRunning ? "保持这个节奏" : "准备好就开始")}
                    </small>
                  </div>
                </div>
                <div className="timer-controls">
                  <button
                    className="primary-button"
                    aria-label={isRunning ? "暂停计时" : "开始计时"}
                    onClick={toggleTimer}
                    disabled={!isCountup && remaining === 0}
                  >
                    {isRunning ? (
                      <Pause size={17} />
                    ) : (
                      <Play size={17} fill="currentColor" />
                    )}
                    {isRunning ? "暂停" : remaining === 0 ? "已完成" : "继续"}
                  </button>
                  <button
                    className="secondary-button abandon-button"
                    aria-label="放弃当前任务"
                    onClick={abandonTask}
                  >
                    <X size={16} />
                    放弃
                  </button>
                </div>
                <FocusHistory sessions={sessions} />
              </>
            ) : (
              renderTaskEntry()
            )}
          </section>
          <RightPanel
            todos={todos}
            setTodos={setTodos}
            todoInput={todoInput}
            setTodoInput={setTodoInput}
            addTodo={addTodo}
            memoNotes={memoNotes}
            setMemoNotes={setMemoNotes}
            rightPanelView={rightPanelView}
            setRightPanelView={setRightPanelView}
          />
          <section className="content-panel todo-panel legacy-panel">
            <div className="section-title-row">
              <div>
                <span className="section-kicker">
                  <CheckCircle2 size={15} />
                  普通待办
                </span>
                <h2>把日常留在这里。</h2>
              </div>
            </div>
            <div className="task-list todo-list">
              {todos.map((todo: Todo) => (
                <div
                  className={`task-row ${todo.done ? "is-done" : ""}`}
                  key={todo.id}
                >
                  <button
                    className="check-button"
                    onClick={() =>
                      setTodos((items: Todo[]) =>
                        items.map((item) =>
                          item.id === todo.id
                            ? { ...item, done: !item.done }
                            : item,
                        ),
                      )
                    }
                  >
                    {todo.done && <Check size={14} />}
                  </button>
                  <span className="task-text">{todo.text}</span>
                  <button
                    className="delete-button"
                    onClick={() =>
                      setTodos((items: Todo[]) =>
                        items.filter((item) => item.id !== todo.id),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="add-task todo-add">
              <Plus size={16} />
              <input
                value={todoInput}
                onChange={(event) => setTodoInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addTodo();
                }}
                placeholder="添加一件待办"
              />
            </div>
            <div className="notes-divider">
              <span>快速记录</span>
              <i />
            </div>
            <div className="quick-note">
              <textarea
                value={noteInput}
                onChange={(event) => setNoteInput(event.target.value)}
                placeholder="此刻有什么想法？写下来就好..."
              />
              <button onClick={addNote} disabled={!noteInput.trim()}>
                保存记录
              </button>
            </div>
            {notes.slice(0, 2).map((note: Note) => (
              <button
                className="note-preview"
                key={note.id}
                onClick={() =>
                  setExpandedNote(expandedNote === note.id ? null : note.id)
                }
              >
                <span>{note.createdAt}</span>
                <b>{note.text}</b>
              </button>
            ))}
          </section>
        </div>
      </section>
      <footer className="app-footer">
        <span>
          <span className="footer-dot" />
          今天也要照顾好自己
        </span>
        <span>
          MomoFocus <b>·</b> 让专注有一点温度
        </span>
      </footer>
    </>
  );
}

function RightPanel({
  todos,
  setTodos,
  todoInput,
  setTodoInput,
  addTodo,
  memoNotes,
  setMemoNotes,
  rightPanelView,
  setRightPanelView,
}: {
  todos: Todo[];
  setTodos: Dispatch<SetStateAction<Todo[]>>;
  todoInput: string;
  setTodoInput: Dispatch<SetStateAction<string>>;
  addTodo: () => void;
  memoNotes: MemoNote[];
  setMemoNotes: Dispatch<SetStateAction<MemoNote[]>>;
  rightPanelView: RightPanelView;
  setRightPanelView: Dispatch<SetStateAction<RightPanelView>>;
}) {
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [thoughtInput, setThoughtInput] = useState("");
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(
    memoNotes[0]?.id ?? null,
  );
  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId) ?? null;
  const selectedMemo =
    memoNotes.find((note) => note.id === selectedMemoId) ?? null;

  useEffect(() => {
    if (
      selectedMemoId !== null &&
      memoNotes.some((note) => note.id === selectedMemoId)
    )
      return;
    setSelectedMemoId(memoNotes[0]?.id ?? null);
  }, [memoNotes, selectedMemoId]);

  useEffect(() => {
    if (
      selectedTodoId !== null &&
      todos.some((todo) => todo.id === selectedTodoId)
    )
      return;
    setSelectedTodoId(todos[0]?.id ?? null);
  }, [selectedTodoId, todos]);

  const createMemo = () => {
    const now = new Date().toISOString();
    const newMemo = {
      id: nextId(),
      title: "新备忘录",
      body: "",
      createdAt: now,
      updatedAt: now,
    };
    setMemoNotes((items) => [newMemo, ...items]);
    setSelectedMemoId(newMemo.id);
    setRightPanelView("notes");
  };
  const updateMemo = (field: "title" | "body", value: string) => {
    if (!selectedMemo) return;
    setMemoNotes((items) =>
      items.map((note) =>
        note.id === selectedMemo.id
          ? { ...note, [field]: value, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  };
  const deleteMemo = () => {
    if (!selectedMemo) return;
    const index = memoNotes.findIndex((note) => note.id === selectedMemo.id);
    const nextMemo = memoNotes[index + 1] ?? memoNotes[index - 1] ?? null;
    setMemoNotes((items) =>
      items.filter((note) => note.id !== selectedMemo.id),
    );
    setSelectedMemoId(nextMemo?.id ?? null);
  };
  const noteTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const today = new Date();
    if (date.toDateString() === today.toDateString())
      return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    return date.toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
    });
  };
  const selectTodo = (todo: Todo) => {
    setSelectedTodoId(todo.id);
    setThoughtInput("");
  };
  const addTodoThought = () => {
    const text = thoughtInput.trim();
    if (!selectedTodo || !text) return;
    const thought = {
      id: nextId(),
      text,
      createdAt: new Date().toISOString(),
    };
    setTodos((items) =>
      items.map((todo) =>
        todo.id === selectedTodo.id
          ? { ...todo, thoughts: [thought, ...(todo.thoughts ?? [])] }
          : todo,
      ),
    );
    setThoughtInput("");
  };

  return (
    <section className="content-panel right-panel">
      <div className="view-tabs" role="tablist" aria-label="右侧工作区">
        <button
          role="tab"
          aria-selected={rightPanelView === "todo"}
          className={rightPanelView === "todo" ? "active" : ""}
          onClick={() => setRightPanelView("todo")}
        >
          <CheckCircle2 size={15} />
          Todo<span className="task-count">{todos.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={rightPanelView === "notes"}
          className={rightPanelView === "notes" ? "active" : ""}
          onClick={() => setRightPanelView("notes")}
        >
          <FileText size={15} />
          备忘录<span className="task-count">{memoNotes.length}</span>
        </button>
      </div>
      {rightPanelView === "todo" ? (
        <>
          <div className="section-title-row">
            <div>
              <span className="section-kicker">
                <CheckCircle2 size={15} />
                普通待办
              </span>
              <h2>把日常留在这里。</h2>
            </div>
          </div>
          <div className="task-list todo-list">
            {todos.map((todo) => (
              <div
                className={`task-row todo-row ${todo.done ? "is-done" : ""} ${selectedTodoId === todo.id ? "is-selected" : ""}`}
                key={todo.id}
                role="button"
                tabIndex={0}
                onClick={() => selectTodo(todo)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectTodo(todo);
                  }
                }}
              >
                <button
                  className="check-button"
                  aria-label={
                    todo.done ? `标记${todo.text}为未完成` : `完成${todo.text}`
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    setTodos((items) =>
                      items.map((item) =>
                        item.id === todo.id
                          ? { ...item, done: !item.done }
                          : item,
                      ),
                    );
                  }}
                >
                  {todo.done && <Check size={14} />}
                </button>
                <span className="task-text">
                  {todo.text}
                  <small>{(todo.thoughts ?? []).length} 条想法</small>
                </span>
                <button
                  className="delete-button"
                  aria-label={`删除${todo.text}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setTodos((items) =>
                      items.filter((item) => item.id !== todo.id),
                    );
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-task todo-add">
            <Plus size={16} />
            <input
              value={todoInput}
              onChange={(event) => setTodoInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addTodo();
              }}
              placeholder="添加一件待办"
              aria-label="添加一件待办"
            />
          </div>
          <div className="notes-divider">
            <span>
              {selectedTodo ? `${selectedTodo.text} 的想法` : "Todo 想法"}
            </span>
            <i />
          </div>
          <div className="quick-note todo-thought-editor">
            <textarea
              value={thoughtInput}
              onChange={(event) => setThoughtInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter")
                  addTodoThought();
              }}
              placeholder={
                selectedTodo ? "记录这个 Todo 的想法..." : "先点击一个 Todo"
              }
              aria-label="Todo 想法"
              disabled={!selectedTodo}
            />
            <button
              onClick={addTodoThought}
              disabled={!selectedTodo || !thoughtInput.trim()}
            >
              保存想法
            </button>
          </div>
          <div className="todo-thought-list">
            {(selectedTodo?.thoughts ?? []).map((thought) => (
              <div className="todo-thought" key={thought.id}>
                <p>{thought.text}</p>
                <time>{noteTime(thought.createdAt)}</time>
              </div>
            ))}
            {selectedTodo && (selectedTodo.thoughts ?? []).length === 0 && (
              <p className="empty-thoughts">还没有想法，写下第一条吧。</p>
            )}
          </div>
        </>
      ) : (
        <div className="memo-panel">
          <div className="memo-heading">
            <div>
              <span className="section-kicker">
                <FileText size={15} />
                我的备忘录
              </span>
              <h2>把想法留在这里。</h2>
            </div>
            <button
              className="memo-new-button"
              onClick={createMemo}
              aria-label="新建备忘录"
            >
              <Plus size={16} />
              新建
            </button>
          </div>
          <div className="memo-list" role="listbox" aria-label="备忘录列表">
            {memoNotes.map((note) => (
              <button
                key={note.id}
                role="option"
                aria-selected={selectedMemoId === note.id}
                className={`memo-list-item ${selectedMemoId === note.id ? "active" : ""}`}
                onClick={() => setSelectedMemoId(note.id)}
              >
                <strong>{note.title || "无标题"}</strong>
                <span>{note.body || "暂无内容"}</span>
                <time>{noteTime(note.updatedAt)}</time>
              </button>
            ))}
          </div>
          {selectedMemo ? (
            <div className="memo-editor">
              <div className="memo-editor-toolbar">
                <span>自动保存</span>
                <button
                  className="delete-button"
                  onClick={deleteMemo}
                  aria-label="删除当前备忘录"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <input
                className="memo-title-input"
                value={selectedMemo.title}
                onChange={(event) => updateMemo("title", event.target.value)}
                placeholder="标题"
                aria-label="备忘录标题"
              />
              <textarea
                className="memo-body-input"
                value={selectedMemo.body}
                onChange={(event) => updateMemo("body", event.target.value)}
                placeholder="开始记录..."
                aria-label="备忘录正文"
              />
            </div>
          ) : (
            <div className="memo-empty">
              <FileText size={28} />
              <strong>还没有备忘录</strong>
              <span>记录一个想法，让它有地方安放。</span>
              <button className="primary-button" onClick={createMemo}>
                <Plus size={16} />
                新建备忘录
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function FocusHistory({ sessions }: { sessions: FocusSession[] }) {
  return (
    <div className="focus-history">
      <div className="history-heading">
        <span>
          <BarChart3 size={14} />
          专注历史
        </span>
        <small>{sessions.length} 次记录</small>
      </div>
      {sessions.length === 0 ? (
        <p className="empty-history">完成一次专注后，记录会出现在这里。</p>
      ) : (
        sessions.slice(0, 3).map((session) => (
          <div className="session-list" key={session.id}>
            <div>
              <i className="session-dot" />
              <b>{session.taskName}</b>
              <span>{formatDuration(session.seconds)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function StatsView({ sessions }: { sessions: FocusSession[] }) {
  const today = new Date();
  const todayKey = dateKey(today);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [distributionFilter, setDistributionFilter] = useState<Filter>("month");
  const [distributionStart, setDistributionStart] = useState(todayKey);
  const [distributionEnd, setDistributionEnd] = useState(todayKey);
  const [cumulativeStart, setCumulativeStart] = useState(monthStart);
  const distributionRange = useMemo(() => {
    if (distributionFilter === "custom") {
      return { start: distributionStart, end: distributionEnd };
    }
    if (distributionFilter === "day") return { start: todayKey, end: todayKey };
    if (distributionFilter === "week") {
      return { start: dateKey(startOfWeek(today)), end: todayKey };
    }
    return { start: monthStart, end: todayKey };
  }, [
    distributionFilter,
    distributionStart,
    distributionEnd,
    todayKey,
    monthStart,
  ]);
  const distributionValid = Boolean(
    distributionRange.start &&
    distributionRange.end &&
    distributionRange.start <= distributionRange.end,
  );
  const distributionSessions = distributionValid
    ? sessions.filter(
        (s) =>
          (s.date ?? todayKey) >= distributionRange.start &&
          (s.date ?? todayKey) <= distributionRange.end,
      )
    : [];
  const cumulativeValid = Boolean(
    cumulativeStart && cumulativeStart <= todayKey,
  );
  const cumulativeSessions = cumulativeValid
    ? sessions.filter(
        (s) =>
          (s.date ?? todayKey) >= cumulativeStart &&
          (s.date ?? todayKey) <= todayKey,
      )
    : [];
  const todaySessions = sessions.filter(
    (s) => (s.date ?? todayKey) === todayKey,
  );
  const completedCumulative = cumulativeSessions.filter(
    (s) => (s.status ?? "completed") === "completed",
  );
  const cumulativeSeconds = cumulativeSessions.reduce(
    (sum, s) => sum + s.seconds,
    0,
  );
  const todayCompleted = todaySessions.filter(
    (s) => (s.status ?? "completed") === "completed",
  );
  const todaySeconds = todaySessions.reduce((sum, s) => sum + s.seconds, 0);
  const todayAbandoned = todaySessions.filter(
    (s) => s.status === "abandoned",
  ).length;
  const taskDurations = Array.from(
    distributionSessions
      .reduce((groups, session) => {
        const taskKey =
          session.taskId !== undefined
            ? `id:${session.taskId}`
            : `name:${session.taskName}`;
        const current = groups.get(taskKey);
        groups.set(taskKey, {
          name: current?.name || session.taskName || "未命名任务",
          seconds: (current?.seconds ?? 0) + session.seconds,
        });
        return groups;
      }, new Map<string, { name: string; seconds: number }>())
      .values(),
  ).sort((a, b) => b.seconds - a.seconds);
  const taskTotal = taskDurations.reduce((sum, task) => sum + task.seconds, 0);
  const chartColors = [
    "#e75c49",
    "#e7a25c",
    "#88bda9",
    "#766d9c",
    "#5f8fa8",
    "#c77d8a",
  ];
  let angle = 0;
  const gradient = taskTotal
    ? taskDurations
        .map((task, i) => {
          const start = angle;
          angle += (task.seconds / taskTotal) * 360;
          return `${chartColors[i % chartColors.length]} ${start}deg ${angle}deg`;
        })
        .join(", ")
    : "#e5e0d4 0deg 360deg";
  const cumulativeDays = cumulativeValid
    ? Math.max(
        1,
        Math.round(
          (new Date(todayKey).getTime() - new Date(cumulativeStart).getTime()) /
            86400000,
        ) + 1,
      )
    : 1;
  const cumulativeAverage = Math.round(cumulativeSeconds / cumulativeDays);
  const slots = Array.from({ length: 5 }, (_, i) =>
    distributionSessions
      .filter((s) => {
        const hour = s.startedAt ? new Date(s.startedAt).getHours() : 9;
        if (i === 4) return hour >= 22 || hour < 2;
        return hour >= [6, 10, 14, 18, 22][i] && hour < [10, 14, 18, 22, 24][i];
      })
      .reduce((sum, s) => sum + s.seconds, 0),
  );
  const maxSlot = Math.max(...slots, 1);
  return (
    <section className="stats-page">
      <div className="stats-heading">
        <div>
          <span className="eyebrow">FOCUS INSIGHTS · 专注洞察</span>
          <h1>
            看见你的专注
            <br />
            <em>如何发生。</em>
          </h1>
        </div>
        <div className="stats-heading-note">
          <Target size={18} />
          <span>
            每一次开始，
            <br />
            都算数。
          </span>
        </div>
      </div>
      <section className="stat-card distribution-card">
        <div className="distribution-toolbar">
          <div className="card-heading">
            <div>
              <span className="section-kicker">
                <Clock3 size={15} />
                专注时段分布
              </span>
              <h2>你通常在什么时候进入状态？</h2>
            </div>
            <small>{distributionSessions.length} 条记录</small>
          </div>
          <div className="filter-bar">
            <div className="filter-tabs">
              {(
                [
                  ["day", "今日"],
                  ["week", "本周"],
                  ["month", "本月"],
                  ["custom", "自定义"],
                ] as [Filter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={distributionFilter === key ? "active" : ""}
                  onClick={() => setDistributionFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {distributionFilter === "custom" && (
              <div className="date-fields">
                <label>
                  从
                  <input
                    type="date"
                    value={distributionStart}
                    onChange={(e) => setDistributionStart(e.target.value)}
                  />
                </label>
                <span>—</span>
                <label>
                  至
                  <input
                    type="date"
                    value={distributionEnd}
                    onChange={(e) => setDistributionEnd(e.target.value)}
                  />
                </label>
              </div>
            )}
            {distributionFilter === "custom" && !distributionValid && (
              <span className="range-error">请选择有效的日期范围</span>
            )}
            <span className="range-label">
              <CalendarDays size={14} />
              {distributionRange.start === distributionRange.end
                ? distributionRange.start
                : `${distributionRange.start} — ${distributionRange.end}`}
            </span>
          </div>
        </div>
        <div className="time-chart">
          {slots.map((value, i) => (
            <div className="time-column" key={i}>
              <div className="bar-track">
                <span
                  style={{
                    height: `${value ? Math.max((value / maxSlot) * 100, 4) : 0}%`,
                  }}
                />
              </div>
              <b>{["06—10", "10—14", "14—18", "18—22", "22—02"][i]}</b>
              <small>{value ? formatDuration(value) : "暂无"}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="summary-columns">
        <section className="stat-card average-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">
                <TrendingUp size={15} />
                累计专注
              </span>
              <h2>从哪一天开始统计？</h2>
            </div>
          </div>
          <label className="cumulative-date">
            <CalendarDays size={14} />
            <span>开始日期</span>
            <input
              type="date"
              max={todayKey}
              value={cumulativeStart}
              onChange={(e) => setCumulativeStart(e.target.value)}
            />
          </label>
          {!cumulativeValid && (
            <span className="range-error">请选择今天或更早的日期</span>
          )}
          <div className="summary-stats">
            <div className="big-stat">
              <strong>
                {cumulativeValid ? completedCumulative.length : 0}
              </strong>
              <span>总次数</span>
            </div>
            <div className="big-stat">
              <strong>
                {cumulativeValid ? formatDuration(cumulativeSeconds) : "0 分钟"}
              </strong>
              <span>总时长</span>
            </div>
            <div className="big-stat">
              <strong>
                {cumulativeValid ? formatDuration(cumulativeAverage) : "0 分钟"}
              </strong>
              <span>日均时长</span>
            </div>
          </div>
        </section>
        <section className="stat-card today-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">
                <Target size={15} />
                今日专注
              </span>
              <h2>{todayKey}</h2>
            </div>
          </div>
          <div className="summary-stats">
            <div className="big-stat">
              <strong>{todayCompleted.length}</strong>
              <span>今日次数</span>
            </div>
            <div className="big-stat">
              <strong>{formatDuration(todaySeconds)}</strong>
              <span>今日时长</span>
            </div>
            <div className="big-stat">
              <strong>{todayAbandoned}</strong>
              <span>放弃次数</span>
            </div>
          </div>
        </section>
      </div>
      <section className="stats-columns">
        <section className="stat-card distribution-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">
                <Clock3 size={15} />
                时长分布
              </span>
              <h2>不同任务各占多少？</h2>
            </div>
            <small>{taskDurations.length} 个任务</small>
          </div>
          {distributionSessions.length === 0 ? (
            <EmptyStats />
          ) : (
            <div className="donut-layout">
              <div
                className="donut"
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <div>
                  <strong>
                    {formatDuration(
                      distributionSessions.reduce(
                        (sum, s) => sum + s.seconds,
                        0,
                      ),
                    )}
                  </strong>
                  <span>总专注</span>
                </div>
              </div>
              <div className="legend">
                {taskDurations.map((task, i) => (
                  <div key={`${task.name}-${i}`}>
                    <i
                      style={{
                        background: chartColors[i % chartColors.length],
                      }}
                    />
                    <span title={task.name}>{task.name}</span>
                    <small>{formatDuration(task.seconds)}</small>
                    <b>
                      {taskTotal
                        ? Math.round((task.seconds / taskTotal) * 100)
                        : 0}
                      %
                    </b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>
    </section>
  );
}
function EmptyStats() {
  return (
    <div className="stats-empty">
      <span>○</span>
      <b>这里还没有专注记录</b>
      <small>完成一次专注后，你会在这里看见自己的节奏。</small>
    </div>
  );
}
export default App;
