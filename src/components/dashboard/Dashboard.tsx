import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGoogleSheetLeads } from '../../data/googleSheetLeads'
import type { Lead, ViewMode } from '../../types/lead'
import {
  computeStats,
  countLeadsByPeriod,
  filterLeads,
  getMonthlyLeadSummary,
  getRepresentatives,
  getSourceBreakdown,
  getStatusBreakdown,
} from '../../utils/leadStats'
import { LeadBarChart } from '../charts/LeadBarChart'
import { StatusPieChart } from '../charts/StatusPieChart'
import { StatCard } from './StatCard'

const currentYear = new Date().getFullYear()

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function getLeadYear(lead: Lead): number | null {
  const date = new Date(lead.date)
  return Number.isNaN(date.getTime()) ? null : date.getFullYear()
}

function SourceBreakdownCard({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const topSources = data.slice(0, 10)

  return (
    <section className="content-card source-breakdown-card">
      <h3>Lead Source Breakdown</h3>
      <p className="content-card__muted">Counts from the sheet SOURCE column for the selected dashboard filters.</p>
      <div className="source-breakdown-list">
        {topSources.length > 0 ? (
          topSources.map((source) => {
            const percent = total > 0 ? (source.value / total) * 100 : 0

            return (
              <div key={source.name} className="source-breakdown-row">
                <div className="source-breakdown-row__meta">
                  <strong>{source.name}</strong>
                  <span>
                    {source.value.toLocaleString('en-IN')} leads · {percent.toFixed(1)}%
                  </span>
                </div>
                <div className="source-breakdown-row__bar" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })
        ) : (
          <p className="content-card__muted">No source data found for this filter.</p>
        )}
      </div>
    </section>
  )
}

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('Yearly')
  const [year, setYear] = useState(currentYear)
  const [representative, setRepresentative] = useState('All')

  const loadSheetLeads = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setLeads(await fetchGoogleSheetLeads())
    } catch (err) {
      setLeads([])
      setError(err instanceof Error ? err.message : 'Unable to load Google Sheet data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchGoogleSheetLeads()
      .then((sheetLeads) => {
        if (!cancelled) setLeads(sheetLeads)
      })
      .catch((err) => {
        if (cancelled) return
        setLeads([])
        setError(err instanceof Error ? err.message : 'Unable to load Google Sheet data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const years = useMemo(() => {
    const sheetYears = Array.from(
      new Set(leads.map(getLeadYear).filter((value): value is number => value !== null)),
    ).sort((a, b) => b - a)

    return sheetYears.length > 0 ? sheetYears : [currentYear]
  }, [leads])

  const selectedYear = years.includes(year) ? year : years[0]

  const representatives = useMemo(() => getRepresentatives(leads), [leads])

  const periodCounts = useMemo(() => countLeadsByPeriod(leads, selectedYear), [leads, selectedYear])

  const filteredLeads = useMemo(
    () => filterLeads(leads, viewMode, selectedYear, new Date().getMonth(), representative),
    [leads, viewMode, selectedYear, representative],
  )

  const stats = useMemo(() => computeStats(filteredLeads), [filteredLeads])
  const statusBreakdown = useMemo(() => getStatusBreakdown(filteredLeads), [filteredLeads])
  const sourceBreakdown = useMemo(() => getSourceBreakdown(filteredLeads), [filteredLeads])
  const topSources = sourceBreakdown.slice(0, 4)
  const monthlySummary = useMemo(
    () => getMonthlyLeadSummary(filteredLeads, selectedYear),
    [filteredLeads, selectedYear],
  )

  const yearlyStats = useMemo(
    () => computeStats(filterLeads(leads, 'Yearly', selectedYear, 0, 'All')),
    [leads, selectedYear],
  )

  const earningsToday = useMemo(() => {
    const today = new Date()
    return leads
      .filter((l) => {
        const d = new Date(l.date)
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        )
      })
      .reduce((sum, l) => sum + (l.earnings ?? 0), 0)
  }, [leads])

  const earningsMonthly = useMemo(() => {
    const now = new Date()
    return leads
      .filter((l) => {
        const d = new Date(l.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, l) => sum + (l.earnings ?? 0), 0)
  }, [leads])

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Admin Dashboard</h1>
        <p>Centralized performance and lead analytics from the connected Google Sheet</p>
      </div>

      <div className={`sheet-status ${error ? 'sheet-status--error' : ''}`}>
        <span>
          {loading
            ? 'Loading Google Sheet data...'
            : error
              ? `Could not load Google Sheet data: ${error}`
              : `Loaded ${leads.length.toLocaleString('en-IN')} rows from Google Sheet`}
        </span>
        <button type="button" onClick={loadSheetLeads} disabled={loading}>
          Refresh Sheet
        </button>
      </div>

      <div className="stat-grid stat-grid--4">
        <StatCard label="Today Leads" value={periodCounts.todayCount} />
        <StatCard label="Yesterday Leads" value={periodCounts.yesterdayCount} />
        <StatCard label="This Month" value={periodCounts.monthCount} />
        <StatCard label="This Year" value={periodCounts.yearCount} />
      </div>

      <div className="stat-grid stat-grid--4">
        <StatCard label="Yearly Conversion Rate" value={formatPercent(yearlyStats.conversionRate)} />
        <StatCard label="Earnings Today (₹)" value={formatCurrency(earningsToday)} />
        <StatCard label="Earnings Monthly (₹)" value={formatCurrency(earningsMonthly)} />
        <StatCard label="Earnings Yearly (₹)" value={formatCurrency(yearlyStats.totalEarnings)} />
      </div>

      <div className="dashboard__filters">
        <div className="filter-group">
          <label htmlFor="view-mode">View Mode</label>
          <select id="view-mode" value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="Daily">Daily</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="select-year">Select Year</label>
          <select id="select-year" value={selectedYear} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="representative">Representative</label>
          <select
            id="representative"
            value={representative}
            onChange={(e) => setRepresentative(e.target.value)}
          >
            {representatives.map((rep) => (
              <option key={rep} value={rep}>
                {rep === 'All' ? 'All Representatives' : rep}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stat-grid stat-grid--4">
        <StatCard label="Total Leads" value={stats.totalLeads} highlight />
        <StatCard label="Converted Leads" value={stats.convertedLeads} highlight />
        <StatCard label="Pending Leads" value={stats.pendingLeads} highlight />
        <StatCard label="In Site Visit" value={stats.siteVisitLeads} highlight />
      </div>

      <div className="stat-grid stat-grid--3">
        <StatCard label="Total Earnings (₹)" value={formatCurrency(stats.totalEarnings)} highlight />
        <StatCard label="Expected Earnings (₹)" value={formatCurrency(stats.expectedEarnings)} highlight />
        <StatCard label="Conversion Rate" value={formatPercent(stats.conversionRate)} highlight />
      </div>

      <div className="stat-grid stat-grid--4">
        {topSources.length > 0 ? (
          topSources.map((source) => <StatCard key={source.name} label={`${source.name} Leads`} value={source.value} />)
        ) : (
          <StatCard label="Source Data" value="0" />
        )}
      </div>

      <div className="dashboard__charts">
        <LeadBarChart data={monthlySummary} />
        <StatusPieChart data={statusBreakdown} />
      </div>

      <div className="dashboard__insights">
        <SourceBreakdownCard data={sourceBreakdown} />
      </div>
    </div>
  )
}
