import type { MaintenanceConfig } from '../../types/config'

const OWNER = 'dreamreflex'
const REPO = 'status'
const BRANCH = 'main'
const REF = `refs/heads/${BRANCH}`
const INDEX_PATH = 'maintenance/index.md'
const RAW_BASE = 'https://raw.githubusercontent.com'

function parseFrontMatterWorker(
  raw: string
): { meta: Record<string, string | string[]>; body: string } {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('---')) {
    return { meta: {}, body: trimmed }
  }

  const lines = trimmed.split(/\r?\n/)
  if (lines[0].trim() !== '---') {
    return { meta: {}, body: trimmed }
  }

  const metaLines: string[] = []
  let i = 1
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '---') {
      i++
      break
    }
    metaLines.push(line)
  }
  const body = lines.slice(i).join('\n').trim()

  const meta: Record<string, string | string[]> = {}

  const unquote = (value: string) => {
    const v = value.trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1)
    }
    return v
  }

  for (const line of metaLines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    const idx = trimmedLine.indexOf(':')
    if (idx === -1) continue
    const key = trimmedLine.slice(0, idx).trim()
    let value = trimmedLine.slice(idx + 1).trim()

    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim()
      const arr =
        inner.length === 0
          ? []
          : inner
              .split(',')
              .map((v) => unquote(v))
              .filter((v) => v.length > 0)
      meta[key] = arr
    } else {
      meta[key] = unquote(value)
    }
  }

  return { meta, body }
}

function parseMaintenanceMarkdownWorker(
  content: string,
  fileName: string
): MaintenanceConfig | null {
  const { meta, body } = parseFrontMatterWorker(content)

  const monitorsRaw = meta.monitors
  let monitors: string[] | undefined
  if (Array.isArray(monitorsRaw)) {
    monitors = monitorsRaw
  } else if (typeof monitorsRaw === 'string' && monitorsRaw.trim().length > 0) {
    monitors = monitorsRaw
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
  }

  const start =
    (meta.start as string | undefined) ||
    (meta.begin as string | undefined) ||
    (meta.from as string | undefined)

  if (!start) {
    return null
  }

  const end =
    (meta.end as string | undefined) ||
    (meta.to as string | undefined) ||
    (meta.until as string | undefined)

  const title =
    (meta.title as string | undefined) ||
    fileName.replace(/\.md$/i, '') ||
    'Scheduled Maintenance'

  const color = meta.color as string | undefined
  const status = meta.status as string | undefined
  const type = meta.type as string | undefined
  const id = meta.id as string | undefined

  const finalBody =
    (meta.body as string | undefined && String(meta.body).trim().length > 0
      ? String(meta.body)
      : body) || ''

  const maintenance: MaintenanceConfig = {
    monitors,
    title,
    body: finalBody,
    start,
    end,
    color,
    status,
    type,
    id,
  }

  return maintenance
}

async function fetchMaintenancesFromGithubOnceWorker(): Promise<MaintenanceConfig[]> {
  // 同前端逻辑：REF 中包含斜杠，不能整体 encodeURIComponent
  const indexUrl = `${RAW_BASE}/${encodeURIComponent(OWNER)}/${encodeURIComponent(
    REPO
  )}/${REF}/${INDEX_PATH}`

  let indexContent = ''
  try {
    const resp = await fetch(indexUrl, {
      headers: {
        'User-Agent': 'UptimeFlare-Maintenance-Worker',
      },
    })
    if (!resp.ok) {
      console.log(
        'Failed to load maintenance index from GitHub raw (worker):',
        resp.status,
        indexUrl
      )
      return []
    }
    indexContent = await resp.text()
  } catch (err) {
    console.log('Error fetching maintenance index from GitHub raw (worker):', err)
    return []
  }

  const indexDir =
    INDEX_PATH.lastIndexOf('/') >= 0
      ? INDEX_PATH.slice(0, INDEX_PATH.lastIndexOf('/'))
      : ''

  const filePaths: string[] = []
  for (const lineRaw of indexContent.split(/\r?\n/)) {
    let line = lineRaw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('- ') || line.startsWith('* ')) {
      line = line.slice(2).trim()
    }
    if (!line) continue
    if (!line.toLowerCase().endsWith('.md')) continue

    const fullPath =
      indexDir && !line.includes('/') ? `${indexDir}/${line}` : line
    filePaths.push(fullPath)
  }

  const maintenances: MaintenanceConfig[] = []

  for (const path of filePaths) {
    const url = `${RAW_BASE}/${encodeURIComponent(OWNER)}/${encodeURIComponent(
      REPO
    )}/${REF}/${path}`
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'UptimeFlare-Maintenance-Worker' },
      })
      if (!resp.ok) continue
      const text = await resp.text()
      const fileName = path.split('/').slice(-1)[0]
      const parsed = parseMaintenanceMarkdownWorker(text, fileName)
      if (parsed) {
        maintenances.push(parsed)
      }
    } catch (err) {
      console.log('Error fetching maintenance markdown from GitHub (worker):', err)
      continue
    }
  }

  maintenances.sort((a, b) => {
    const ta = new Date(a.start).getTime()
    const tb = new Date(b.start).getTime()
    return tb - ta
  })

  return maintenances
}

let cache: MaintenanceConfig[] | null = null
let cacheTime = 0
const CACHE_TTL_MS = 60 * 1000

export async function getMaintenancesFromGithubForWorker(): Promise<MaintenanceConfig[]> {
  const now = Date.now()
  if (cache && now - cacheTime < CACHE_TTL_MS) {
    return cache
  }
  const data = await fetchMaintenancesFromGithubOnceWorker()
  cache = data
  cacheTime = now
  return data
}
