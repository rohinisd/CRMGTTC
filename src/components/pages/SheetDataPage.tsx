import { useEffect, useMemo, useState } from 'react'
import { fetchGoogleSheetLeads, googleSheetCsvUrl } from '../../data/googleSheetLeads'
import type { FollowUpEntry, Lead } from '../../types/lead'
import { computeStats, getStatusBreakdown } from '../../utils/leadStats'
import { StatCard } from '../dashboard/StatCard'

type SheetDataPageProps = {
  pageId: string
}

type PageMeta = {
  title: string
  description: string
}

type GroupCount = {
  name: string
  value: number
}

type FollowUpTask = {
  lead: Lead
  label: string
  date: string
  remarks: string
}

const pageMeta: Record<string, PageMeta> = {
  leads: {
    title: 'Leads',
    description: 'Complete lead list mapped from the Google Sheet.',
  },
  'call-logs': {
    title: 'Call Logs',
    description: 'Follow-up and call activity from the sheet follow-up columns.',
  },
  tags: {
    title: 'Tags',
    description: 'Useful CRM tags generated from source, status, category, and course data.',
  },
  'auto-assign': {
    title: 'Auto-assign',
    description: 'Representative workload based on the Attended By column.',
  },
  calendar: {
    title: 'Calendar',
    description: 'Upcoming and historical follow-up dates from the sheet.',
  },
  analytics: {
    title: 'Analytics',
    description: 'Marketing and admission performance from live sheet data.',
  },
  tickets: {
    title: 'Tickets',
    description: 'Leads that need attention based on pending, follow-up, or unavailable statuses.',
  },
  invoices: {
    title: 'Invoices',
    description: 'Admission/course-completed leads that can be used for billing follow-up.',
  },
  'custom-fields': {
    title: 'Custom Fields',
    description: 'Current Google Sheet columns mapped into app fields.',
  },
  integrations: {
    title: 'Integrations',
    description: 'Google Sheet connection used by this CRM.',
  },
  'call-retention': {
    title: 'Call Retention',
    description: 'Contact quality, repeated numbers, and follow-up coverage.',
  },
}

const fieldMappings = [
  ['SL NO', 'slNo'],
  ['Attended By', 'attendedBy'],
  ['DATE', 'date'],
  ['SOURSE', 'source'],
  ['REFERED BY', 'referredBy'],
  ['STUDENT NAME', 'studentName'],
  ['CONTACT NO', 'contactNo'],
  ['CATEGORY', 'category'],
  ['QUALIFICATION', 'qualification'],
  ['Area With Place', 'areaWithPlace'],
  ['Course Name', 'courseName'],
  ['REMARKS', 'remarks'],
  ['STATUS', 'status'],
  ['REFERENCE COUNT', 'referenceCount'],
  ['Refollow up for cst', 'cstRefollowUp.date'],
  ['Follow up done on 10.07.25', 'followUpDone.date'],
  ['Refollowup date', 'refollowUp.date'],
  ['CST Refollowup date', 'cstRefollowUpDate.date'],
  ['CST 3rd Refollowup date', 'cst3rdRefollowUp.date'],
  ['4th Refollowup date', 'fourthRefollowUp.date'],
]

function titleFor(pageId: string): PageMeta {
  return pageMeta[pageId] ?? {
    title: pageId.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    description: 'Sheet-backed CRM data.',
  }
}

function formatDate(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN')
}

function groupBy(leads: Lead[], getValue: (lead: Lead) => string): GroupCount[] {
  const counts = new Map<string, number>()
  for (const lead of leads) {
    const key = getValue(lead) || 'Blank'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

function hasFollowUp(entry: FollowUpEntry): boolean {
  return Boolean(entry.date || entry.remarks)
}

function getFollowUpTasks(leads: Lead[]): FollowUpTask[] {
  const columns: { label: string; getEntry: (lead: Lead) => FollowUpEntry }[] = [
    { label: 'CST Refollow up', getEntry: (lead) => lead.cstRefollowUp },
    { label: 'Follow up done', getEntry: (lead) => lead.followUpDone },
    { label: 'Refollowup', getEntry: (lead) => lead.refollowUp },
    { label: 'CST Refollowup date', getEntry: (lead) => lead.cstRefollowUpDate },
    { label: 'CST 3rd Refollowup', getEntry: (lead) => lead.cst3rdRefollowUp },
    { label: '4th Refollowup', getEntry: (lead) => lead.fourthRefollowUp },
  ]

  return leads.flatMap((lead) =>
    columns
      .map(({ label, getEntry }) => {
        const entry = getEntry(lead)
        return {
          lead,
          label,
          date: entry.date,
          remarks: entry.remarks,
        }
      })
      .filter((task) => task.date || task.remarks),
  )
}

function latestLeads(leads: Lead[], count = 60): Lead[] {
  return [...leads]
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0
      const dateB = new Date(b.date).getTime() || 0
      return dateB - dateA
    })
    .slice(0, count)
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: (string | number)[][]
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell || '-'}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No sheet data found for this view.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function CountTable({ title, data }: { title: string; data: GroupCount[] }) {
  return (
    <section className="content-card">
      <h3>{title}</h3>
      <DataTable columns={['Name', 'Count']} rows={data.slice(0, 12).map((item) => [item.name, item.value])} />
    </section>
  )
}

