import fs from 'node:fs/promises'
import path from 'node:path'

const notionKeyPath = path.join(process.env.HOME || '', '.config', 'notion', 'api_key')
const notionConfigPath = path.join(process.env.HOME || '', '.config', 'notion', 'config.json')
const outPath = path.resolve('public/opinions.json')
const NOTION_VERSION = '2025-09-03'
const DATA_SOURCE_ID = '119a0b5d-9a16-4ecb-a003-6de934eccb2f' // All Articles current accessible data_source_id

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

async function main() {
  await fs.readFile(notionConfigPath, 'utf8').catch(() => '{}')

  const items = []
  let startCursor = undefined

  for (let i = 0; i < 30; i++) {
    const payload = {
      page_size: 100,
      filter: {
        or: [
          { property: 'My View', rich_text: { is_not_empty: true } },
          { property: 'Core Judgment', rich_text: { is_not_empty: true } },
          { property: 'One-line Summary', rich_text: { is_not_empty: true } },
        ],
      },
      sorts: [{ property: 'Total Score', direction: 'descending' }],
    }
    if (startCursor) payload.start_cursor = startCursor

    const data = await notionFetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, payload)

    for (const page of data.results || []) {
      const p = page.properties || {}
      const record = {
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
      items.push(record)
    }

    if (!data.has_more || !data.next_cursor) break
    startCursor = data.next_cursor
  }

  const summary = {
    exportedAt: new Date().toISOString(),
    count: items.length,
    categories: [...new Set(items.map((x) => x.category).filter(Boolean))].sort(),
    sources: [...new Set(items.map((x) => x.source).filter(Boolean))].sort(),
    opportunities: [...new Set(items.map((x) => x.opportunity).filter(Boolean))].sort(),
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify({ summary, items }, null, 2), 'utf8')
  console.log(`Exported ${items.length} opinion records -> ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
