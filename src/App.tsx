import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coffee,
  Settings,
  Leaf,
  Menu,
  Minus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sparkles,
  SquarePen,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

type Mode = 'focus' | 'short' | 'long';
type Task = { id: number; text: string; pomodoros: number; done: boolean };
type Note = { id: number; text: string; createdAt: string };

const MODES: Record<Mode, { label: string; minutes: number; icon: typeof Clock3 }> = {
  focus: { label: '专注', minutes: 25, icon: Clock3 },
  short: { label: '短休息', minutes: 5, icon: Coffee },
  long: { label: '长休息', minutes: 15, icon: Leaf },
};

const initialTasks: Task[] = [
  { id: 1, text: '整理本周项目思路', pomodoros: 2, done: false },
  { id: 2, text: '回复重要邮件', pomodoros: 1, done: false },
  { id: 3, text: '读完产品设计章节', pomodoros: 3, done: true },
];

const initialNotes: Note[] = [
  { id: 1, text: '今天的节奏很好，下午留一点时间做收尾。', createdAt: '今天 09:42' },
];

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function App() {
  const [mode, setMode] = useState<Mode>('focus');
  const [remaining, setRemaining] = useState(MODES.focus.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(4);
  const [soundOn, setSoundOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSoundTip, setShowSoundTip] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState(initialTasks);
  const [noteInput, setNoteInput] = useState('');
  const [notes, setNotes] = useState(initialNotes);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [celebratingTask, setCelebratingTask] = useState<number | null>(null);
  const endAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const taskFeedbackRef = useRef<number | null>(null);

  const totalSeconds = MODES[mode].minutes * 60;
  const progress = 1 - remaining / totalSeconds;
  const radius = 136;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  const updateTimer = useCallback(() => {
    if (!endAtRef.current) return;
    const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setRemaining(next);
    if (next === 0) {
      setIsRunning(false);
      endAtRef.current = null;
      setCompleted((value) => (mode === 'focus' ? value + 1 : value));
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [mode]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      if (endAtRef.current) setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
      endAtRef.current = null;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    endAtRef.current = Date.now() + remaining * 1000;
    setIsRunning(true);
    updateTimer();
    timerRef.current = window.setInterval(updateTimer, 250);
  };

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setRemaining(MODES[nextMode].minutes * 60);
    setIsRunning(false);
    endAtRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const resetTimer = () => {
    setRemaining(totalSeconds);
    setIsRunning(false);
    endAtRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const skipTimer = () => changeMode(mode === 'focus' ? 'short' : 'focus');

  const addTask = () => {
    const text = taskInput.trim();
    if (!text) return;
    setTasks((items) => [...items, { id: Date.now(), text, pomodoros: 0, done: false }]);
    setTaskInput('');
  };

  const toggleTask = (id: number) => {
    setTasks((items) => items.map((task) => task.id === id ? { ...task, done: !task.done } : task));
    setCelebratingTask(id);
    if (taskFeedbackRef.current) window.clearTimeout(taskFeedbackRef.current);
    taskFeedbackRef.current = window.setTimeout(() => setCelebratingTask(null), 650);
  };

  const addNote = () => {
    const text = noteInput.trim();
    if (!text) return;
    setNotes((items) => [{ id: Date.now(), text, createdAt: '刚刚' }, ...items]);
    setNoteInput('');
  };

  const doneCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const ModeIcon = MODES[mode].icon;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div><strong>MomoFocus</strong><span>番茄小窝</span></div>
        </div>
        <div className="top-actions">
          <div className="today-state"><span className="status-dot" />今日专注 <b>{completed} 次</b></div>
          <div className="action-wrap">
            <button className={`icon-button ${soundOn ? '' : 'is-muted'}`} aria-label={soundOn ? '关闭声音' : '打开声音'} title="声音" onClick={() => { setSoundOn((value) => !value); setShowSoundTip(true); }}>
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            {showSoundTip && <div className="mini-popover sound-popover"><span>{soundOn ? '提示音已开启' : '提示音已关闭'}</span><button onClick={() => setShowSoundTip(false)} aria-label="关闭提示"><X size={14} /></button></div>}
          </div>
          <div className="action-wrap">
            <button className="icon-button" aria-label="打开设置" title="设置" onClick={() => setShowSettings((value) => !value)}><Settings size={18} /></button>
            {showSettings && <div className="mini-popover settings-popover"><span>专注偏好</span><button className="setting-row" onClick={() => setShowSettings(false)}>自动开始下一轮 <span className="switch on" /></button><button className="setting-row" onClick={() => setShowSettings(false)}>完成后播放声音 <span className={`switch ${soundOn ? 'on' : ''}`} /></button></div>}
          </div>
          <button className="mobile-menu" aria-label="打开菜单" title="菜单"><Menu size={20} /></button>
        </div>
      </header>

      <section className="workspace">
        <aside className="side-rail">
          <div className="welcome-copy"><span className="eyebrow">SUNDAY · 09月20日</span><h1>慢一点，<br /><em>也很好。</em></h1><p>给今天的自己，留一小段专心的时间。</p></div>
          <div className="daily-summary"><div className="summary-head"><span>今日进度</span><strong>{doneCount}/{tasks.length} 事项</strong></div><div className="summary-line"><span style={{ width: `${tasks.length ? doneCount / tasks.length * 100 : 0}%` }} /></div><div className="summary-foot"><span><CheckCircle2 size={14} /> 已完成 {doneCount} 件</span><span>{completed} 个番茄</span></div></div>
          <div className="rail-note"><Sparkles size={16} /><span>专注不是把事情做完，<br />是把注意力带回来。</span></div>
        </aside>

        <div className="main-grid">
          <section className="focus-panel" aria-label="专注计时器">
            <div className="section-kicker"><span><ModeIcon size={15} />专注时钟</span><span className="live-label"><i />{isRunning ? '正在进行' : remaining === 0 ? '本轮完成' : '准备开始'}</span></div>
            <div className="mode-tabs" role="tablist" aria-label="计时模式">
              {(Object.keys(MODES) as Mode[]).map((key) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => changeMode(key)} role="tab" aria-selected={mode === key}>{MODES[key].label}<span>{MODES[key].minutes} min</span></button>)}
            </div>
            <div className={`timer-wrap ${isRunning ? 'is-running' : ''} ${remaining === 0 ? 'is-complete' : ''}`}>
              <svg className="timer-ring" viewBox="0 0 300 300" aria-label={`${MODES[mode].label}剩余 ${formatTime(remaining)}`} role="img"><circle className="ring-track" cx="150" cy="150" r={radius} /><circle className="ring-progress" cx="150" cy="150" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: strokeOffset }} /></svg>
              <div className="timer-content"><span>{remaining === 0 ? '完成啦' : MODES[mode].label}</span><strong>{formatTime(remaining)}</strong><small>{isRunning ? '保持这个节奏' : '准备好就开始'}</small></div>
            </div>
            <div className="timer-controls"><button className="primary-button" onClick={toggleTimer}>{isRunning ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}{isRunning ? '暂停' : remaining < totalSeconds ? '继续' : '开始专注'}</button><button className="secondary-button" onClick={resetTimer}><RotateCcw size={16} />重置</button><button className="secondary-button skip-button" onClick={skipTimer}><SkipForward size={16} />跳过</button></div>
            <p className="timer-hint"><span>25</span> 分钟一轮 <i /> 每轮专注后记得休息一下</p>
          </section>

          <section className="notes-panel" aria-label="今日备忘录">
            <div className="section-title-row"><div><span className="section-kicker"><SquarePen size={15} />今日备忘录</span><h2>把脑海里的事，放在这里。</h2></div><button className="more-button" aria-label="更多备忘录操作" title="更多操作"><MoreHorizontal size={20} /></button></div>
            <div className="task-list">{tasks.map((task) => <div className={`task-row ${task.done ? 'is-done' : ''} ${celebratingTask === task.id ? 'just-toggled' : ''}`} key={task.id}><button className="check-button" aria-label={task.done ? `取消完成 ${task.text}` : `完成 ${task.text}`} onClick={() => toggleTask(task.id)}>{task.done && <Check size={14} strokeWidth={3} />}</button><span className="task-text">{task.text}</span><span className="tomato-count">{task.pomodoros > 0 && <><Clock3 size={13} />{task.pomodoros}</>}</span><button className="delete-button" aria-label={`删除 ${task.text}`} title="删除" onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))}><Trash2 size={15} /></button></div>)}</div>
            <div className="add-task"><Plus size={17} /><input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTask(); }} placeholder="添加一件小事，按回车确认" aria-label="添加今日事项" /></div>
            <div className="notes-divider"><span>快速记录</span><i /></div>
            <div className="quick-note"><textarea value={noteInput} onChange={(event) => setNoteInput(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') addNote(); }} placeholder="此刻有什么想法？写下来就好..." aria-label="快速记录" /><div className="note-toolbar"><span>Ctrl / ⌘ + Enter 保存</span><button onClick={addNote} disabled={!noteInput.trim()}>保存记录 <ChevronDown size={14} /></button></div></div>
            {notes.length > 0 && <div className="recent-notes"><div className="recent-heading"><span>最近笔记</span><span>{notes.length} 条</span></div>{notes.slice(0, 2).map((note) => <button className={`note-preview ${expandedNote === note.id ? 'expanded' : ''}`} key={note.id} onClick={() => setExpandedNote((value) => value === note.id ? null : note.id)}><span className="note-pin"><Minus size={14} /></span><span className="note-body"><b>{note.text}</b>{expandedNote === note.id && <small>记录于 {note.createdAt} · 点击收起</small>}</span><time>{note.createdAt}</time></button>)}</div>}
          </section>
        </div>
      </section>
      <footer className="app-footer"><span><span className="footer-dot" />今天也要照顾好自己</span><span>MomoFocus <b>·</b> 让专注有一点温度</span></footer>
    </main>
  );
}

export default App;