function LeadsView({ leads }: { leads: Lead[] }) {
  return (
    <DataTable
      columns={['SL No', 'Date', 'Student', 'Contact', 'Course', 'Status', 'Attended By', 'Remarks']}
      rows={latestLeads(leads, 100).map((lead) => [
        lead.slNo,
        formatDate(lead.date),
        lead.studentName,
        lead.contactNo,
        lead.courseName,
        lead.status,
        lead.attendedBy,
        lead.remarks,
      ])}
    />
  )
}

function CallLogsView({ leads }: { leads: Lead[] }) {
  const tasks = getFollowUpTasks(leads)
  return (
    <DataTable
      columns={['Date', 'Student', 'Contact', 'Activity', 'Remarks', 'Attended By']}
      rows={tasks.slice(0, 150).map((task) => [
        formatDate(task.date),
        task.lead.studentName,
        task.lead.contactNo,
        task.label,
        task.remarks,
        task.lead.attendedBy,
      ])}
    />
  )
}

function TagsView({ leads }: { leads: Lead[] }) {
  return (
    <div className="content-grid content-grid--2">
      <CountTable title="Status Tags" data={getStatusBreakdown(leads)} />
      <CountTable title="Course Tags" data={groupBy(leads, (lead) => lead.courseName)} />
      <CountTable title="Source Tags" data={groupBy(leads, (lead) => lead.source)} />
      <CountTable title="Category Tags" data={groupBy(leads, (lead) => lead.category)} />
    </div>
  )
}

function AutoAssignView({ leads }: { leads: Lead[] }) {
  const byRep = groupBy(leads, (lead) => lead.attendedBy)
  return (
    <DataTable
      columns={['Representative', 'Assigned Leads', 'Suggested Action']}
      rows={byRep.map((rep, index) => [
        rep.name,
        rep.value,
        index === byRep.length - 1 ? 'Can receive more new leads' : 'Keep monitoring workload',
      ])}
    />
  )
}

function CalendarView({ leads }: { leads: Lead[] }) {
  const tasks = getFollowUpTasks(leads)
    .filter((task) => task.date)
    .sort((a, b) => (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0))

  return (
    <DataTable
      columns={['Date', 'Student', 'Contact', 'Event', 'Course', 'Remarks']}
      rows={tasks.slice(0, 150).map((task) => [
        formatDate(task.date),
        task.lead.studentName,
        task.lead.contactNo,
        task.label,
        task.lead.courseName,
        task.remarks,
      ])}
    />
  )
}

function AnalyticsView({ leads }: { leads: Lead[] }) {
  const stats = computeStats(leads)
  return (
    <>
      <div className="stat-grid stat-grid--4">
        <StatCard label="Total Leads" value={stats.totalLeads} highlight />
        <StatCard label="Converted Leads" value={stats.convertedLeads} highlight />
        <StatCard label="Pending Leads" value={stats.pendingLeads} highlight />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} highlight />
      </div>
      <div className="content-grid content-grid--2">
        <CountTable title="Top Sources" data={groupBy(leads, (lead) => lead.source)} />
        <CountTable title="Top Courses" data={groupBy(leads, (lead) => lead.courseName)} />
        <CountTable title="Representative Performance" data={groupBy(leads, (lead) => lead.attendedBy)} />
        <CountTable title="Qualification Mix" data={groupBy(leads, (lead) => lead.qualification)} />
      </div>
    </>
  )
}

function TicketsView({ leads }: { leads: Lead[] }) {
  const tickets = leads.filter((lead) => /pending|follow up|not available|not received|enquiry/i.test(lead.status))
  return (
    <DataTable
      columns={['Priority', 'Student', 'Contact', 'Status', 'Course', 'Issue / Remarks']}
      rows={latestLeads(tickets, 120).map((lead) => [
        /pending|follow up/i.test(lead.status) ? 'High' : 'Normal',
        lead.studentName,
        lead.contactNo,
        lead.status,
        lead.courseName,
        lead.remarks,
      ])}
    />
  )
}

