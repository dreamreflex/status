import type { MaintenanceConfig } from '../../types/config'

type GitHubContentItem = {
  name: string
  path: string
  type: string
  download_url?: string
}

const OWNER = 'dreamreflex'
const REPO = 'status'
const BRANCH = 'main'
const DIR = 'maintenance'
const API_BASE = 'https://api.github.com'

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

async function fetchGitHubMaintenanceFilesWorker(): Promise<GitHubContentItem[]> {
  const url = `${API_BASE}/repos/${encodeURIComponent(
    OWNER
  )}/${encodeURIComponent(REPO)}/contents/${encodeURIComponent(
    DIR
  )}?ref=${encodeURIComponent(BRANCH)}`

  try {
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'UptimeFlare-Maintenance-Worker',
      },
    })
    if (!resp.ok) {
      console.log('Failed to load maintenance list from GitHub (worker):', resp.status, url)
      return []
    }
    const data = (await resp.json()) as GitHubContentItem[] | any
    if (!Array.isArray(data)) return []
    return data.filter(
      (item) =>
        item.type === 'file' &&
        typeof item.name === 'string' &&
        item.name.toLowerCase().endsWith('.md')
    )
  } catch (err) {
    console.log('Error fetching maintenance list from GitHub (worker):', err)
    return []
  }
}

async function fetchMaintenancesFromGithubOnceWorker(): Promise<MaintenanceConfig[]> {
  const files = await fetchGitHubMaintenanceFilesWorker()
  const maintenances: MaintenanceConfig[] = []

  for (const file of files) {
    if (!file.download_url) continue
    try {
      const resp = await fetch(file.download_url, {
        headers: { 'User-Agent': 'UptimeFlare-Maintenance-Worker' },
      })
      if (!resp.ok) continue
      const text = await resp.text()
      const parsed = parseMaintenanceMarkdownWorker(text, file.name)
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
