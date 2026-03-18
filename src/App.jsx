import { useEffect, useMemo, useState } from 'react'

function scoreColor(score) {
  if (score >= 8) return 'score-high'
  if (score >= 5) return 'score-mid'
  return 'score-low'
}

function truncate(text, len = 180) {
  if (!text) return ''
  return text.length > len ? `${text.slice(0, len)}…` : text
}

function DetailModal({ item, onClose }) {
  if (!item) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">AI 观点详情</div>
            <h2>{item.title}</h2>
          </div>
          <button className="ghost-btn" onClick={onClose}>关闭</button>
        </div>

        <div className="meta-grid">
          <span>分类：{item.category || '未分类'}</span>
          <span>来源：{item.source || 'unknown'}</span>
          <span>机会级别：{item.opportunity || 'watch'}</span>
          <span>表达角度：{item.angle || '点评'}</span>
          <span>总分：{item.totalScore ?? 0}</span>
          <span>发布时间：{item.publishTime || '未知'}</span>
        </div>

        {item.summary && <section><h3>一句话总结</h3><p>{item.summary}</p></section>}
        {item.judgment && <section><h3>核心判断</h3><p>{item.judgment}</p></section>}
        {item.view && <section><h3>我的观点</h3><p>{item.view}</p></section>}
        {item.excerpt && <section><h3>原文摘要</h3><p>{item.excerpt}</p></section>}

        <div className="modal-actions">
          {item.url ? <a className="primary-btn" href={item.url} target="_blank" rel="noreferrer">查看原文</a> : null}
        </div>
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
        <span className="chip">{item.category || '未分类'}</span>
      </div>
      <h3>{item.title}</h3>
      <p className="summary">{truncate(item.summary || item.judgment || item.view, 140)}</p>
      <p className="judgment">{truncate(item.judgment, 120)}</p>
      <div className="card-foot">
        <span>{item.source || 'unknown'}</span>
        <span>{item.angle || '点评'}</span>
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
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('./opinions.json')
      .then((r) => r.json())
      .then(setData)
      .catch((err) => {
        console.error(err)
        setData({ summary: null, items: [] })
      })
  }, [])

  const filters = useMemo(() => {
    const items = data.items || []
    return {
      categories: ['全部', ...new Set(items.map((x) => x.category).filter(Boolean))],
      opportunities: ['全部', ...new Set(items.map((x) => x.opportunity).filter(Boolean))],
      sources: ['全部', ...new Set(items.map((x) => x.source).filter(Boolean))],
    }
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data.items || [])
      .filter((item) => category === '全部' || item.category === category)
      .filter((item) => opportunity === '全部' || item.opportunity === opportunity)
      .filter((item) => source === '全部' || item.source === source)
      .filter((item) => {
        if (!q) return true
        const blob = [item.title, item.summary, item.judgment, item.view, item.category, item.source]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return blob.includes(q)
      })
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  }, [data, query, category, opportunity, source])

  const topSignals = useMemo(() => {
    return filtered.slice(0, 3)
  }, [filtered])

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Notion 驱动</div>
          <h1>AI 观点库</h1>
          <p>
            从文章数据库里提炼出的 AI 观点、核心判断与机会信号。不是资讯列表，
            而是可搜索、可筛选、可直接用于选题和判断的观点层。
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat"><strong>{data.summary?.count || 0}</strong><span>观点记录</span></div>
          <div className="stat"><strong>{data.summary?.categories?.length || 0}</strong><span>分类</span></div>
          <div className="stat"><strong>{data.summary?.sources?.length || 0}</strong><span>来源</span></div>
        </div>
      </header>

      <section className="controls">
        <input
          className="search"
          placeholder="搜索观点、标题、判断、来源…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {filters.categories.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select value={opportunity} onChange={(e) => setOpportunity(e.target.value)}>
          {filters.opportunities.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          {filters.sources.map((x) => <option key={x}>{x}</option>)}
        </select>
      </section>

      <section className="top-strip">
        <div className="section-head">
          <h2>当前最强信号</h2>
          <span>{filtered.length} 条匹配</span>
        </div>
        <div className="top-grid">
          {topSignals.map((item) => (
            <div key={item.id} className="top-card" onClick={() => setSelected(item)}>
              <div className={`score-badge ${scoreColor(item.totalScore)}`}>Score {item.totalScore || 0}</div>
              <h3>{item.title}</h3>
              <p>{truncate(item.summary || item.judgment, 150)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-head">
        <h2>全部观点</h2>
      </section>
      <section className="grid">
        {filtered.map((item) => (
          <OpinionCard key={item.id} item={item} onOpen={setSelected} />
        ))}
      </section>

      {!filtered.length && <div className="empty">没有匹配结果，换个关键词试试。</div>}

      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