function InvoicesView({ leads }: { leads: Lead[] }) {
  const invoiceReady = leads.filter((lead) => /admission completed|course completed|converted/i.test(lead.status))
  return (
    <>
      <div className="sheet-note">
        The connected sheet does not include a fee or invoice amount column yet, so this view lists admission/course
        completed leads that can be billed once an amount field is added.
      </div>
      <DataTable
        columns={['Student', 'Contact', 'Course', 'Status', 'Invoice Amount', 'Remarks']}
        rows={latestLeads(invoiceReady, 120).map((lead) => [
          lead.studentName,
          lead.contactNo,
          lead.courseName,
          lead.status,
          'Amount column not in sheet',
          lead.remarks,
        ])}
      />
    </>
  )
}

function CustomFieldsView() {
  return <DataTable columns={['Google Sheet Column', 'App Field']} rows={fieldMappings} />
}

function IntegrationsView({ leads, error }: { leads: Lead[]; error: string | null }) {
  return (
    <div className="content-grid content-grid--2">
      <section className="content-card">
        <h3>Google Sheet</h3>
        <p className="content-card__metric">{error ? 'Disconnected' : 'Connected'}</p>
        <p className="content-card__muted">
          {error ? error : `${leads.length.toLocaleString('en-IN')} rows loaded from the configured sheet.`}
        </p>
        <a href={googleSheetCsvUrl} target="_blank" rel="noreferrer">
          Open CSV feed
        </a>
      </section>
      <section className="content-card">
        <h3>Mapped Sheet ID</h3>
        <p className="content-card__muted">1VlHAfjQwTBBleJhRKLNmPbWqJxHGdm5YmoB4jE0JGHI</p>
      </section>
    </div>
  )
}

function CallRetentionView({ leads }: { leads: Lead[] }) {
  const contacts = groupBy(leads, (lead) => lead.contactNo).filter((item) => item.name !== 'Blank')
  const duplicateContacts = contacts.filter((item) => item.value > 1)
  const withFollowUps = leads.filter((lead) =>
    [
      lead.cstRefollowUp,
      lead.followUpDone,
      lead.refollowUp,
      lead.cstRefollowUpDate,
      lead.cst3rdRefollowUp,
      lead.fourthRefollowUp,
    ].some(hasFollowUp),
  )

  return (
    <>
      <div className="stat-grid stat-grid--3">
        <StatCard label="Contacts Available" value={contacts.length} highlight />
        <StatCard label="Duplicate Contacts" value={duplicateContacts.length} highlight />
        <StatCard label="Leads With Follow-up" value={withFollowUps.length} highlight />
      </div>
      <DataTable
        columns={['Contact No', 'Lead Count', 'Retention Note']}
        rows={duplicateContacts.slice(0, 100).map((item) => [
          item.name,
          item.value,
          'Multiple sheet rows use this number',
        ])}
      />
    </>
  )
}

function renderPage(pageId: string, leads: Lead[], error: string | null) {
  switch (pageId) {
    case 'leads':
      return <LeadsView leads={leads} />
    case 'call-logs':
      return <CallLogsView leads={leads} />
    case 'tags':
      return <TagsView leads={leads} />
    case 'auto-assign':
      return <AutoAssignView leads={leads} />
    case 'calendar':
      return <CalendarView leads={leads} />
    case 'analytics':
      return <AnalyticsView leads={leads} />
    case 'tickets':
      return <TicketsView leads={leads} />
    case 'invoices':
      return <InvoicesView leads={leads} />
    case 'custom-fields':
      return <CustomFieldsView />
    case 'integrations':
      return <IntegrationsView leads={leads} error={error} />
    case 'call-retention':
      return <CallRetentionView leads={leads} />
    default:
      return <LeadsView leads={leads} />
  }
}

export function SheetDataPage({ pageId }: SheetDataPageProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const meta = titleFor(pageId)

  useEffect(() => {
    let cancelled = false

    fetchGoogleSheetLeads()
      .then((sheetLeads) => {
        if (!cancelled) setLeads(sheetLeads)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load Google Sheet data')
        setLeads([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const content = useMemo(() => renderPage(pageId, leads, error), [pageId, leads, error])

  return (
    <div className="sheet-page">
      <div className="dashboard__header">
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
      </div>

      <div className={`sheet-status ${error ? 'sheet-status--error' : ''}`}>
        <span>
          {loading
            ? 'Loading Google Sheet data...'
            : error
              ? `Could not load Google Sheet data: ${error}`
              : `Loaded ${leads.length.toLocaleString('en-IN')} rows from Google Sheet`}
        </span>
      </div>

      {content}
    </div>
  )
}
