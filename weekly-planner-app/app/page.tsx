"use client";

import { useEffect, useMemo, useState } from "react";

type Priority = "high" | "medium" | "normal";
type Category = "General" | "Work" | "Study" | "Health" | "Personal" | "Errand";

type Habit = {
  id: string;
  name: string;
  days: boolean[];
};

type Task = {
  id: string;
  label: string;
  done: boolean;
  priority?: Priority;
  category?: Category;
};

type DayPlan = {
  name: string;
  date: string;
  tasks: Task[];
};

type WeekData = {
  weekStart: string;
  habits: Habit[];
  days: DayPlan[];
};

type AppState = {
  weeks: Record<string, WeekData>;
};

type DayStat = {
  taskDone: number;
  taskTotal: number;
  habitDone: number;
  habitTotal: number;
  done: number;
  total: number;
};

const STORAGE_KEY = "weekly-planner-game-v2";
const LEGACY_STORAGE_KEY = "weekly-planner-game-v1";
const XP_PER_TASK = 10;
const XP_PER_HABIT = 5;
const XP_PER_LEVEL = 500;
const DAILY_GOAL = 80;
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const categories: Category[] = ["General", "Work", "Study", "Health", "Personal", "Errand"];

const starterHabits = [
  "Wake up at 6:30",
  "Drink 2L of water",
  "Cold shower",
  "Gym",
  "Reading 10 pages",
  "Budget tracking",
  "Studying",
  "Meditation",
  "No vape",
];

const starterTasks = [
  ["Morning routine", "Deep work session", "Reply to messages", "Workout", "Read 10 pages", "Plan tomorrow", "Track expenses", "Sleep on time"],
  ["Morning routine", "Project work", "Grocery shopping", "Study session", "Call family", "Read 10 pages", "Journal", "Sleep on time"],
  ["Morning routine", "Finish priority task", "Lunch meeting", "Gym", "Review weekly goals", "Read 10 pages", "Track expenses", "Prepare tomorrow"],
  ["Morning routine", "Grocery shopping", "Study for exam", "Meet up with friends", "Create an IG story", "Research side hustle", "Read 10 pages", "Sleep on time"],
  ["Yoga session", "Coffee with grandparents", "Weekly summary review", "Meet up with friends", "Create an IG story", "Research side hustle", "Budget tracking", "Read 10 pages"],
  ["Do something fun", "Grocery shopping", "Weekly reflections", "Meet up with friends", "Create an IG story", "Research side hustle", "Prepare workout plan", "Read 10 pages"],
  ["Learn something new", "Bike trip", "Laundry", "Meet up with friends", "Create an IG story", "Research side hustle", "Plan next week", "Prepare for Monday"],
];

function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function percent(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonday(date: Date) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function weekKeyFromDate(date: Date) {
  return toISODate(startOfMonday(date));
}

function formatDayDate(iso: string) {
  const d = fromISODate(iso);
  return `${`${d.getDate()}`.padStart(2, "0")}.${`${d.getMonth() + 1}`.padStart(2, "0")}.${d.getFullYear()}`;
}

function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(fromISODate(iso));
}

