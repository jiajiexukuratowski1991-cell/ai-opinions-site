import { useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TOPIC_RULES = [
  { key: '执行闭环', match: ['闭环', '执行', '工作流', '自动化', '可交付', 'Operator'], blurb: '关注 AI 是否从表达层走向结果交付层。' },
  { key: 'Agent 现实世界', match: ['现实世界', '地点', '验证', '校验', '营业', '数据基础设施'], blurb: '关注 Agent 在真实环境中的可执行性与校验层。' },
  { key: '反泡沫', match: ['复杂', 'Token', '框架', '安全', '审计', '权限'], blurb: '警惕表演式 Agent 与高成本低闭环方案。' },
  { key: '基础设施经营', match: ['基础设施', 'GPU', '调度', '持续在线', '经营', '运维'], blurb: '从资源堆砌转向资源经营与连续可用。' },
]

function scoreColor(score) {
  if (score >= 8) return 'score-high'
  if (score >= 5) return 'score-mid'
  return 'score-low'
}

function truncate(text, len = 180) {
  if (!text) return ''
  return text.length > len ? `${text.slice(0, len)}…` : text
}

function classifyTopic(item) {
  const blob = [item.title, item.summary, item.judgment, item.view].filter(Boolean).join(' ')
  for (const rule of TOPIC_RULES) {
    if (rule.match.some((w) => blob.includes(w))) return rule.key
  }
  return '其他判断'
}

function slugify(text = '') {
  return text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

function setHash(path) {
  window.location.hash = path
}

function parseHash() {
  const hash = window.location.hash || '#/'
  const clean = hash.replace(/^#/, '') || '/'
  const parts = clean.split('/').filter(Boolean)
  if (parts[0] === 'opinion' && parts[1]) return { type: 'opinion', id: parts[1] }
  if (parts[0] === 'calendar') return { type: 'calendar' }
  return { type: 'home' }
}

function DetailView({ item, onBack }) {
  if (!item) return null
  return (
    <article className="detail-page detail-layout">
      <div className="detail-topbar">
        <button className="ghost-btn" onClick={onBack}>返回列表</button>
        <div className="detail-top-actions">
          {item.url ? <a className="ghost-btn" href={item.url} target="_blank" rel="noreferrer">查看原文</a> : null}
        </div>
      </div>

      <header className="detail-hero">
        <div className="section-kicker">观点详情</div>
        <h1>{item.title}</h1>
        {item.summary ? <p className="detail-deck">{item.summary}</p> : null}
      </header>

      <div className="detail-columns">
        <main className="detail-main">
          {item.judgment && (
            <section className="detail-section detail-highlight">
              <h3>核心判断</h3>
              <p>{item.judgment}</p>
            </section>
          )}
          {item.view && (
            <section className="detail-section">
              <h3>我的观点</h3>
              <p>{item.view}</p>
            </section>
          )}
          {item.excerpt && (
            <section className="detail-section detail-muted-block">
              <h3>原文摘要</h3>
              <p>{item.excerpt}</p>
            </section>
          )}
        </main>

        <aside className="detail-side">
          <div className="detail-side-card">
            <div className="detail-meta-item"><span>主题</span><strong>{item.topic}</strong></div>
            <div className="detail-meta-item"><span>分类</span><strong>{item.category || '未分类'}</strong></div>
            <div className="detail-meta-item"><span>来源</span><strong>{item.source || 'unknown'}</strong></div>
            <div className="detail-meta-item"><span>机会级别</span><strong>{item.opportunity || 'watch'}</strong></div>
            <div className="detail-meta-item"><span>总分</span><strong>{item.totalScore ?? 0}</strong></div>
            <div className="detail-meta-item"><span>发布时间</span><strong>{item.publishTime || '未知'}</strong></div>
          </div>
        </aside>
      </div>
    </article>
  )
}

function OpinionCard({ item, onOpen }) {
  return (
    <article className="card" onClick={() => onOpen(item)}>
      <div className="card-top">
        <span className={`score-badge ${scoreColor(item.totalScore)}`}>Score {item.totalScore ?? 0}</span>
        <span className="chip">{item.opportunity || 'watch'}</span>
        <span className="chip topic-chip">{item.topic}</span>
      </div>
      <h3>{item.title}</h3>
      <p className="summary">{truncate(item.summary || item.judgment || item.view, 150)}</p>
      <p className="judgment">{truncate(item.judgment || item.view, 150)}</p>
      <div className="card-foot"><span>{item.source || 'unknown'}</span><span>{item.category || '未分类'}</span></div>
    </article>
  )
}

function ArticleRow({ item }) {
  return (
    <a className="article-row" href={item.url || '#'} target={item.url ? '_blank' : undefined} rel="noreferrer">
      <div className="article-main">
        <h3>{item.title}</h3>
        <p>{truncate(item.excerpt || item.summary || item.judgment, 120) || '暂无摘要'}</p>
      </div>
      <div className="article-meta">
        <span>{item.source || 'unknown'}</span>
        <span>{item.category || '未分类'}</span>
        <span>{item.publishTime || '未知时间'}</span>
      </div>
    </a>
  )
}

function formatDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function getEventPhase(event, todayKey) {
  if (!event) return { key: 'unknown', label: '未知' }
  if (event.date <= todayKey && event.effectiveEndDate >= todayKey) {
    return { key: 'live', label: '进行中' }
  }
  if (event.date > todayKey) {
    return { key: 'upcoming', label: '即将开始' }
  }
  return { key: 'past', label: '已结束' }
}

function buildCalendarDays(year, month) {
  const first = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  let startOffset = first.getUTCDay() - 1
  if (startOffset < 0) startOffset = 6
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(Date.UTC(year, month, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function CalendarDayContent({ date, displayMonth, dayMetaMap }) {
  const isOutside = date.getUTCMonth() !== displayMonth.getUTCMonth() || date.getUTCFullYear() !== displayMonth.getUTCFullYear()
  if (isOutside) return <span>{date.getUTCDate()}</span>

  const key = date.toISOString().slice(0, 10)
  const meta = dayMetaMap.get(key)
  const tooltip = meta
    ? `${meta.count} 个事件${meta.hasS ? ' · 含 S 级重点' : meta.hasA ? ' · 含 A 级重点' : ''}\n${meta.titles.slice(0, 3).join('\n')}`
    : ''

  return <span title={tooltip}>{date.getUTCDate()}</span>
}

function CalendarSources({ sources }) {
  if (!sources) return null

  return (
    <section className="calendar-sources editorial-panel">
      <div className="section-head split compact-head">
        <div>
          <div className="section-kicker">Sources</div>
          <h2>数据来源说明</h2>
        </div>
        <span>{(sources.primarySources?.length || 0) + (sources.auxiliarySources?.length || 0)} 个来源</span>
      </div>

      <div className="calendar-source-policy">
        <div className="calendar-source-policy-card">
          <span>硬源规则</span>
          <p>{sources.policy?.primaryRule}</p>
        </div>
        <div className="calendar-source-policy-card">
          <span>辅助源规则</span>
          <p>{sources.policy?.auxiliaryRule}</p>
        </div>
        <div className="calendar-source-policy-card">
          <span>升级规则</span>
          <p>{sources.policy?.promotionRule}</p>
        </div>
      </div>

      <div className="calendar-source-grid">
        <section className="calendar-source-column">
          <div className="calendar-source-head">
            <div className="calendar-side-kicker">Primary sources</div>
            <h3>主源 / 官方硬源</h3>
            <p>用于确认硬日期、会期、发布日。只有这层能直接支撑 confirmed。</p>
          </div>
          <div className="calendar-source-list">
            {(sources.primarySources || []).map((item) => (
              <a key={item.name} className="calendar-source-card primary-source-card" href={item.url} target="_blank" rel="noreferrer">
                <div className="calendar-chip-row">
                  <span className="calendar-badge confirmed">官方</span>
                </div>
                <h4>{item.name}</h4>
                <p>{item.url}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="calendar-source-column">
          <div className="calendar-source-head">
            <div className="calendar-side-kicker">Auxiliary sources</div>
            <h3>辅助情报源</h3>
            <p>用于发现事件、补背景、找热点与选题，但不直接作为 confirmed 唯一依据。</p>
          </div>
          <div className="calendar-source-list">
            {(sources.auxiliarySources || []).map((item) => (
              <article key={item.name} className="calendar-source-card auxiliary-source-card">
                <div className="calendar-chip-row">
                  <span className="calendar-badge tentative">辅助</span>
                  <span className="calendar-badge type-badge">{item.channel === 'wechat' ? '微信公众号' : item.channel}</span>
                  <span className="calendar-badge priority-badge priority-b">{item.confidence}</span>
                </div>
                <h4>{item.name}</h4>
                <p>{item.notes}</p>
                <div className="calendar-source-tags">
                  {(item.role || []).map((role) => <span key={role}>{role}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function AICalendar({ events, sources, standalone = false, onBack }) {
  const defaultMonth = useMemo(() => {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  }, [])
  const [month, setMonth] = useState(defaultMonth)
  const [selectedDate, setSelectedDate] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [hidePastEvents, setHidePastEvents] = useState(true)

  const todayKey = useMemo(() => {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  }, [])

  const normalizedEvents = useMemo(() => (events || []).map((e) => ({
    ...e,
    dateObj: new Date(`${e.date}T00:00:00Z`),
    effectiveEndDate: e.endDate || e.date,
  })), [events])

  const availableYears = useMemo(() => [...new Set(normalizedEvents.map((e) => String(e.dateObj.getUTCFullYear())))].sort(), [normalizedEvents])
  const availableTypes = useMemo(() => [...new Set(normalizedEvents.map((e) => e.type))].sort(), [normalizedEvents])
  const availablePriorities = useMemo(() => [...new Set(normalizedEvents.map((e) => e.priority || 'B'))].sort(), [normalizedEvents])

  const filteredEvents = useMemo(() => normalizedEvents
    .filter((e) => (statusFilter === 'all' || e.status === statusFilter))
    .filter((e) => (yearFilter === 'all' || String(e.dateObj.getUTCFullYear()) === yearFilter))
    .filter((e) => (typeFilter === 'all' || e.type === typeFilter))
    .filter((e) => (priorityFilter === 'all' || (e.priority || 'B') === priorityFilter))
    .filter((e) => (!hidePastEvents || e.effectiveEndDate >= todayKey)), [normalizedEvents, statusFilter, yearFilter, typeFilter, priorityFilter, hidePastEvents, todayKey])

  const sortedEvents = useMemo(() => [...filteredEvents].sort((a, b) => a.dateObj - b.dateObj), [filteredEvents])
  const liveOrUpcomingEvents = useMemo(() => sortedEvents.filter((e) => e.effectiveEndDate >= todayKey), [sortedEvents, todayKey])
  const anchorEvents = liveOrUpcomingEvents.length ? liveOrUpcomingEvents : sortedEvents
  const anchorEvent = anchorEvents[0] || null

  useEffect(() => {
    if (!filteredEvents.length) {
      setSelectedDate(null)
      return
    }

    const selectedKey = selectedDate ? selectedDate.toISOString().slice(0, 10) : null
    const hasSelectedDate = selectedKey && filteredEvents.some((e) => e.date === selectedKey)

    if (!hasSelectedDate && anchorEvent) {
      setSelectedDate(anchorEvent.dateObj)
    }
  }, [filteredEvents, selectedDate, anchorEvent])

  useEffect(() => {
    if (!anchorEvent) return

    const monthHasEvents = filteredEvents.some((e) => {
      return e.dateObj.getUTCFullYear() === month.getUTCFullYear() && e.dateObj.getUTCMonth() === month.getUTCMonth()
    })

    if (!monthHasEvents) {
      setMonth(new Date(Date.UTC(anchorEvent.dateObj.getUTCFullYear(), anchorEvent.dateObj.getUTCMonth(), 1)))
    }
  }, [filteredEvents, month, anchorEvent])

  const monthEvents = useMemo(() => filteredEvents.filter((e) => {
    return e.dateObj.getUTCFullYear() === month.getUTCFullYear() && e.dateObj.getUTCMonth() === month.getUTCMonth()
  }), [filteredEvents, month])

  const eventDates = useMemo(() => monthEvents.map((e) => e.dateObj), [monthEvents])
  const dayMetaMap = useMemo(() => {
    const map = new Map()
    monthEvents.forEach((event) => {
      const key = event.dateObj.toISOString().slice(0, 10)
      const existing = map.get(key) || { count: 0, hasS: false, hasA: false, titles: [] }
      existing.count += 1
      existing.hasS = existing.hasS || (event.priority || 'B') === 'S'
      existing.hasA = existing.hasA || (event.priority || 'B') === 'A'
      existing.titles.push(event.title)
      map.set(key, existing)
    })
    return map
  }, [monthEvents])
  const sPriorityDates = useMemo(() => {
    return [...new Set(monthEvents.filter((e) => (e.priority || 'B') === 'S').map((e) => e.dateObj.toISOString().slice(0, 10)))].map((date) => new Date(`${date}T00:00:00Z`))
  }, [monthEvents])
  const aPriorityDates = useMemo(() => {
    const sSet = new Set(monthEvents.filter((e) => (e.priority || 'B') === 'S').map((e) => e.dateObj.toISOString().slice(0, 10)))
    return [...new Set(monthEvents.filter((e) => (e.priority || 'B') === 'A' && !sSet.has(e.dateObj.toISOString().slice(0, 10))).map((e) => e.dateObj.toISOString().slice(0, 10)))].map((date) => new Date(`${date}T00:00:00Z`))
  }, [monthEvents])

  const selectedEvents = useMemo(() => {
    const target = selectedDate || anchorEvent?.dateObj || monthEvents[0]?.dateObj
    if (!target) return []
    const dayMatches = monthEvents
      .filter((e) => e.dateObj.toISOString().slice(0, 10) === target.toISOString().slice(0, 10))
      .sort((a, b) => {
        const priorityRank = { S: 0, A: 1, B: 2 }
        const aUpcoming = a.effectiveEndDate >= todayKey ? 0 : 1
        const bUpcoming = b.effectiveEndDate >= todayKey ? 0 : 1
        if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming
        return (priorityRank[a.priority || 'B'] ?? 9) - (priorityRank[b.priority || 'B'] ?? 9)
      })

    if (dayMatches.length) return dayMatches

    if (anchorEvent && target.toISOString().slice(0, 10) !== anchorEvent.dateObj.toISOString().slice(0, 10)) {
      return monthEvents
        .filter((e) => e.date === anchorEvent.date)
        .sort((a, b) => a.dateObj - b.dateObj)
    }

    return []
  }, [monthEvents, selectedDate, anchorEvent, todayKey])

  const upcomingEvents = useMemo(() => anchorEvents.slice(0, 8), [anchorEvents])

  const monthConfirmedCount = monthEvents.filter((e) => e.status === 'confirmed').length
  const monthWatchCount = monthEvents.filter((e) => e.status === 'official-watch').length
  const monthTentativeCount = monthEvents.filter((e) => e.status === 'tentative').length
  const selectedLabel = selectedEvents[0] ? formatDateLabel(selectedEvents[0].date) : `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`
  const monthTitle = `${month.getUTCFullYear()} ${MONTH_LABELS[month.getUTCMonth()]}`
  const markedDayCount = [...new Set(eventDates.map((date) => date.toISOString().slice(0, 10)))].length
  const focusEvent = selectedEvents.find((event) => event.effectiveEndDate >= todayKey) || selectedEvents[0] || anchorEvent || null
  const focusEventPhase = getEventPhase(focusEvent, todayKey)
  const selectedConfirmedCount = selectedEvents.filter((e) => e.status === 'confirmed').length
  const selectedHighPriorityCount = selectedEvents.filter((e) => (e.priority || 'B') === 'S' || (e.priority || 'B') === 'A').length

  return (
    <section className={`ai-calendar-block calendar-redesign ${standalone ? 'calendar-standalone' : ''}`}>
      {standalone ? (
        <div className="detail-topbar calendar-topbar">
          <button className="ghost-btn" onClick={onBack}>返回首页</button>
        </div>
      ) : null}

      <div className="calendar-hero editorial-panel">
        <div className="calendar-hero-copy">
          <div className="section-kicker">AI Calendar</div>
          <h2>AI 日历</h2>
          <p>把大会、模型发布与硬件节点放进同一个浏览器里看：先用月历定位，再看当天重点，最后顺着下方时间线继续追踪。</p>
        </div>
        <div className="calendar-hero-stats">
          <div className="calendar-stat-card">
            <span>当前月份</span>
            <strong>{monthTitle}</strong>
          </div>
          <div className="calendar-stat-card">
            <span>本月事件</span>
            <strong>{monthEvents.length}</strong>
          </div>
          <div className="calendar-stat-card">
            <span>已确认 / 官方观察 / 预计</span>
            <strong>{monthConfirmedCount} / {monthWatchCount} / {monthTentativeCount}</strong>
          </div>
        </div>
      </div>

      <div className="calendar-filterbar calendar-filter-shell editorial-panel">
        <div className="calendar-filtercopy">
          <strong>浏览维度</strong>
          <p>先按年份、类型、优先级、确认状态收窄范围，再在月历里挑一天看重点事件。</p>
          <div className="calendar-signal-note">信号层级：已确认 = 官方硬日期；官方观察 = 官方源但仍在跟踪；预计 = 尚未完全落地的时间窗口。</div>
        </div>
        <div className="calendar-filter-controls calendar-filter-controls-4">
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">全部年份</option>
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">全部类型</option>
            {availableTypes.map((type) => <option key={type} value={type}>{type === 'conference' ? '大会' : type === 'model' ? '模型发布' : type === 'hardware' ? '硬件/终端' : type}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">全部优先级</option>
            {availablePriorities.map((priority) => <option key={priority} value={priority}>{priority} 级</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">全部事件</option>
            <option value="confirmed">仅已确认</option>
            <option value="official-watch">仅官方观察</option>
            <option value="tentative">仅预计窗口</option>
          </select>
          <label className="calendar-toggle">
            <input type="checkbox" checked={hidePastEvents} onChange={(e) => setHidePastEvents(e.target.checked)} />
            <span>隐藏已过去事件</span>
          </label>
        </div>
      </div>

      <div className="calendar-main-grid">
        <section className="calendar-panel calendar-month-stage editorial-panel daypicker-shell">
          <div className="calendar-panel-head">
            <div>
              <div className="calendar-side-kicker">Month overview</div>
              <h3>{monthTitle}</h3>
            </div>
            <div className="calendar-panel-meta">
              <span>{monthEvents.length} events</span>
              <span>{markedDayCount} marked days</span>
            </div>
          </div>
          <div className="calendar-month-layout">
            <div className="calendar-month-board">
              <DayPicker
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                modifiers={{ hasEvent: eventDates, priorityS: sPriorityDates, priorityA: aPriorityDates }}
                modifiersClassNames={{ hasEvent: 'rdp-day_hasEvent', priorityS: 'rdp-day_priorityS', priorityA: 'rdp-day_priorityA' }}
                components={{
                  Day: (props) => <CalendarDayContent {...props} displayMonth={month} dayMetaMap={dayMetaMap} />,
                }}
                showOutsideDays
                weekStartsOn={1}
              />
            </div>
            <aside className="calendar-month-rail">
              <div className="calendar-rail-card">
                <span>本月已确认</span>
                <strong>{monthConfirmedCount}</strong>
                <p>已经有明确日期或官方页面确认的事件。</p>
              </div>
              <div className="calendar-rail-card">
                <span>本月官方观察</span>
                <strong>{monthWatchCount}</strong>
                <p>来自官方 news / blog / future meetings，但尚未完全落成硬事件的信号源。</p>
              </div>
              <div className="calendar-rail-card">
                <span>本月预计窗口</span>
                <strong>{monthTentativeCount}</strong>
                <p>仍需继续盯官方消息的潜在发布时间窗。</p>
              </div>
              <div className="calendar-rail-card rail-focus-card">
                <span>当前焦点</span>
                <strong>{focusEvent ? focusEvent.title : '暂无焦点事件'}</strong>
                <p>{focusEvent ? `${formatDateLabel(focusEvent.date)} · ${focusEvent.source} · ${focusEventPhase.label}` : '切换月份或筛选条件，找到更值得盯的事件。'}</p>
              </div>
            </aside>
          </div>
        </section>

        <aside className="calendar-focus-panel editorial-panel">
          <div className="calendar-focus-head">
            <div>
              <div className="calendar-side-kicker">Focus day</div>
              <h3>{selectedLabel}</h3>
            </div>
            <div className="calendar-focus-count">{selectedEvents.length} events</div>
          </div>

          <p className="calendar-side-summary">
            {selectedEvents.length
              ? '优先展示这一天里仍在进行或接下来的重点事件，右侧只保留真正值得读的焦点信息。'
              : '当天暂无事件。你可以切换月份，或直接看下方 Upcoming 时间线。'}
          </p>

          {selectedEvents.length ? (
            <div className="calendar-day-snapshot">
              <div className="calendar-day-stat">
                <span>当天已确认</span>
                <strong>{selectedConfirmedCount}</strong>
              </div>
              <div className="calendar-day-stat">
                <span>高优先级</span>
                <strong>{selectedHighPriorityCount}</strong>
              </div>
              <div className="calendar-day-stat day-source-stat">
                <span>主要来源</span>
                <strong>{Array.from(new Set(selectedEvents.map((event) => event.source))).join(' / ')}</strong>
              </div>
            </div>
          ) : null}

          <div className="calendar-event-stack compact-event-stack">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <a key={event.id} className="calendar-focus-card" href={event.url} target="_blank" rel="noreferrer">
                <div className="calendar-focus-topline">
                  <div className="calendar-chip-row">
                    <span className={`calendar-badge phase-badge phase-${getEventPhase(event, todayKey).key}`}>{getEventPhase(event, todayKey).label}</span>
                    <span className={`calendar-badge ${event.status}`}>{event.status === 'confirmed' ? '已确认' : event.status === 'official-watch' ? '官方观察' : '预计'}</span>
                    <span className={`calendar-badge priority-badge priority-${(event.priority || 'B').toLowerCase()}`}>{event.priority || 'B'}</span>
                    <span className="calendar-badge type-badge">{event.type === 'conference' ? '大会' : event.type === 'model' ? '模型发布' : event.type === 'hardware' ? '硬件/终端' : '事件'}</span>
                  </div>
                  <span className="calendar-focus-link">查看原页</span>
                </div>
                <h4>{event.title}</h4>
                <p>{event.description}</p>
                <div className="calendar-focus-meta">
                  <div className="calendar-focus-meta-item"><span>来源</span><strong>{event.source}</strong></div>
                  <div className="calendar-focus-meta-item"><span>地点</span><strong>{event.location}</strong></div>
                  <div className="calendar-focus-meta-item"><span>开始</span><strong>{formatDateLabel(event.date)}</strong></div>
                  <div className="calendar-focus-meta-item"><span>结束</span><strong>{event.endDate ? formatDateLabel(event.endDate) : formatDateLabel(event.date)}</strong></div>
                </div>
              </a>
            )) : <div className="empty">这一天没有录入事件，可以切换月份或查看下方近期事件。</div>}
          </div>
        </aside>
      </div>

      <section className="calendar-upcoming calendar-timeline editorial-panel">
        <div className="section-head split compact-head">
          <div>
            <div className="section-kicker">Upcoming</div>
            <h2>进行中 / 接下来值得盯的事件</h2>
          </div>
          <span>{upcomingEvents.length} 条时间线</span>
        </div>
        <div className="upcoming-list">
          {upcomingEvents.map((event) => (
            <a key={event.id} className="upcoming-item" href={event.url} target="_blank" rel="noreferrer">
              <div className="upcoming-date">{formatDateLabel(event.date)}</div>
              <div className="upcoming-main">
                <div className="calendar-chip-row upcoming-chip-row">
                  <span className={`calendar-badge phase-badge phase-${getEventPhase(event, todayKey).key}`}>{getEventPhase(event, todayKey).label}</span>
                  <span className={`calendar-badge ${event.status}`}>{event.status === 'confirmed' ? '已确认' : event.status === 'official-watch' ? '官方观察' : '预计'}</span>
                  <span className={`calendar-badge priority-badge priority-${(event.priority || 'B').toLowerCase()}`}>{event.priority || 'B'}</span>
                  <span className="calendar-badge type-badge">{event.type === 'conference' ? '大会' : event.type === 'model' ? '模型发布' : event.type === 'hardware' ? '硬件/终端' : '事件'}</span>
                </div>
                <h4>{event.title}</h4>
                <p>{event.description}</p>
              </div>
              <div className="upcoming-side">
                <span>{event.source}</span>
                <span>{event.location}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <CalendarSources sources={sources} />
    </section>
  )
}

export default function App() {
  const [data, setData] = useState({ summary: null, opinions: [], articles: [] })
  const [calendarEvents, setCalendarEvents] = useState([])
  const [calendarSources, setCalendarSources] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [opportunity, setOpportunity] = useState('全部')
  const [source, setSource] = useState('全部')
  const [topic, setTopic] = useState('全部')
  const [route, setRoute] = useState(parseHash())
  const [articlePage, setArticlePage] = useState(1)
  const pageSize = 30

  useEffect(() => {
    fetch('./opinions.json')
      .then((r) => r.json())
      .then((raw) => {
        const opinions = (raw.opinions || []).map((item) => ({ ...item, topic: classifyTopic(item), slug: slugify(item.title) }))
        const articles = raw.articles || []
        setData({ ...raw, opinions, articles })
      })
      .catch((err) => {
        console.error(err)
        setData({ summary: null, opinions: [], articles: [] })
      })
  }, [])

  useEffect(() => {
    fetch('./ai-calendar-events.json')
      .then((r) => r.json())
      .then(setCalendarEvents)
      .catch((err) => {
        console.error(err)
        setCalendarEvents([])
      })
  }, [])

  useEffect(() => {
    fetch('./ai-calendar-sources.json')
      .then((r) => r.json())
      .then(setCalendarSources)
      .catch((err) => {
        console.error(err)
        setCalendarSources(null)
      })
  }, [])

  useEffect(() => {
    const handler = () => setRoute(parseHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  const filters = useMemo(() => {
    const opinions = data.opinions || []
    return {
      categories: ['全部', ...new Set(opinions.map((x) => x.category).filter(Boolean))],
      opportunities: ['全部', ...new Set(opinions.map((x) => x.opportunity).filter(Boolean))],
      sources: ['全部', ...new Set((data.articles || []).map((x) => x.source).filter(Boolean))],
      topics: ['全部', ...new Set(opinions.map((x) => x.topic).filter(Boolean))],
    }
  }, [data])

  const filteredOpinions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data.opinions || [])
      .filter((item) => category === '全部' || item.category === category)
      .filter((item) => opportunity === '全部' || item.opportunity === opportunity)
      .filter((item) => source === '全部' || item.source === source)
      .filter((item) => topic === '全部' || item.topic === topic)
      .filter((item) => {
        if (!q) return true
        const blob = [item.title, item.summary, item.judgment, item.view, item.category, item.source, item.topic].filter(Boolean).join(' ').toLowerCase()
        return blob.includes(q)
      })
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  }, [data, query, category, opportunity, source, topic])

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data.articles || [])
      .filter((item) => category === '全部' || item.category === category)
      .filter((item) => source === '全部' || item.source === source)
      .filter((item) => {
        if (!q) return true
        const blob = [item.title, item.excerpt, item.summary, item.judgment, item.category, item.source].filter(Boolean).join(' ').toLowerCase()
        return blob.includes(q)
      })
  }, [data, query, category, source])

  const pagedArticles = useMemo(() => {
    const start = (articlePage - 1) * pageSize
    return filteredArticles.slice(start, start + pageSize)
  }, [filteredArticles, articlePage])

  const totalArticlePages = Math.max(1, Math.ceil(filteredArticles.length / pageSize))

  const featured = useMemo(() => filteredOpinions.slice(0, 4), [filteredOpinions])
  const topicPanels = useMemo(() => TOPIC_RULES.map((rule) => {
    const matches = filteredOpinions.filter((item) => item.topic === rule.key)
    return { ...rule, count: matches.length, lead: matches[0] }
  }).filter((x) => x.count > 0), [filteredOpinions])

  useEffect(() => {
    setArticlePage(1)
  }, [query, category, source])

  const activeItem = useMemo(() => {
    if (route.type !== 'opinion') return null
    return (data.opinions || []).find((item) => item.id === route.id) || null
  }, [route, data])

  if (route.type === 'opinion' && activeItem) {
    return <div className="page-shell"><DetailView item={activeItem} onBack={() => setHash('/')} /></div>
  }

  if (route.type === 'calendar') {
    return <div className="page-shell"><AICalendar events={calendarEvents} sources={calendarSources} standalone onBack={() => setHash('/')} /></div>
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="section-kicker">AI Opinions Ledger</div>
          <h1>把文章变成判断，把判断变成动作。</h1>
          <p className="hero-lead">这里不是新闻流，而是从文章数据库里提炼出的观点层：哪些信号值得关注、哪些判断值得写、哪些方向已经接近真正的 AI 价值实现。</p>
          <div className="manifesto"><p>现在新增了全量文章栏：你既能看精选观点，也能直接浏览完整文章池。</p></div>
        </div>
        <aside className="hero-stats">
          <div className="stat-major"><span className="stat-label">已沉淀观点</span><strong>{data.summary?.opinionCount || 0}</strong></div>
          <div className="stat-list">
            <div className="stat-row"><span>全量文章</span><strong>{data.summary?.articleCount || 0}</strong></div>
            <div className="stat-row"><span>观点精选</span><strong>{data.summary?.opinionCount || 0}</strong></div>
            <div className="stat-row"><span>主题簇</span><strong>{filters.topics.length - 1}</strong></div>
            <div className="stat-row"><span>来源</span><strong>{data.summary?.sources?.length || 0}</strong></div>
          </div>
          <p className="stat-note">观点区来自已完成观点提炼的文章；文章区展示更完整的 Notion 文章库。</p>
        </aside>
      </header>

      <section className="calendar-entry entry-card" onClick={() => setHash('/calendar')}>
        <div>
          <div className="section-kicker">AI Calendar</div>
          <h2>查看 AI 日历</h2>
          <p>单独查看 2026–2027 年的重要 AI 事件、发布窗口与大会节点。</p>
        </div>
        <button className="primary-btn calendar-entry-btn">进入日历</button>
      </section>

      <section className="signal-board">
        <div className="section-head split"><div><div className="section-kicker">Signal clusters</div><h2>当下最值得追的主题簇</h2></div><span>{filteredOpinions.length} 条观点匹配</span></div>
        <div className="topic-grid">
          {topicPanels.map((panel) => (
            <article key={panel.key} className="topic-panel" onClick={() => panel.lead && setHash(`/opinion/${panel.lead.id}`)}>
              <div className="topic-top"><span className="topic-name">{panel.key}</span><strong>{panel.count}</strong></div>
              <p>{panel.blurb}</p>
              {panel.lead ? <h3>{truncate(panel.lead.title, 56)}</h3> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="controls editorial-panel">
        <input className="search" placeholder="搜索标题、观点、判断、主题…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>{filters.topics.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{filters.categories.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={opportunity} onChange={(e) => setOpportunity(e.target.value)}>{filters.opportunities.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>{filters.sources.map((x) => <option key={x}>{x}</option>)}</select>
      </section>

      <section className="feature-section">
        <div className="section-head split"><div><div className="section-kicker">Featured opinions</div><h2>值得优先消化的判断</h2></div></div>
        <div className="feature-grid">
          {featured.map((item, index) => (
            <article key={item.id} className={`feature-card feature-${index + 1}`} onClick={() => setHash(`/opinion/${item.id}`)}>
              <div className={`score-badge ${scoreColor(item.totalScore)}`}>Score {item.totalScore || 0}</div>
              <h3>{item.title}</h3>
              <p>{truncate(item.summary || item.judgment, 180)}</p>
              <div className="feature-foot"><span>{item.topic}</span><span>{item.source}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-head split"><div><div className="section-kicker">Opinion wall</div><h2>全部观点</h2></div></section>
      <section className="grid">{filteredOpinions.map((item) => <OpinionCard key={item.id} item={item} onOpen={() => setHash(`/opinion/${item.id}`)} />)}</section>

      <section className="section-head split articles-head"><div><div className="section-kicker">All articles</div><h2>全量文章</h2></div><span>第 {articlePage} / {totalArticlePages} 页，共 {filteredArticles.length} 篇匹配</span></section>
      <section className="article-list editorial-panel article-panel">{pagedArticles.map((item) => <ArticleRow key={item.id} item={item} />)}</section>
      <div className="pagination-bar">
        <button className="ghost-btn" disabled={articlePage <= 1} onClick={() => setArticlePage((p) => Math.max(1, p - 1))}>上一页</button>
        <div className="pagination-info">第 {articlePage} 页 / 共 {totalArticlePages} 页</div>
        <button className="ghost-btn" disabled={articlePage >= totalArticlePages} onClick={() => setArticlePage((p) => Math.min(totalArticlePages, p + 1))}>下一页</button>
      </div>

      {!filteredOpinions.length && <div className="empty">没有匹配结果，换个主题词或筛选条件试试。</div>}
    </div>
  )
}
