import fs from 'node:fs/promises'
import path from 'node:path'

const notionKeyPath = path.join(process.env.HOME || '', '.config', 'notion', 'api_key')
const notionConfigPath = path.join(process.env.HOME || '', '.config', 'notion', 'config.json')
const outPath = path.resolve('public/opinions.json')
const NOTION_VERSION = '2025-09-03'
const DATA_SOURCE_ID = '119a0b5d-9a16-4ecb-a003-6de934eccb2f'

function richTextToString(prop) {
  if (!prop) return ''
  const t = prop.type
  if (t === 'title' || t === 'rich_text') {
    return (prop[t] || []).map((x) => x.plain_text || '').join('').trim()
  }
  if (t === 'select') return prop.select?.name || ''
  if (t === 'number') return prop.number ?? null
  if (t === 'checkbox') return !!prop.checkbox
  if (t === 'url') return prop.url || ''
  if (t === 'date') return prop.date?.start || ''
  return ''
}

function scoreNum(v) {
  return typeof v === 'number' ? v : Number(v || 0) || 0
}

function hasOpinion(record) {
  return Boolean(record.summary || record.judgment || record.view)
}

async function notionFetch(url, body) {
  const key = (await fs.readFile(notionKeyPath, 'utf8')).trim()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Notion request failed ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

function normalizePage(page) {
  const p = page.properties || {}
  return {
    id: page.id,
    title: richTextToString(p.Name),
    summary: richTextToString(p['One-line Summary']),
    judgment: richTextToString(p['Core Judgment']),
    view: richTextToString(p['My View']),
    opportunity: richTextToString(p['Opportunity Level']) || 'watch',
    angle: richTextToString(p['Content Angle']) || '点评',
    category: richTextToString(p.Category) || richTextToString(p['Category Guess']) || '未分类',
    source: richTextToString(p.Source) || 'unknown',
    author: richTextToString(p.Author),
    url: richTextToString(p.URL),
    excerpt: richTextToString(p.Excerpt),
    publishTime: richTextToString(p['Publish Time']) || richTextToString(p['Publish Date']),
    totalScore: scoreNum(richTextToString(p['Total Score'])),
    aiScore: scoreNum(richTextToString(p['AI Score'])),
    financeScore: scoreNum(richTextToString(p['Finance Score'])),
    noveltyScore: scoreNum(richTextToString(p['Novelty Score'])),
    selectedTop10: !!richTextToString(p['Selected Top10']),
  }
}

async function queryAllArticles() {
  const allArticles = []
  let startCursor

  for (let i = 0; i < 30; i++) {
    const payload = {
      page_size: 100,
      sorts: [{ property: 'Collected At', direction: 'descending' }],
    }
    if (startCursor) payload.start_cursor = startCursor

    const data = await notionFetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, payload)
    for (const page of data.results || []) {
      allArticles.push(normalizePage(page))
    }
    if (!data.has_more || !data.next_cursor) break
    startCursor = data.next_cursor
  }

  return allArticles
}

async function main() {
  await fs.readFile(notionConfigPath, 'utf8').catch(() => '{}')

  const allArticles = await queryAllArticles()
  const opinions = allArticles.filter(hasOpinion).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))

  const summary = {
    exportedAt: new Date().toISOString(),
    opinionCount: opinions.length,
    articleCount: allArticles.length,
    categories: [...new Set(allArticles.map((x) => x.category).filter(Boolean))].sort(),
    sources: [...new Set(allArticles.map((x) => x.source).filter(Boolean))].sort(),
    opportunities: [...new Set(opinions.map((x) => x.opportunity).filter(Boolean))].sort(),
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify({ summary, opinions, articles: allArticles }, null, 2), 'utf8')
  console.log(`Exported ${opinions.length} opinions and ${allArticles.length} articles -> ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