function formatWeekRange(weekStart: string) {
  const start = fromISODate(weekStart);
  const end = addDays(start, 6);
  const month = new Intl.DateTimeFormat("en", { month: "short" });
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${month.format(start)} ${start.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${month.format(start)} – ${end.getDate()} ${month.format(end)} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${month.format(start)} ${start.getFullYear()} – ${end.getDate()} ${month.format(end)} ${end.getFullYear()}`;
}

function getISOWeekNumber(iso: string) {
  const date = fromISODate(iso);
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function blankWeek(weekStart: string, habitNames: string[] = starterHabits): WeekData {
  const start = fromISODate(weekStart);
  return {
    weekStart,
    habits: habitNames.map((name) => ({ id: uid("habit"), name, days: Array(7).fill(false) })),
    days: dayNames.map((name, index) => ({
      name,
      date: toISODate(addDays(start, index)),
      tasks: [],
    })),
  };
}

function guessCategory(label: string): Category {
  const text = label.toLowerCase();
  if (/study|read|learn|exam|project|deep work|review/.test(text)) return "Study";
  if (/gym|workout|yoga|bike|sleep/.test(text)) return "Health";
  if (/grocery|laundry|expense|budget/.test(text)) return "Errand";
  if (/message|meeting|ig story|side hustle/.test(text)) return "Work";
  if (/family|friends|grandparents|fun|journal/.test(text)) return "Personal";
  return "General";
}

function demoWeek(weekStart: string): WeekData {
  const week = blankWeek(weekStart);
  const habitPattern = [7, 7, 4, 3, 5, 6, 7, 5, 7];
  week.habits = week.habits.map((habit, habitIndex) => ({
    ...habit,
    days: habit.days.map((_, dayIndex) => dayIndex < habitPattern[habitIndex]),
  }));
  const taskDoneCounts = [8, 7, 8, 6, 5, 3, 1];
  week.days = week.days.map((day, dayIndex) => ({
    ...day,
    tasks: starterTasks[dayIndex].map((label, taskIndex) => ({
      id: uid("task"),
      label,
      done: taskIndex < taskDoneCounts[dayIndex],
      priority: taskIndex === 0 ? "high" : taskIndex < 3 ? "medium" : "normal",
      category: guessCategory(label),
    })),
  }));
  return week;
}

function getWeekStats(week: WeekData): { dayStats: DayStat[]; done: number; total: number; pct: number } {
  const dayStats = week.days.map((day, dayIndex) => {
    const taskDone = day.tasks.filter((task) => task.done).length;
    const taskTotal = day.tasks.length;
    const habitDone = week.habits.filter((habit) => habit.days[dayIndex]).length;
    const habitTotal = week.habits.length;
    return {
      taskDone,
      taskTotal,
      habitDone,
      habitTotal,
      done: taskDone + habitDone,
      total: taskTotal + habitTotal,
    };
  });
  const done = dayStats.reduce((sum, stat) => sum + stat.done, 0);
  const total = dayStats.reduce((sum, stat) => sum + stat.total, 0);
  return { dayStats, done, total, pct: percent(done, total) };
}

function Donut({ value, size = 126 }: { value: number; size?: number }) {
  const stroke = Math.max(10, Math.round(size * 0.16));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="donutTrack" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="donutValue"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>{value}%</span>
    </div>
  );
}

export default function Home() {
  const initialWeekKey = weekKeyFromDate(new Date());
  const [app, setApp] = useState<AppState>({ weeks: { [initialWeekKey]: demoWeek(initialWeekKey) } });
  const [currentWeekKey, setCurrentWeekKey] = useState(initialWeekKey);
  const [selectedDay, setSelectedDay] = useState(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  });
  const [quickTask, setQuickTask] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        if (parsed?.weeks && Object.keys(parsed.weeks).length) {
          setApp(parsed);
          if (!parsed.weeks[initialWeekKey]) {
            const recentKey = Object.keys(parsed.weeks).sort().at(-1) ?? initialWeekKey;
            const habits = parsed.weeks[recentKey]?.habits.map((habit) => habit.name) ?? starterHabits;
            setApp((prev) => ({ ...prev, weeks: { ...prev.weeks, [initialWeekKey]: blankWeek(initialWeekKey, habits) } }));
          }
          setCurrentWeekKey(initialWeekKey);
        }
      } else {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) setNotice("Your previous local planner is untouched; this upgraded version uses a new history-safe data format.");
      }
    } catch {
      setNotice("Local data could not be loaded, so the demo week is being used.");
    }
    setLoaded(true);
  }, [initialWeekKey]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  }, [app, loaded]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const savedWeek = app.weeks[currentWeekKey];
    const todayIndex = savedWeek?.days.findIndex((day) => day.date === toISODate(new Date())) ?? -1;
    setSelectedDay(todayIndex >= 0 ? todayIndex : 0);
    setQuickTask("");
  }, [currentWeekKey]);

  const week = app.weeks[currentWeekKey] ?? blankWeek(currentWeekKey);
  const currentStats = useMemo(() => getWeekStats(week), [week]);
  const { dayStats, done: overallDone, total: overallTotal, pct: overallPct } = currentStats;
  const selectedPlan = week.days[selectedDay] ?? week.days[0];
  const selectedStat = dayStats[selectedDay] ?? dayStats[0];
  const selectedPct = selectedStat ? percent(selectedStat.done, selectedStat.total) : 0;
  const selectedTaskPct = selectedStat ? percent(selectedStat.taskDone, selectedStat.taskTotal) : 0;

  const allTime = useMemo(() => {
    let taskDone = 0;
    let habitDone = 0;
    const successfulDates: string[] = [];

    Object.values(app.weeks).forEach((savedWeek) => {
      const stats = getWeekStats(savedWeek);
      stats.dayStats.forEach((stat, index) => {
        taskDone += stat.taskDone;
        habitDone += stat.habitDone;
        if (stat.total > 0 && percent(stat.done, stat.total) >= DAILY_GOAL) successfulDates.push(savedWeek.days[index].date);
      });
    });

    const xp = taskDone * XP_PER_TASK + habitDone * XP_PER_HABIT;
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const levelXp = xp % XP_PER_LEVEL;

    const ordered = [...new Set(successfulDates)].sort();
    let bestStreak = 0;
    let running = 0;
    let previous: Date | null = null;
    ordered.forEach((iso) => {
      const current = fromISODate(iso);
      if (previous && Math.round((current.getTime() - previous.getTime()) / 86400000) === 1) running += 1;
      else running = 1;
      bestStreak = Math.max(bestStreak, running);
      previous = current;
    });

    const successful = new Set(ordered);
    let cursor = fromISODate(toISODate(new Date()));
    if (!successful.has(toISODate(cursor))) cursor = addDays(cursor, -1);
    let currentStreak = 0;
    while (successful.has(toISODate(cursor))) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }

    return { xp, level, levelXp, bestStreak, currentStreak, completed: taskDone + habitDone };
  }, [app.weeks]);

  const history = useMemo(
    () => Object.keys(app.weeks).sort().reverse().map((key) => ({ key, ...getWeekStats(app.weeks[key]) })),
    [app.weeks]
  );

  const weekInsight = useMemo(() => {
    const pcts = dayStats.map((stat) => percent(stat.done, stat.total));
    const strongestIndex = pcts.reduce((best, value, index) => value > pcts[best] ? index : best, 0);
    const weakestIndex = pcts.reduce((worst, value, index) => value < pcts[worst] ? index : worst, 0);
    const missedHabit = week.habits
      .map((habit) => ({ name: habit.name, missed: habit.days.filter((done) => !done).length }))
      .sort((a, b) => b.missed - a.missed)[0];
    const taskDone = dayStats.reduce((sum, stat) => sum + stat.taskDone, 0);
    const taskTotal = dayStats.reduce((sum, stat) => sum + stat.taskTotal, 0);
    const previousKey = toISODate(addDays(fromISODate(currentWeekKey), -7));
    const previousWeek = app.weeks[previousKey];
    const previousPct = previousWeek ? getWeekStats(previousWeek).pct : null;
    return {
      strongestIndex,
      weakestIndex,
      missedHabit,
      taskDone,
      taskTotal,
      previousPct,
      delta: previousPct === null ? null : overallPct - previousPct,
    };
  }, [app.weeks, currentWeekKey, dayStats, overallPct, week.habits]);

  const upcoming = useMemo(() => {
    const rows: { day: string; date: string; task: Task }[] = [];
    for (let dayIndex = selectedDay + 1; dayIndex < week.days.length; dayIndex += 1) {
      for (const task of week.days[dayIndex].tasks) {
        if (!task.done) rows.push({ day: dayShort[dayIndex], date: week.days[dayIndex].date, task });
        if (rows.length >= 4) return rows;
      }
    }
    return rows;
  }, [selectedDay, week.days]);

  function updateCurrentWeek(updater: (previous: WeekData) => WeekData) {
    setApp((prev) => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [currentWeekKey]: updater(prev.weeks[currentWeekKey] ?? blankWeek(currentWeekKey)),
      },
    }));
  }

  function ensureAndOpenWeek(nextKey: string) {
    setApp((prev) => {
      if (prev.weeks[nextKey]) return prev;
      const currentHabitNames = (prev.weeks[currentWeekKey]?.habits ?? []).map((habit) => habit.name);
      return {
        ...prev,
        weeks: {
          ...prev.weeks,
          [nextKey]: blankWeek(nextKey, currentHabitNames.length ? currentHabitNames : starterHabits),
        },
      };
    });
    setCurrentWeekKey(nextKey);
  }

  function moveWeek(offset: number) {
    ensureAndOpenWeek(toISODate(addDays(fromISODate(currentWeekKey), offset * 7)));
  }

  function goToday() {
    ensureAndOpenWeek(weekKeyFromDate(new Date()));
  }

  function toggleTask(dayIndex: number, taskId: string) {
    updateCurrentWeek((prev) => ({
      ...prev,
      days: prev.days.map((day, index) => index === dayIndex
        ? { ...day, tasks: day.tasks.map((task) => task.id === taskId ? { ...task, done: !task.done } : task) }
        : day),
    }));
  }

  function updateTask(dayIndex: number, taskId: string, changes: Partial<Pick<Task, "label" | "priority" | "category">>) {
    updateCurrentWeek((prev) => ({
      ...prev,
      days: prev.days.map((day, index) => index === dayIndex
        ? { ...day, tasks: day.tasks.map((task) => task.id === taskId ? { ...task, ...changes } : task) }
        : day),
    }));
  }

  function addTask(dayIndex: number, label = "New task") {
    const cleanLabel = label.trim() || "New task";
    updateCurrentWeek((prev) => ({
      ...prev,
      days: prev.days.map((day, index) => index === dayIndex
        ? { ...day, tasks: [...day.tasks, { id: uid("task"), label: cleanLabel, done: false, priority: "normal", category: guessCategory(cleanLabel) }] }
        : day),
    }));
  }

  function submitQuickTask() {
    if (!quickTask.trim()) return;
    addTask(selectedDay, quickTask);
    setQuickTask("");
  }

  function deleteTask(dayIndex: number, taskId: string) {
    updateCurrentWeek((prev) => ({
      ...prev,
      days: prev.days.map((day, index) => index === dayIndex
        ? { ...day, tasks: day.tasks.filter((task) => task.id !== taskId) }
        : day),
    }));
  }

  function toggleHabit(habitId: string, dayIndex: number) {
    updateCurrentWeek((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) => habit.id === habitId
        ? { ...habit, days: habit.days.map((checked, index) => index === dayIndex ? !checked : checked) }
        : habit),
    }));
  }

  function renameHabit(habitId: string, name: string) {
    updateCurrentWeek((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) => habit.id === habitId ? { ...habit, name } : habit),
    }));
  }

  function addHabit() {
    updateCurrentWeek((prev) => ({
      ...prev,
      habits: [...prev.habits, { id: uid("habit"), name: "New habit", days: Array(7).fill(false) }],
    }));
  }

  function deleteHabit(habitId: string) {
    updateCurrentWeek((prev) => ({ ...prev, habits: prev.habits.filter((habit) => habit.id !== habitId) }));
  }

  function resetCurrentWeek() {
    if (!confirm("Reset only this week to a blank week? Your other saved weeks will stay intact.")) return;
    const habitNames = week.habits.map((habit) => habit.name);
    setApp((prev) => ({
      ...prev,
      weeks: { ...prev.weeks, [currentWeekKey]: blankWeek(currentWeekKey, habitNames) },
    }));
  }

  function loadDemoWeek() {
    if (!confirm("Replace this week with demo data? Your other saved weeks will stay intact.")) return;
    setApp((prev) => ({ ...prev, weeks: { ...prev.weeks, [currentWeekKey]: demoWeek(currentWeekKey) } }));
  }

  return (
    <main className="pageShell">
      <header className="topbar">
        <div className="brandBlock">
          <h1>Weekly Planner</h1>
          <p>Turn your goals into a game.</p>
        </div>

        <div className="gameStats" aria-label="Gamification stats">
          <div className="statChip"><span>Level</span><b>{allTime.level}</b></div>
          <div className="statChip wideChip">
            <span>XP · {allTime.levelXp}/{XP_PER_LEVEL} to next level</span>
            <b>{allTime.xp.toLocaleString()}</b>
            <i><em style={{ width: `${percent(allTime.levelXp, XP_PER_LEVEL)}%` }} /></i>
          </div>
          <div className="statChip streakChip"><span>Goal streak</span><b>{allTime.currentStreak}d <small>best {allTime.bestStreak}d</small></b></div>
        </div>

        <div className="topActions">
          <button className="ghostBtn" onClick={() => setHistoryOpen(true)}>History</button>
          <button className="ghostBtn" onClick={loadDemoWeek}>Demo</button>
          <button className="resetBtn" onClick={resetCurrentWeek}>Reset week</button>
        </div>
      </header>

      <section className="weekToolbar" aria-label="Week navigation">
        <button className="navBtn" onClick={() => moveWeek(-1)} aria-label="Previous week">←</button>
        <div className="weekIdentity">
          <span>WEEK {getISOWeekNumber(currentWeekKey)}</span>
          <strong>{formatWeekRange(currentWeekKey)}</strong>
        </div>
        <button className="todayBtn" onClick={goToday}>Today</button>
        <button className="navBtn" onClick={() => moveWeek(1)} aria-label="Next week">→</button>
      </section>

      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}

      <section className="sheet">
        <div className="dashboardRow">
          <div className="overallPanel">
            <div className="sectionTitle">Overall Progress</div>
            <div className="overallBody">
              <div className="chartWrap">
                <div className="chartGrid">
                  {[20, 16, 12, 8, 4, 0].map((n) => <span key={n}>{n}</span>)}
                </div>
                <div className="bars">
                  {dayStats.map((stat, index) => {
                    const max = Math.max(20, ...dayStats.map((x) => x.total));
                    const doneHeight = stat.total ? Math.max(2, (stat.done / max) * 100) : 0;
                    const totalHeight = stat.total ? Math.max(doneHeight, (stat.total / max) * 100) : 0;
                    return (
                      <button
                        className={`barCol ${selectedDay === index ? "selected" : ""}`}
                        key={dayShort[index]}
                        title={`${stat.done}/${stat.total} completed · open ${dayNames[index]}`}
                        onClick={() => setSelectedDay(index)}
                      >
                        <div className="barTrack">
                          <div className="barTotal" style={{ height: `${totalHeight}%` }} />
                          <div className="barDone" style={{ height: `${doneHeight}%` }} />
                        </div>
                        <strong>{dayShort[index]}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="overallDonut">
                <Donut value={overallPct} size={170} />
                <div className="completedText">{overallDone} / {overallTotal} completed</div>
                <small>{allTime.completed.toLocaleString()} all-time completions</small>
              </div>
            </div>
          </div>

          <div className="habitPanel">
            <div className="sectionTitle titleWithAction">
              <span>Habit tracker</span>
              <button onClick={addHabit}>+ habit</button>
            </div>
            <div className="habitScroll">
              <div className="habitHeader habitGrid">
                <span>Habit</span>
                {dayShort.map((day) => <span key={day}>{day}</span>)}
                <span>Progress</span>
                <span aria-hidden="true" />
              </div>
              <div className="habitRows">
                {week.habits.length === 0 && <div className="emptyState">No habits yet. Add your first habit above.</div>}
                {week.habits.map((habit) => {
                  const completed = habit.days.filter(Boolean).length;
                  const pct = percent(completed, 7);
                  return (
                    <div className="habitGrid habitRow" key={habit.id}>
                      <input className="inlineText habitName" value={habit.name} onChange={(e) => renameHabit(habit.id, e.target.value)} aria-label="Habit name" />
                      {habit.days.map((checked, index) => (
                        <label className="tinyCheck" key={index} title={`${habit.name} on ${dayNames[index]}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleHabit(habit.id, index)} />
                          <span />
                        </label>
                      ))}
                      <div className="progressCell">
                        <div className="progressBar"><i style={{ width: `${pct}%` }} /></div>
                        <b>{pct}%</b>
                      </div>
                      <button className="deleteRowBtn" onClick={() => deleteHabit(habit.id)} title="Delete habit" aria-label={`Delete ${habit.name}`}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <section className="focusSection">
          <div className="sectionTitle">Daily Workspace</div>

          <nav className="dayTabs" aria-label="Choose day">
            {week.days.map((day, index) => {
              const stat = dayStats[index];
              const pct = percent(stat.done, stat.total);
              const isToday = day.date === toISODate(new Date());
              return (
                <button
                  key={day.date}
                  className={`dayTab ${selectedDay === index ? "active" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => setSelectedDay(index)}
                >
                  <span>{dayShort[index]}{isToday ? " · TODAY" : ""}</span>
                  <b>{fromISODate(day.date).getDate()}</b>
                  <i>{pct}%</i>
                </button>
              );
            })}
          </nav>

          <div className="workspaceGrid">
            <article className="dailyWorkspace">
              <header className="dailyHero">
                <div className="dailyIdentity">
                  <span>SELECTED DAY</span>
                  <h2>{formatLongDate(selectedPlan.date)}</h2>
                  <p>{selectedStat.taskDone} of {selectedStat.taskTotal} tasks complete · {selectedStat.habitDone} of {selectedStat.habitTotal} habits complete</p>
                </div>
                <div className="dailyScore">
                  <Donut value={selectedPct} size={142} />
                  <div>
                    <b>{selectedPct >= DAILY_GOAL ? "Daily goal reached" : `${DAILY_GOAL - selectedPct}% to daily goal`}</b>
                    <span>{selectedPct}% incl. habits · {selectedTaskPct}% tasks</span>
                  </div>
                </div>
              </header>

              <div className="taskWorkspaceTitle">
                <div>
                  <span>TODAY&apos;S TASKS</span>
                  <b>{selectedStat.taskDone} done · {Math.max(0, selectedStat.taskTotal - selectedStat.taskDone)} left</b>
                </div>
                <button onClick={() => addTask(selectedDay)}>+ Add blank task</button>
              </div>

              <div className="focusedTaskList">
                {selectedPlan.tasks.length === 0 && (
                  <div className="focusedEmpty">
                    <b>No tasks scheduled.</b>
                    <span>Add your first task below.</span>
                  </div>
                )}
                {selectedPlan.tasks.map((task) => (
                  <div className={`focusedTaskRow ${task.done ? "complete" : ""}`} key={task.id}>
                    <label className="bigCheck" title={task.done ? "Mark incomplete" : "Mark complete"}>
                      <input type="checkbox" checked={task.done} onChange={() => toggleTask(selectedDay, task.id)} />
                      <span />
                    </label>
                    <input
                      className="focusedTaskInput"
                      value={task.label}
                      onChange={(e) => updateTask(selectedDay, task.id, { label: e.target.value })}
                      aria-label="Task name"
                    />
                    <select
                      className="taskMetaSelect"
                      value={task.category ?? "General"}
                      onChange={(e) => updateTask(selectedDay, task.id, { category: e.target.value as Category })}
                      aria-label="Task category"
                    >
                      {categories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                    <select
                      className={`taskMetaSelect priority-${task.priority ?? "normal"}`}
                      value={task.priority ?? "normal"}
                      onChange={(e) => updateTask(selectedDay, task.id, { priority: e.target.value as Priority })}
                      aria-label="Task priority"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="normal">Normal</option>
                    </select>
                    <button className="focusedDelete" onClick={() => deleteTask(selectedDay, task.id)} title="Delete task" aria-label={`Delete ${task.label}`}>×</button>
                  </div>
                ))}
              </div>

              <div className="quickAdd">
                <input
                  value={quickTask}
                  onChange={(e) => setQuickTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitQuickTask(); }}
                  placeholder={`Add a task to ${selectedPlan.name} and press Enter...`}
                  aria-label="Quick add task"
                />
                <button onClick={submitQuickTask}>Add task</button>
              </div>
            </article>

            <aside className="insightRail">
              <section className="insightCard goalCard">
                <div className="insightLabel">DAILY GOAL</div>
                <div className="goalValue"><strong>{selectedPct}%</strong><span>target {DAILY_GOAL}%</span></div>
                <div className="goalTrack"><i style={{ width: `${Math.min(100, (selectedPct / DAILY_GOAL) * 100)}%` }} /></div>
                <p>{selectedPct >= DAILY_GOAL ? "Goal cleared for this day." : `${Math.max(0, selectedStat.total - selectedStat.done)} completions still available today.`}</p>
              </section>

              <section className="insightCard">
                <div className="insightLabel">GAME PROGRESS</div>
                <div className="miniMetricGrid">
                  <div><span>Level</span><b>{allTime.level}</b></div>
                  <div><span>Current streak</span><b>{allTime.currentStreak}d</b></div>
                  <div><span>XP to next</span><b>{XP_PER_LEVEL - allTime.levelXp}</b></div>
                  <div><span>Best streak</span><b>{allTime.bestStreak}d</b></div>
                </div>
              </section>

              <section className="insightCard">
                <div className="insightLabel">UPCOMING</div>
                <div className="upcomingList">
                  {upcoming.length === 0 && <p className="railEmpty">No unfinished tasks after {selectedPlan.name}.</p>}
                  {upcoming.map((item) => (
                    <button key={`${item.date}-${item.task.id}`} onClick={() => setSelectedDay(week.days.findIndex((day) => day.date === item.date))}>
                      <span>{item.day}</span>
                      <b>{item.task.label}</b>
                    </button>
                  ))}
                </div>
              </section>

              <section className="insightCard">
                <div className="insightLabel">WEEK INSIGHT</div>
                <dl className="insightList">
                  <div><dt>Strongest day</dt><dd>{dayNames[weekInsight.strongestIndex]} · {percent(dayStats[weekInsight.strongestIndex].done, dayStats[weekInsight.strongestIndex].total)}%</dd></div>
                  <div><dt>Needs attention</dt><dd>{dayNames[weekInsight.weakestIndex]} · {percent(dayStats[weekInsight.weakestIndex].done, dayStats[weekInsight.weakestIndex].total)}%</dd></div>
                  <div><dt>Most missed habit</dt><dd>{weekInsight.missedHabit?.name ?? "None"}</dd></div>
                  <div><dt>Tasks</dt><dd>{weekInsight.taskDone}/{weekInsight.taskTotal} done</dd></div>
                  <div>
                    <dt>Vs previous week</dt>
                    <dd>{weekInsight.delta === null ? "No data yet" : `${weekInsight.delta > 0 ? "+" : ""}${weekInsight.delta}%`}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </section>
      </section>

      <div className="footerLine">
        <p>Changes save automatically in this browser.</p>
        <p>Daily goal = {DAILY_GOAL}% · Task = +{XP_PER_TASK} XP · Habit = +{XP_PER_HABIT} XP</p>
      </div>

      {historyOpen && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setHistoryOpen(false)}>
          <section className="historyModal" role="dialog" aria-modal="true" aria-labelledby="history-title" onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div>
                <span>SAVED WEEKS</span>
                <h2 id="history-title">Planner history</h2>
              </div>
              <button onClick={() => setHistoryOpen(false)} aria-label="Close history">×</button>
            </header>
            <div className="historyList">
              {history.map((item) => (
                <button
                  className={`historyItem ${item.key === currentWeekKey ? "selected" : ""}`}
                  key={item.key}
                  onClick={() => { setCurrentWeekKey(item.key); setHistoryOpen(false); }}
                >
                  <div>
                    <b>Week {getISOWeekNumber(item.key)}</b>
                    <span>{formatWeekRange(item.key)}</span>
                  </div>
                  <div className="historyProgress">
                    <div><i style={{ width: `${item.pct}%` }} /></div>
                    <strong>{item.pct}%</strong>
                    <span>{item.done}/{item.total}</span>
                  </div>
                </button>
              ))}
            </div>
            <footer>Opening a new week automatically adds it to your local history.</footer>
          </section>
        </div>
      )}
    </main>
  );
}
