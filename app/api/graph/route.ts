import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

interface Node {
  id: string
  label: string
  group: number
}

interface Link {
  source: string
  target: string
  value: number
}

// Option 1: Load from local CSV files (default)
async function loadLocalCSV<T>(filename: string): Promise<T[]> {
  const dataDir = path.join(process.cwd(), 'data')
  const filepath = path.join(dataDir, filename)

  try {
    const content = await fs.readFile(filepath, 'utf-8')
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
    })
  } catch {
    return []
  }
}

// Option 2: Load from remote URL (for large files stored elsewhere)
async function loadRemoteCSV<T>(url: string): Promise<T[]> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }) // Cache for 1 hour
    if (!response.ok) throw new Error('Failed to fetch')
    const content = await response.text()
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
    })
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const groupFilter = searchParams.get('group')
    ? parseInt(searchParams.get('group')!)
    : null

  // Check for remote CSV URLs (set these in Vercel environment variables)
  const nodesUrl = process.env.NODES_CSV_URL
  const edgesUrl = process.env.EDGES_CSV_URL

  // Load data - prefer remote if configured, otherwise use local files
  let nodes: Node[]
  let links: Link[]

  if (nodesUrl && edgesUrl) {
    // Load from remote storage (Vercel Blob, S3, R2, etc.)
    ;[nodes, links] = await Promise.all([
      loadRemoteCSV<Node>(nodesUrl),
      loadRemoteCSV<Link>(edgesUrl),
    ])
  } else {
    // Load from local CSV files
    ;[nodes, links] = await Promise.all([
      loadLocalCSV<Node>('nodes.csv'),
      loadLocalCSV<Link>('edges.csv'),
    ])
  }

  // Convert string values to proper types
  nodes = nodes.map(n => ({
    ...n,
    group: typeof n.group === 'string' ? parseInt(n.group) : n.group,
  }))

  links = links.map(l => ({
    ...l,
    value: typeof l.value === 'string' ? parseInt(l.value) : l.value,
  }))

  // Apply group filter if specified
  if (groupFilter !== null) {
    const filteredNodeIds = new Set(
      nodes.filter(n => n.group === groupFilter).map(n => n.id)
    )

    // Include connected nodes
    links.forEach(link => {
      if (filteredNodeIds.has(link.source) || filteredNodeIds.has(link.target)) {
        filteredNodeIds.add(link.source)
        filteredNodeIds.add(link.target)
      }
    })

    nodes = nodes.filter(n => filteredNodeIds.has(n.id))
    links = links.filter(
      l => filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target)
    )
  }

  return NextResponse.json({
    nodes,
    links,
  })
}
