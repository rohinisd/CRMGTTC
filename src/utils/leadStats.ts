import type { Lead, ViewMode } from '../types/lead'

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isSameMonth(a: Date, year: number, month: number) {
  return a.getFullYear() === year && a.getMonth() === month
}

function isSameYear(a: Date, year: number) {
  return a.getFullYear() === year
}

export function filterLeads(
  leads: Lead[],
  viewMode: ViewMode,
  year: number,
  month: number,
  representative: string,
): Lead[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return leads.filter((lead) => {
    const d = parseDate(lead.date)
    if (!d) return false
    if (representative !== 'All' && lead.attendedBy !== representative) return false

    switch (viewMode) {
      case 'Daily':
        return isSameDay(d, today) && d.getFullYear() === year
      case 'Monthly':
        return isSameMonth(d, year, month)
      case 'Yearly':
        return isSameYear(d, year)
      default:
        return true
    }
  })
}

export function countLeadsByPeriod(leads: Lead[], year: number) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let todayCount = 0
  let yesterdayCount = 0
  let monthCount = 0
  let yearCount = 0

  for (const lead of leads) {
    const d = parseDate(lead.date)
    if (!d) continue
    if (isSameDay(d, today)) todayCount++
    if (isSameDay(d, yesterday)) yesterdayCount++
    if (isSameMonth(d, now.getFullYear(), now.getMonth())) monthCount++
    if (isSameYear(d, year)) yearCount++
  }

  return { todayCount, yesterdayCount, monthCount, yearCount }
}

export function computeStats(leads: Lead[]) {
  const converted = leads.filter((l) => /converted|admission completed|course completed/i.test(l.status))
  const pending = leads.filter((l) => /pending|enquiry|follow up/i.test(l.status))
  const siteVisit = leads.filter((l) => /site visit/i.test(l.status))
  const totalEarnings = leads.reduce((sum, l) => sum + (l.earnings ?? 0), 0)
  const expectedEarnings = pending.length * 10000
  const conversionRate = leads.length > 0 ? (converted.length / leads.length) * 100 : 0

  return {
    totalLeads: leads.length,
    convertedLeads: converted.length,
    pendingLeads: pending.length,
    siteVisitLeads: siteVisit.length,
    totalEarnings,
    expectedEarnings,
    conversionRate,
  }
}

export function getStatusBreakdown(leads: Lead[]) {
  const counts: Record<string, number> = {}
  for (const lead of leads) {
    counts[lead.status] = (counts[lead.status] ?? 0) + 1
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

export function getMonthlyLeadSummary(leads: Lead[], year: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months.map((month, idx) => {
    const monthLeads = leads.filter((l) => {
      const d = parseDate(l.date)
      return d && isSameMonth(d, year, idx)
    })
    const earnings = monthLeads.reduce((sum, l) => sum + (l.earnings ?? 0), 0)
    return { month, leads: monthLeads.length, earnings }
  })
}

export function getRepresentatives(leads: Lead[]): string[] {
  const reps = new Set(leads.map((l) => l.attendedBy))
  return ['All', ...Array.from(reps).sort()]
}
