// Types for graph data
export interface Node {
  id: string
  group: number
  label?: string
}

export interface Link {
  source: string
  target: string
  value: number
}

export interface GraphData {
  nodes: Node[]
  links: Link[]
}

export const groupLabels: Record<number, string> = {
  1: "Commissioners",
  2: "MEPs (EPP)",
  3: "MEPs (S&D)",
  4: "MEPs (Renew)",
  5: "MEPs (Greens)",
  6: "Lobbyists"
}

export const groupColors: Record<number, string> = {
  1: "#DC2626",  // Red for Commissioners
  2: "#1E40AF",  // Deep blue for EPP
  3: "#F59E0B",  // Amber for S&D
  4: "#0891B2",  // Cyan for Renew
  5: "#16A34A",  // Green for Greens
  6: "#7C3AED"   // Violet for Lobbyists
}

/**
 * Fetch graph data from the API
 * @param groupFilter - Optional group number to filter by
 */
export async function fetchGraphData(groupFilter?: number | null): Promise<GraphData> {
  const params = new URLSearchParams()
  if (groupFilter !== null && groupFilter !== undefined) {
    params.set('group', String(groupFilter))
  }

  const url = `/api/graph${params.toString() ? `?${params}` : ''}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch graph data:', error)
    // Return empty data on error
    return { nodes: [], links: [] }
  }
}

// Fallback mock data for local development without API
export const mockData: GraphData = {
  nodes: [
    { id: "Commissioner_A", label: "Ursula von der Leyen", group: 1 },
    { id: "Commissioner_B", label: "Margrethe Vestager", group: 1 },
    { id: "Commissioner_C", label: "Thierry Breton", group: 1 },
    { id: "MEP_EPP_1", label: "Manfred Weber", group: 2 },
    { id: "MEP_EPP_2", label: "Siegfried Mureșan", group: 2 },
    { id: "MEP_EPP_3", label: "Dolors Montserrat", group: 2 },
    { id: "MEP_SD_1", label: "Iratxe García", group: 3 },
    { id: "MEP_SD_2", label: "Heléne Fritzon", group: 3 },
    { id: "MEP_Renew_1", label: "Stéphane Séjourné", group: 4 },
    { id: "MEP_Renew_2", label: "Sophie in 't Veld", group: 4 },
    { id: "MEP_Greens_1", label: "Philippe Lamberts", group: 5 },
    { id: "MEP_Greens_2", label: "Ska Keller", group: 5 },
    { id: "Lobbyist_A", label: "BusinessEurope", group: 6 },
    { id: "Lobbyist_B", label: "DigitalEurope", group: 6 },
    { id: "Lobbyist_C", label: "ETUC", group: 6 },
  ],
  links: [
    { source: "Commissioner_A", target: "MEP_EPP_1", value: 8 },
    { source: "Commissioner_A", target: "MEP_EPP_2", value: 5 },
    { source: "Commissioner_A", target: "MEP_SD_1", value: 3 },
    { source: "Commissioner_A", target: "MEP_Renew_1", value: 4 },
    { source: "Commissioner_B", target: "MEP_EPP_1", value: 3 },
    { source: "Commissioner_B", target: "MEP_Renew_1", value: 6 },
    { source: "Commissioner_B", target: "MEP_Greens_1", value: 4 },
    { source: "Commissioner_C", target: "MEP_EPP_2", value: 4 },
    { source: "Commissioner_C", target: "MEP_Renew_2", value: 3 },
    { source: "MEP_EPP_1", target: "MEP_EPP_2", value: 7 },
    { source: "MEP_EPP_2", target: "MEP_EPP_3", value: 5 },
    { source: "MEP_EPP_1", target: "MEP_EPP_3", value: 4 },
    { source: "MEP_SD_1", target: "MEP_SD_2", value: 6 },
    { source: "MEP_Renew_1", target: "MEP_Renew_2", value: 5 },
    { source: "MEP_Greens_1", target: "MEP_Greens_2", value: 4 },
    { source: "MEP_EPP_1", target: "MEP_SD_1", value: 2 },
    { source: "MEP_Renew_1", target: "MEP_Greens_1", value: 3 },
    { source: "Lobbyist_A", target: "Commissioner_A", value: 5 },
    { source: "Lobbyist_A", target: "Commissioner_B", value: 3 },
    { source: "Lobbyist_A", target: "MEP_EPP_1", value: 4 },
    { source: "Lobbyist_B", target: "Commissioner_B", value: 4 },
    { source: "Lobbyist_B", target: "Commissioner_C", value: 3 },
    { source: "Lobbyist_B", target: "MEP_Renew_1", value: 2 },
    { source: "Lobbyist_C", target: "MEP_SD_1", value: 3 },
    { source: "Lobbyist_C", target: "MEP_Greens_1", value: 2 },
    { source: "Commissioner_A", target: "Lobbyist_C", value: 2 },
  ]
}
