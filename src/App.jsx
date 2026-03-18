import { useEffect, useMemo, useState } from 'react'

const TOPIC_RULES = [
  {
    key: '执行闭环',
    match: ['闭环', '执行', '工作流', '自动化', '可交付', 'Operator'],
    blurb: '关注 AI 是否从表达层走向结果交付层。',
  },
  {
    key: 'Agent 现实世界',
    match: ['现实世界', '地点', '验证', '校验', '营业', '数据基础设施'],
    blurb: '关注 Agent 在真实环境中的可执行性与校验层。',
  },
  {
    key: '反泡沫',
    match: ['复杂', 'Token', '框架', '安全', '审计', '权限'],
    blurb: '警惕表演式 Agent 与高成本低闭环方案。',
  },
  {
    key: '基础设施经营',
    match: ['基础设施', 'GPU', '调度', '持续在线', '经营', '运维'],
    blurb: '从资源堆砌转向资源经营与连续可用。',
  },
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
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function toOpinionPath(item) {
  return `#/opinion/${item.id}`
}

function setHash(path) {
  window.location.hash = path
}

function parseHash() {
  const hash = window.location.hash || '#/'
  const clean = hash.replace(/^#/, '') || '/'
  const parts = clean.split('/').filter(Boolean)
  if (parts[0] === 'opinion' && parts[1]) {
    return { type: 'opinion', id: parts[1] }
  }
  return { type: 'home' }
}

function DetailView({ item, onBack }) {
  if (!item) return null
  return (
    <div className="detail-page editorial-panel">
      <div className="detail-head">
        <button className="ghost-btn" onClick={onBack}>返回列表</button>
        <a className="ghost-btn" href={toOpinionPath(item)}>复制当前链接</a>
      </div>
      <div className="detail-title-block">
        <div className="section-kicker">观点详情</div>
        <h1>{item.title}</h1>
        <div className="meta-grid">
          <span>主题：{item.topic}</span>
          <span>分类：{item.category || '未分类'}</span>
          <span>来源：{item.source || 'unknown'}</span>
          <span>机会级别：{item.opportunity || 'watch'}</span>
          <span>总分：{item.totalScore ?? 0}</span>
          <span>发布时间：{item.publishTime || '未知'}</span>
        </div>
      </div>

      {item.summary && <section><h3>一句话总结</h3><p>{item.summary}</p></section>}
      {item.judgment && <section><h3>核心判断</h3><p>{item.judgment}</p></section>}
      {item.view && <section><h3>我的观点</h3><p>{item.view}</p></section>}
      {item.excerpt && <section><h3>原文摘要</h3><p>{item.excerpt}</p></section>}

      <div className="modal-actions">
        {item.url ? <a className="primary-btn" href={item.url} target="_blank" rel="noreferrer">查看原文</a> : null}
      </div>
    </div>
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
      <div className="card-foot">
        <span>{item.source || 'unknown'}</span>
        <span>{item.category || '未分类'}</span>
      </div>
    </article>
  )
}

export default function App() {
  const [data, setData] = useState({ summary: null, items: [] })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [opportunity, setOpportunity] = useState('全部')
  const [source, setSource] = useState('全部')
  const [topic, setTopic] = useState('全部')
  const [route, setRoute] = useState(parseHash())

  useEffect(() => {
    fetch('./opinions.json')
      .then((r) => r.json())
      .then((raw) => {
        const items = (raw.items || []).map((item) => ({
          ...item,
          topic: classifyTopic(item),
          slug: slugify(item.title),
        }))
        setData({ ...raw, items })
      })
      .catch((err) => {
        console.error(err)
        setData({ summary: null, items: [] })
      })
  }, [])

  useEffect(() => {
    const handler = () => setRoute(parseHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const filters = useMemo(() => {
    const items = data.items || []
    return {
      categories: ['全部', ...new Set(items.map((x) => x.category).filter(Boolean))],
      opportunities: ['全部', ...new Set(items.map((x) => x.opportunity).filter(Boolean))],
      sources: ['全部', ...new Set(items.map((x) => x.source).filter(Boolean))],
      topics: ['全部', ...new Set(items.map((x) => x.topic).filter(Boolean))],
    }
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data.items || [])
      .filter((item) => category === '全部' || item.category === category)
      .filter((item) => opportunity === '全部' || item.opportunity === opportunity)
      .filter((item) => source === '全部' || item.source === source)
      .filter((item) => topic === '全部' || item.topic === topic)
      .filter((item) => {
        if (!q) return true
        const blob = [item.title, item.summary, item.judgment, item.view, item.category, item.source, item.topic]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return blob.includes(q)
      })
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  }, [data, query, category, opportunity, source, topic])

  const featured = useMemo(() => filtered.slice(0, 4), [filtered])

  const topicPanels = useMemo(() => {
    return TOPIC_RULES.map((rule) => {
      const matches = filtered.filter((item) => item.topic === rule.key)
      return { ...rule, count: matches.length, lead: matches[0] }
    }).filter((x) => x.count > 0)
  }, [filtered])

  const activeItem = useMemo(() => {
    if (route.type !== 'opinion') return null
    return (data.items || []).find((item) => item.id === route.id) || null
  }, [route, data])

  if (route.type === 'opinion' && activeItem) {
    return <div className="page-shell"><DetailView item={activeItem} onBack={() => setHash('/')} /></div>
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="section-kicker">AI Opinions Ledger</div>
          <h1>把文章变成判断，把判断变成动作。</h1>
          <p className="hero-lead">
            这里不是新闻流，而是从文章数据库里提炼出的观点层：哪些信号值得关注、
            哪些判断值得写、哪些方向已经接近真正的 AI 价值实现。
          </p>
          <div className="manifesto">
            <p>这个库默认相信三件事：AI 的价值在执行闭环；比聪明更重要的是可靠；比热闹更重要的是可转成动作。</p>
          </div>
        </div>
        <aside className="hero-stats">
          <div className="stat-major">
            <span className="stat-label">已沉淀观点</span>
            <strong>{data.summary?.count || 0}</strong>
          </div>
          <div className="stat-list">
            <div className="stat-row"><span>主题簇</span><strong>{filters.topics.length - 1}</strong></div>
            <div className="stat-row"><span>来源</span><strong>{data.summary?.sources?.length || 0}</strong></div>
            <div className="stat-row"><span>分类</span><strong>{data.summary?.categories?.length || 0}</strong></div>
          </div>
          <p className="stat-note">基于 Notion 的文章观点字段自动生成，可继续扩充与再加工。</p>
        </aside>
      </header>

      <section className="signal-board">
        <div className="section-head split">
          <div>
            <div className="section-kicker">Signal clusters</div>
            <h2>当下最值得追的主题簇</h2>
          </div>
          <span>{filtered.length} 条匹配</span>
        </div>
        <div className="topic-grid">
          {topicPanels.map((panel) => (
            <article key={panel.key} className="topic-panel" onClick={() => panel.lead && setHash(`/opinion/${panel.lead.id}`)}>
              <div className="topic-top">
                <span className="topic-name">{panel.key}</span>
                <strong>{panel.count}</strong>
              </div>
              <p>{panel.blurb}</p>
              {panel.lead ? <h3>{truncate(panel.lead.title, 56)}</h3> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="controls editorial-panel">
        <input
          className="search"
          placeholder="搜索标题、观点、判断、主题…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          {filters.topics.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {filters.categories.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={opportunity} onChange={(e) => setOpportunity(e.target.value)}>
          {filters.opportunities.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          {filters.sources.map((x) => <option key={x}>{x}</option>)}</select>
      </section>

      <section className="feature-section">
        <div className="section-head split">
          <div>
            <div className="section-kicker">Featured opinions</div>
            <h2>值得优先消化的判断</h2>
          </div>
        </div>
        <div className="feature-grid">
          {featured.map((item, index) => (
            <article key={item.id} className={`feature-card feature-${index + 1}`} onClick={() => setHash(`/opinion/${item.id}`)}>
              <div className={`score-badge ${scoreColor(item.totalScore)}`}>Score {item.totalScore || 0}</div>
              <h3>{item.title}</h3>
              <p>{truncate(item.summary || item.judgment, 180)}</p>
              <div className="feature-foot">
                <span>{item.topic}</span>
                <span>{item.source}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-head split">
        <div>
          <div className="section-kicker">Opinion wall</div>
          <h2>全部观点</h2>
        </div>
      </section>
      <section className="grid">
        {filtered.map((item) => (
          <OpinionCard key={item.id} item={item} onOpen={() => setHash(`/opinion/${item.id}`)} />
        ))}
      </section>

      {!filtered.length && <div className="empty">没有匹配结果，换个主题词或筛选条件试试。</div>}
    </div>
  )
}
