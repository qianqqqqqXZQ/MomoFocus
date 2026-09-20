import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Check, CheckCircle2, ChevronDown, Clock3, Coffee, Leaf, Menu, Pause, Play, Plus, RotateCcw, SkipForward, Sparkles, Timer, Trash2, Volume2, VolumeX, X } from 'lucide-react';

type Mode = 'focus' | 'short' | 'long';
type TaskType = 'pomodoro' | 'countup';
type FocusTask = { id: number; text: string; rounds: number; focusSeconds: number; done: boolean; type: TaskType };
type Todo = { id: number; text: string; done: boolean };
type Note = { id: number; text: string; createdAt: string };
type FocusSession = { id: number; taskName: string; seconds: number; rounds: number };
const MODES: Record<Mode, { label: string; minutes: number; icon: typeof Clock3 }> = { focus: { label: '专注', minutes: 25, icon: Clock3 }, short: { label: '短休息', minutes: 5, icon: Coffee }, long: { label: '长休息', minutes: 15, icon: Leaf } };
const initialNotes: Note[] = [{ id: 1, text: '今天的节奏很好，下午留一点时间做收尾。', createdAt: '今天 09:42' }];
const initialTodos: Todo[] = [{ id: 1, text: '整理今天的优先事项', done: false }, { id: 2, text: '给自己留一段安静时间', done: false }];
const formatTime = (seconds: number) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;
const formatDuration = (seconds: number) => { const minutes = Math.floor(seconds / 60); return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`; };

function App() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [taskTypeInput, setTaskTypeInput] = useState<TaskType>('pomodoro');
  const [todoInput, setTodoInput] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [mode, setMode] = useState<Mode>('focus');
  const [remaining, setRemaining] = useState(MODES.focus.minutes * 60);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [notes, setNotes] = useState(initialNotes);
  const [noteInput, setNoteInput] = useState('');
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showSoundTip, setShowSoundTip] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const isCountup = selectedTask?.type === 'countup';
  const totalSeconds = MODES[mode].minutes * 60;
  const displayedSeconds = isCountup ? elapsed : remaining;
  const progress = isCountup ? (elapsed % totalSeconds) / totalSeconds : 1 - remaining / totalSeconds;
  const radius = 136;
  const circumference = 2 * Math.PI * radius;
  const totalRounds = useMemo(() => tasks.reduce((total, task) => total + task.rounds, 0), [tasks]);
  const doneCount = useMemo(() => todos.filter((todo) => todo.done).length, [todos]);

  const stopTimer = useCallback(() => { if (timerRef.current) window.clearInterval(timerRef.current); timerRef.current = null; }, []);
  const recordFocus = useCallback((completedRound = false, countdownRemaining?: number) => {
    if (!selectedTask || !startedAtRef.current) return;
    const liveRemaining = countdownRemaining ?? Math.max(0, startValueRef.current - Math.ceil((Date.now() - startedAtRef.current) / 1000));
    const seconds = isCountup ? Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)) : Math.max(0, startValueRef.current - liveRemaining);
    if (seconds <= 0) return;
    if (mode === 'focus' || isCountup) {
      setTasks((items) => items.map((task) => task.id === selectedTask.id ? { ...task, focusSeconds: task.focusSeconds + seconds, rounds: task.rounds + (completedRound && task.type === 'pomodoro' && mode === 'focus' ? 1 : 0) } : task));
      setSessions((items) => [{ id: Date.now(), taskName: selectedTask.text, seconds, rounds: completedRound ? 1 : 0 }, ...items]);
    }
    startedAtRef.current = null;
  }, [isCountup, mode, selectedTask]);
  const updateTimer = useCallback(() => {
    if (!startedAtRef.current) return;
    if (isCountup) { setElapsed(startValueRef.current + Math.floor((Date.now() - startedAtRef.current) / 1000)); return; }
    const next = Math.max(0, Math.ceil((startedAtRef.current + startValueRef.current * 1000 - Date.now()) / 1000));
    setRemaining(next);
    if (next === 0) { recordFocus(true, 0); setIsRunning(false); stopTimer(); }
  }, [isCountup, recordFocus, stopTimer]);
  useEffect(() => () => stopTimer(), [stopTimer]);

  const toggleTimer = () => { if (isRunning) { updateTimer(); recordFocus(); setIsRunning(false); stopTimer(); return; } startedAtRef.current = Date.now(); startValueRef.current = isCountup ? elapsed : remaining; setIsRunning(true); timerRef.current = window.setInterval(updateTimer, 250); };
  const resetTimer = () => { if (isRunning) recordFocus(); stopTimer(); setIsRunning(false); setRemaining(totalSeconds); setElapsed(0); startedAtRef.current = null; };
  const changeMode = (next: Mode) => { if (isRunning) recordFocus(); stopTimer(); setIsRunning(false); setMode(next); setRemaining(MODES[next].minutes * 60); setElapsed(0); startedAtRef.current = null; };
  const selectTask = (task: FocusTask) => { if (isRunning) recordFocus(); stopTimer(); setIsRunning(false); setSelectedTaskId(task.id); setRemaining(MODES[mode].minutes * 60); setElapsed(0); startedAtRef.current = null; };
  const addTask = () => { const text = taskInput.trim(); if (!text) return; setTasks((items) => [...items, { id: Date.now(), text, rounds: 0, focusSeconds: 0, done: false, type: taskTypeInput }]); setTaskInput(''); setIsCreatingTask(false); };
  const deleteTask = (id: number) => { setTasks((items) => items.filter((task) => task.id !== id)); if (selectedTaskId === id) setSelectedTaskId(null); };
  const addTodo = () => { const text = todoInput.trim(); if (!text) return; setTodos((items) => [...items, { id: Date.now(), text, done: false }]); setTodoInput(''); };
  const addNote = () => { const text = noteInput.trim(); if (!text) return; setNotes((items) => [{ id: Date.now(), text, createdAt: '刚刚' }, ...items]); setNoteInput(''); };

  const renderTaskEntry = () => <div className="central-task-state">{tasks.length === 0 ? <><span className="empty-kicker">专注工作区</span><h2>先从一件事开始，<br /><em>把注意力放回来。</em></h2><p>创建一个专注任务，再选择适合你的计时方式。</p></> : <><span className="empty-kicker">专注任务</span><h2>准备好开始<br /><em>下一件事了吗？</em></h2><div className="central-task-list">{tasks.map((task) => <button className="central-task-row" key={task.id} onClick={() => selectTask(task)}><span className="central-task-mark" /><span><b>{task.text}</b><small>{task.type === 'countup' ? '正计时' : '番茄钟'} · {formatDuration(task.focusSeconds)}</small></span><ChevronDown size={15} /></button>)}</div></>}<div className={`new-task-form ${isCreatingTask ? 'is-open' : ''}`}>{isCreatingTask ? <><div className="new-task-fields"><input autoFocus value={taskInput} onChange={(event) => setTaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTask(); }} placeholder="任务名称" aria-label="任务名称" /><select value={taskTypeInput} onChange={(event) => setTaskTypeInput(event.target.value as TaskType)} aria-label="计时类型"><option value="pomodoro">番茄钟 · 25 分钟</option><option value="countup">正计时 · 自由记录</option></select></div><div className="new-task-actions"><button className="primary-button" onClick={addTask} disabled={!taskInput.trim()}><Plus size={16} />创建专注任务</button><button className="text-button" onClick={() => { setIsCreatingTask(false); setTaskInput(''); }}>取消</button></div></> : <button className="new-task-button" onClick={() => setIsCreatingTask(true)}><Plus size={18} />新建专注任务</button>}</div>{sessions.length > 0 && <FocusHistory sessions={sessions} />}</div>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><span /></div><div><strong>MomoFocus</strong><span>番茄小窝</span></div></div><div className="top-actions"><div className="today-state"><span className="status-dot" />今日专注 <b>{totalRounds} 次</b></div><button className={`icon-button ${soundOn ? '' : 'is-muted'}`} aria-label="切换声音" title="声音" onClick={() => { setSoundOn((value) => !value); setShowSoundTip(true); }}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>{showSoundTip && <div className="mini-popover sound-popover"><span>{soundOn ? '提示音已开启' : '提示音已关闭'}</span><button onClick={() => setShowSoundTip(false)} aria-label="关闭提示"><X size={14} /></button></div>}<button className="mobile-menu" aria-label="打开菜单"><Menu size={20} /></button></div></header>
    <section className="workspace"><aside className="side-rail"><div className="welcome-copy"><span className="eyebrow">SUNDAY · 09月20日</span><h1>慢一点，<br /><em>也很好。</em></h1><p>给今天的自己，留一小段专心的时间。</p></div><div className="daily-summary"><div className="summary-head"><span>待办进度</span><strong>{doneCount}/{todos.length} 事项</strong></div><div className="summary-line"><span style={{ width: `${todos.length ? doneCount / todos.length * 100 : 0}%` }} /></div><div className="summary-foot"><span><CheckCircle2 size={14} /> 已完成 {doneCount} 件</span><span>{totalRounds} 个番茄</span></div></div><div className="rail-note"><Sparkles size={16} /><span>专注不是把事情做完，<br />是把注意力带回来。</span></div></aside>
      <div className="main-grid"><section className={`focus-panel ${selectedTask ? 'has-selection' : 'no-selection'}`} aria-label={selectedTask ? '专注计时器' : '专注任务入口'}>{selectedTask ? <><div className="section-kicker"><span>{isCountup ? <Timer size={15} /> : <Clock3 size={15} />}{isCountup ? '正计时时钟' : '专注时钟'}<b className="active-task-label">· {selectedTask.text}</b></span><span className="live-label"><i />{isRunning ? '正在进行' : !isCountup && remaining === 0 ? '本轮完成' : '准备开始'}</span></div>{!isCountup && <div className="mode-tabs" role="tablist">{(Object.keys(MODES) as Mode[]).map((key) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => changeMode(key)}>{MODES[key].label}<span>{MODES[key].minutes} min</span></button>)}</div>}<div className={`timer-wrap ${isRunning ? 'is-running' : ''} ${!isCountup && remaining === 0 ? 'is-complete' : ''}`}><svg className="timer-ring" viewBox="0 0 300 300" role="img" aria-label={`计时 ${formatTime(displayedSeconds)}`}><circle className="ring-track" cx="150" cy="150" r={radius} /><circle className="ring-progress" cx="150" cy="150" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - progress) }} /></svg><div className="timer-content"><span>{!isCountup && remaining === 0 ? '完成啦' : isCountup ? '已专注' : MODES[mode].label}</span><strong>{formatTime(displayedSeconds)}</strong><small>{isRunning ? '保持这个节奏' : '准备好就开始'}</small></div></div><div className="timer-controls"><button className="primary-button" onClick={toggleTimer}>{isRunning ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}{isRunning ? '暂停' : '开始专注'}</button><button className="secondary-button" onClick={resetTimer}><RotateCcw size={16} />重置</button>{!isCountup && <button className="secondary-button" onClick={() => changeMode(mode === 'focus' ? 'short' : 'focus')}><SkipForward size={16} />跳过</button>}</div><FocusHistory sessions={sessions} /></> : renderTaskEntry()}</section>
        <section className="content-panel todo-panel" aria-label="普通待办"><div className="section-title-row"><div><span className="section-kicker"><CheckCircle2 size={15} />普通待办</span><h2>把日常留在这里。</h2></div><span className="task-count">{todos.length} 件</span></div><div className="task-list todo-list">{todos.map((todo) => <div className={`task-row ${todo.done ? 'is-done' : ''}`} key={todo.id}><button className="check-button" aria-label="切换完成状态" onClick={() => setTodos((items) => items.map((item) => item.id === todo.id ? { ...item, done: !item.done } : item))}>{todo.done && <Check size={14} />}</button><span className="task-text">{todo.text}</span><button className="delete-button" onClick={() => setTodos((items) => items.filter((item) => item.id !== todo.id))} aria-label={`删除 ${todo.text}`}><Trash2 size={15} /></button></div>)}</div><div className="add-task todo-add"><Plus size={16} /><input value={todoInput} onChange={(event) => setTodoInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTodo(); }} placeholder="添加一件待办" aria-label="添加待办" /></div><div className="notes-divider"><span>快速记录</span><i /></div><div className="quick-note"><textarea value={noteInput} onChange={(event) => setNoteInput(event.target.value)} placeholder="此刻有什么想法？写下来就好..." aria-label="快速记录" /><button onClick={addNote} disabled={!noteInput.trim()}>保存记录</button></div>{notes.slice(0, 2).map((note) => <button className="note-preview" key={note.id} onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}><span>{note.createdAt}</span><b>{note.text}</b>{expandedNote === note.id && <em>记录已展开</em>}</button>)}</section></div>
    </section><footer className="app-footer"><span><span className="footer-dot" />今天也要照顾好自己</span><span>MomoFocus <b>·</b> 让专注有一点温度</span></footer>
  </main>;
}

function FocusHistory({ sessions }: { sessions: FocusSession[] }) { return <div className="focus-history"><div className="history-heading"><span><BarChart3 size={14} />专注历史</span><small>{sessions.length} 次记录</small></div>{sessions.length === 0 ? <p className="empty-history">完成一次专注后，记录会出现在这里。</p> : sessions.slice(0, 3).map((session) => <div className="session-list" key={session.id}><div><i className="session-dot" /><b>{session.taskName}</b><span>{formatDuration(session.seconds)}{session.rounds ? ` · ${session.rounds} 轮` : ''}</span></div></div>)}</div>; }
export default App;
