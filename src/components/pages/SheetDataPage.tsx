import { useEffect, useMemo, useState } from 'react'
import { fetchGoogleSheetLeads, googleSheetCsvUrl } from '../../data/googleSheetLeads'
import type { FollowUpAttempt, FollowUpEntry, Lead } from '../../types/lead'
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
  attempt: number
  label: string
  date: string
  remarks: string
}

type CalendarStatus = 'All' | 'Today' | 'Scheduled / Planned' | 'Overdue' | 'Completed'

type AnalyticsSection = {
  id: string
  title: string
  getValue: (lead: Lead) => string
}

type AnalyticsSelection = {
  sectionId: string
  value: string
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
  'seven-follow-ups': {
    title: '7 Follow-ups',
    description: 'Track up to 7 follow-up attempts, reminders, remarks, and lead closure readiness.',
  },
}

const knownFieldByColumnIndex: Record<number, string> = {
  0: 'slNo',
  1: 'attendedBy',
  2: 'date',
  3: 'source',
  4: 'referredBy',
  5: 'studentName',
  6: 'contactNo',
  7: 'category',
  8: 'qualification',
  9: 'areaWithPlace',
  10: 'courseName',
  11: 'remarks',
  12: 'status',
  13: 'referenceCount',
  14: 'cstRefollowUp.date',
  15: 'cstRefollowUp.remarks',
  16: 'followUpDone.date',
  17: 'followUpDone.remarks',
  18: 'refollowUp.date',
  19: 'refollowUp.remarks',
  20: 'cstRefollowUpDate.date',
  21: 'cstRefollowUpDate.remarks',
  22: 'cst3rdRefollowUp.date',
  23: 'cst3rdRefollowUp.remarks',
  24: 'fourthRefollowUp.date',
  25: 'fourthRefollowUp.remarks',
  26: 'seventhFollowUp.date',
  27: 'seventhFollowUp.remarks',
}

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

function isValidDateValue(value: string): boolean {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function calendarStatus(task: FollowUpTask): Exclude<CalendarStatus, 'All'> {
  if (/follow up done/i.test(task.label)) return 'Completed'

  const taskDate = startOfDay(new Date(task.date))
  const today = startOfDay(new Date())

  if (taskDate.getTime() === today.getTime()) return 'Today'
  if (taskDate.getTime() > today.getTime()) return 'Scheduled / Planned'
  return 'Overdue'
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

function leadFollowUps(lead: Lead): FollowUpAttempt[] {
  if (lead.followUps?.length) return lead.followUps

  return [
    { attempt: 1, label: '1st Follow-up', ...lead.cstRefollowUp },
    { attempt: 2, label: '2nd Follow-up', ...lead.followUpDone },
    { attempt: 3, label: '3rd Follow-up', ...lead.refollowUp },
    { attempt: 4, label: '4th Follow-up', ...lead.cstRefollowUpDate },
    { attempt: 5, label: '5th Follow-up', ...lead.cst3rdRefollowUp },
    { attempt: 6, label: '6th Follow-up', ...lead.fourthRefollowUp },
    { attempt: 7, label: '7th Follow-up', ...(lead.seventhFollowUp ?? { date: '', remarks: '' }) },
  ]
}

function completedFollowUpCount(lead: Lead): number {
  return leadFollowUps(lead).filter(hasFollowUp).length
}

function latestFollowUp(lead: Lead): FollowUpAttempt | undefined {
  return [...leadFollowUps(lead)].reverse().find(hasFollowUp)
}

function leadTextForClosure(lead: Lead): string {
  return [
    lead.status,
    lead.remarks,
    ...leadFollowUps(lead).map((entry) => entry.remarks),
  ].join(' ')
}

function leadClosureReason(lead: Lead): string {
  const text = leadTextForClosure(lead)

  if (/admission\s+completed|course\s+completed|converted|joined|join/i.test(text)) return 'Closed - Joined'
  if (/not\s+interested|do\s*not\s*call|dont\s*call|don't\s*call|no\s+need|not\s+required|declined/i.test(text)) {
    return 'Closed - Not interested'
  }
  if (completedFollowUpCount(lead) >= 7) return 'Can close - 7 attempts done'
  return ''
}

function isLeadClosed(lead: Lead): boolean {
  return Boolean(leadClosureReason(lead))
}

function nextReminder(lead: Lead): FollowUpAttempt | undefined {
  if (isLeadClosed(lead)) return undefined

  const today = startOfDay(new Date()).getTime()
  const validReminders = leadFollowUps(lead)
    .filter((entry) => isValidDateValue(entry.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const upcomingReminder = validReminders.find((entry) => startOfDay(new Date(entry.date)).getTime() >= today)

  return upcomingReminder ?? validReminders.at(-1)
}

function followUpStage(lead: Lead): string {
  const closureReason = leadClosureReason(lead)
  if (closureReason) return closureReason

  const done = completedFollowUpCount(lead)
  const nextAttempt = Math.min(done + 1, 7)
  return `Follow-up ${nextAttempt} of 7`
}

function reminderLabel(lead: Lead): string {
  const reminder = nextReminder(lead)
  if (reminder) return `${formatDate(reminder.date)} (${reminder.label})`
  if (isLeadClosed(lead)) return '-'
  return 'Set reminder'
}

function getFollowUpTasks(leads: Lead[]): FollowUpTask[] {
  return leads.flatMap((lead) =>
    leadFollowUps(lead)
      .map((entry) => ({
        lead,
        attempt: entry.attempt,
        label: entry.label,
        date: entry.date,
        remarks: entry.remarks,
      }))
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

function searchableLeadText(lead: Lead): string {
  return [
    lead.slNo,
    lead.date,
    lead.attendedBy,
    lead.source,
    lead.referredBy,
    lead.studentName,
    lead.contactNo,
    lead.category,
    lead.qualification,
    lead.areaWithPlace,
    lead.courseName,
    lead.remarks,
    lead.status,
    lead.referenceCount,
    ...leadFollowUps(lead).flatMap((entry) => [entry.date, entry.remarks]),
    ...Object.values(lead.customFields ?? {}),
  ]
    .join(' ')
    .toLowerCase()
}

function formatCustomFields(lead: Lead): string {
  const entries = Object.entries(lead.customFields ?? {})
  if (entries.length === 0) return ''
  return entries.map(([field, value]) => `${field}: ${value}`).join(' | ')
}

function LeadsView({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const query = search.trim().toLowerCase()
  const sortedLeads = [...leads].sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0
    const dateB = new Date(b.date).getTime() || 0
    return dateB - dateA || a.slNo - b.slNo
  })
  const filteredLeads = sortedLeads.filter((lead) => {
    const matchesSearch = query ? searchableLeadText(lead).includes(query) : true
    const matchesDate = selectedDate ? lead.date === selectedDate : true
    return matchesSearch && matchesDate
  })

  return (
    <>
      <div className="lead-toolbar">
        <div className="lead-search">
          <label htmlFor="lead-search">Search Leads</label>
          <input
            id="lead-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, course, status, remarks..."
          />
        </div>
        <div className="lead-search lead-search--date">
          <label htmlFor="lead-date">Select Date</label>
          <input
            id="lead-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <span>
            Showing {filteredLeads.length.toLocaleString('en-IN')} of {leads.length.toLocaleString('en-IN')} leads
          </span>
          <button type="button" onClick={() => setSelectedDate('')}>
            Show All Dates
          </button>
        </div>
      </div>

      <DataTable
        columns={[
          'SL No',
          'Date',
          'Student',
          'Contact',
          'Course',
          'Status',
          'Follow-up Stage',
          'Next Reminder',
          'Attended By',
          'Remarks',
          'Custom Fields',
        ]}
        rows={filteredLeads.map((lead) => [
          lead.slNo,
          formatDate(lead.date),
          lead.studentName,
          lead.contactNo,
          lead.courseName,
          lead.status,
          followUpStage(lead),
          reminderLabel(lead),
          lead.attendedBy,
          lead.remarks,
          formatCustomFields(lead),
        ])}
      />
    </>
  )
}

function CallLogsView({ leads }: { leads: Lead[] }) {
  const tasks = getFollowUpTasks(leads)
    .filter((task) => task.date)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0
      const dateB = new Date(b.date).getTime() || 0
      return dateB - dateA || a.lead.slNo - b.lead.slNo
    })
  const availableDates = Array.from(new Set(tasks.map((task) => task.date)))
  const [selectedDate, setSelectedDate] = useState(availableDates[0] ?? '')
  const filteredTasks = selectedDate ? tasks.filter((task) => task.date === selectedDate) : tasks

  return (
    <>
      <div className="lead-toolbar">
        <div className="lead-search">
          <label htmlFor="call-log-date">Select Date</label>
          <input
            id="call-log-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <span>
            Showing {filteredTasks.length.toLocaleString('en-IN')} of {tasks.length.toLocaleString('en-IN')} dated call
            logs
          </span>
          <button type="button" onClick={() => setSelectedDate('')}>
            Show All Dates
          </button>
        </div>
      </div>

      <DataTable
        columns={['Date', 'Student', 'Contact', 'Attempt', 'Activity', 'Remarks', 'Attended By']}
        rows={filteredTasks.map((task) => [
          formatDate(task.date),
          task.lead.studentName,
          task.lead.contactNo,
          `${task.attempt} of 7`,
          task.label,
          task.remarks,
          task.lead.attendedBy,
        ])}
      />
    </>
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
  const maxAssigned = byRep[0]?.value ?? 0

  function workloadStatus(assignedLeads: number): string {
    if (maxAssigned === 0) return 'No workload'
    if (assignedLeads >= maxAssigned * 0.75) return 'High workload'
    if (assignedLeads >= maxAssigned * 0.35) return 'Medium workload'
    return 'Low workload - can assign more leads'
  }

  return (
    <DataTable
      columns={['Representative', 'Assigned Leads', 'Workload Status']}
      rows={byRep.map((rep) => [
        rep.name,
        rep.value,
        workloadStatus(rep.value),
      ])}
    />
  )
}

function CalendarView({ leads }: { leads: Lead[] }) {
  const tasks = getFollowUpTasks(leads)
    .filter((task) => isValidDateValue(task.date))
    .sort((a, b) => (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0))
  const availableDates = Array.from(new Set(tasks.map((task) => task.date)))
  const [selectedDate, setSelectedDate] = useState(availableDates[0] ?? '')
  const [selectedStatus, setSelectedStatus] = useState<CalendarStatus>('All')
  const statusOptions: CalendarStatus[] = ['All', 'Today', 'Scheduled / Planned', 'Overdue', 'Completed']
  const filteredTasks = tasks.filter((task) => {
    const matchesDate = selectedDate ? task.date === selectedDate : true
    const matchesStatus = selectedStatus === 'All' ? true : calendarStatus(task) === selectedStatus
    return matchesDate && matchesStatus
  })

  return (
    <>
      <div className="lead-toolbar">
        <div className="lead-search">
          <label htmlFor="calendar-date">Select Date</label>
          <input
            id="calendar-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <span>
            Showing {filteredTasks.length.toLocaleString('en-IN')} of {tasks.length.toLocaleString('en-IN')} valid
            calendar events
          </span>
          <button type="button" onClick={() => setSelectedDate('')}>
            Show All Dates
          </button>
        </div>
      </div>

      <div className="status-filter">
        {statusOptions.map((status) => {
          const count = status === 'All' ? tasks.length : tasks.filter((task) => calendarStatus(task) === status).length

          return (
            <button
              key={status}
              type="button"
              className={selectedStatus === status ? 'status-filter__button--active' : ''}
              onClick={() => setSelectedStatus(status)}
            >
              {status}
              <span>{count.toLocaleString('en-IN')}</span>
            </button>
          )
        })}
      </div>

      <DataTable
        columns={['Date', 'Status', 'Student', 'Contact', 'Attempt', 'Event', 'Course', 'Remarks']}
        rows={filteredTasks.map((task) => [
          formatDate(task.date),
          calendarStatus(task),
          task.lead.studentName,
          task.lead.contactNo,
          `${task.attempt} of 7`,
          task.label,
          task.lead.courseName,
          task.remarks,
        ])}
      />
    </>
  )
}

function AnalyticsCountTable({
  section,
  data,
  selectedValue,
  onSelect,
}: {
  section: AnalyticsSection
  data: GroupCount[]
  selectedValue?: string
  onSelect: (selection: AnalyticsSelection) => void
}) {
  return (
    <section className="content-card">
      <h3>{section.title}</h3>
      <div className="data-table-wrap data-table-wrap--compact">
        <table className="data-table analytics-count-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 12).map((item) => (
              <tr key={item.name}>
                <td>
                  <button
                    type="button"
                    className={selectedValue === item.name ? 'analytics-count-table__button--active' : ''}
                    onClick={() => onSelect({ sectionId: section.id, value: item.name })}
                  >
                    {item.name}
                  </button>
                </td>
                <td>{item.value.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AnalyticsView({ leads }: { leads: Lead[] }) {
  const [selection, setSelection] = useState<AnalyticsSelection | null>(null)
  const stats = computeStats(leads)
  const sections: AnalyticsSection[] = [
    { id: 'source', title: 'Top Sources', getValue: (lead) => lead.source },
    { id: 'course', title: 'Top Courses', getValue: (lead) => lead.courseName },
    { id: 'representative', title: 'Representative Performance', getValue: (lead) => lead.attendedBy },
    { id: 'qualification', title: 'Qualification Mix', getValue: (lead) => lead.qualification },
  ]
  const selectedSection = selection ? sections.find((section) => section.id === selection.sectionId) : undefined
  const selectedLeads =
    selection && selectedSection
      ? leads.filter((lead) => (selectedSection.getValue(lead) || 'Blank') === selection.value)
      : []

  return (
    <>
      <div className="stat-grid stat-grid--4">
        <StatCard label="Total Leads" value={stats.totalLeads} highlight />
        <StatCard label="Converted Leads" value={stats.convertedLeads} highlight />
        <StatCard label="Pending Leads" value={stats.pendingLeads} highlight />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} highlight />
      </div>
      <div className="content-grid content-grid--2">
        {sections.map((section) => (
          <AnalyticsCountTable
            key={section.id}
            section={section}
            data={groupBy(leads, section.getValue)}
            selectedValue={selection?.sectionId === section.id ? selection.value : undefined}
            onSelect={setSelection}
          />
        ))}
      </div>

      {selection && selectedSection && (
        <section className="content-card">
          <div className="analytics-detail-header">
            <div>
              <h3>
                {selection.value} - {selectedSection.title}
              </h3>
              <p className="content-card__muted">
                Showing {selectedLeads.length.toLocaleString('en-IN')} matching leads.
              </p>
            </div>
            <button type="button" onClick={() => setSelection(null)}>
              Clear Selection
            </button>
          </div>
          <DataTable
            columns={['Date', 'Student', 'Contact', 'Course', 'Source', 'Qualification', 'Status', 'Remarks']}
            rows={latestLeads(selectedLeads, 200).map((lead) => [
              formatDate(lead.date),
              lead.studentName,
              lead.contactNo,
              lead.courseName,
              lead.source,
              lead.qualification,
              lead.status,
              lead.remarks,
            ])}
          />
        </section>
      )}
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

function CustomFieldsView({ leads }: { leads: Lead[] }) {
  const sheetColumns = leads[0]?.sheetColumns ?? []
  const customHeaders = new Set(leads.flatMap((lead) => Object.keys(lead.customFields ?? {})))
  const columns = [...sheetColumns]

  for (const header of customHeaders) {
    if (!columns.includes(header)) columns.push(header)
  }

  const rows = columns
    .filter((column) => column.trim())
    .map((column, index) => {
      const appField = knownFieldByColumnIndex[index] ?? `customFields.${column}`
      const fieldType = knownFieldByColumnIndex[index] ? 'Mapped field' : 'Auto custom field'
      return [column, appField, fieldType]
    })

  return <DataTable columns={['Google Sheet Column', 'App Field', 'Type']} rows={rows} />
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
    leadFollowUps(lead).some(hasFollowUp),
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

type FollowUpWorkStatus = 'All' | 'Due Today' | 'Overdue' | 'Waiting Reminder' | 'Ready To Close'

function followUpWorkStatus(lead: Lead): Exclude<FollowUpWorkStatus, 'All'> {
  if (isLeadClosed(lead)) return 'Ready To Close'

  const reminder = nextReminder(lead)
  if (!reminder) return 'Waiting Reminder'

  const reminderDate = startOfDay(new Date(reminder.date))
  const today = startOfDay(new Date())

  if (reminderDate.getTime() === today.getTime()) return 'Due Today'
  if (reminderDate.getTime() < today.getTime()) return 'Overdue'
  return 'Waiting Reminder'
}

function SevenFollowUpsView({ leads }: { leads: Lead[] }) {
  const [selectedStatus, setSelectedStatus] = useState<FollowUpWorkStatus>('All')
  const statusOptions: FollowUpWorkStatus[] = ['All', 'Due Today', 'Overdue', 'Waiting Reminder', 'Ready To Close']
  const activeLeads = leads.filter((lead) => completedFollowUpCount(lead) > 0 || /pending|enquiry|follow up/i.test(lead.status))
  const filteredLeads = activeLeads
    .filter((lead) => (selectedStatus === 'All' ? true : followUpWorkStatus(lead) === selectedStatus))
    .sort((a, b) => {
      const reminderA = nextReminder(a)?.date
      const reminderB = nextReminder(b)?.date
      return (new Date(reminderA ?? '9999-12-31').getTime() || 0) - (new Date(reminderB ?? '9999-12-31').getTime() || 0)
    })

  const dueToday = activeLeads.filter((lead) => followUpWorkStatus(lead) === 'Due Today').length
  const overdue = activeLeads.filter((lead) => followUpWorkStatus(lead) === 'Overdue').length
  const readyToClose = activeLeads.filter((lead) => followUpWorkStatus(lead) === 'Ready To Close').length

  return (
    <>
      <div className="sheet-note">
        GTTC staff should record remarks for every contact attempt, set a reminder date when the lead asks to be
        contacted later, and close the lead early only when the student joins or clearly says not to call. After the
        7th attempt, the lead can be closed with the final call remark.
      </div>

      <div className="stat-grid stat-grid--4">
        <StatCard label="Active Follow-up Leads" value={activeLeads.length} highlight />
        <StatCard label="Due Today" value={dueToday} highlight />
        <StatCard label="Overdue" value={overdue} highlight />
        <StatCard label="Ready To Close" value={readyToClose} highlight />
      </div>

      <div className="status-filter">
        {statusOptions.map((status) => {
          const count =
            status === 'All' ? activeLeads.length : activeLeads.filter((lead) => followUpWorkStatus(lead) === status).length

          return (
            <button
              key={status}
              type="button"
              className={selectedStatus === status ? 'status-filter__button--active' : ''}
              onClick={() => setSelectedStatus(status)}
            >
              {status}
              <span>{count.toLocaleString('en-IN')}</span>
            </button>
          )
        })}
      </div>

      <DataTable
        columns={[
          'Student',
          'Contact',
          'Course',
          'Employee',
          'Progress',
          'Next Reminder',
          'Latest Remark',
          'Closure Rule',
        ]}
        rows={filteredLeads.slice(0, 200).map((lead) => [
          lead.studentName,
          lead.contactNo,
          lead.courseName,
          lead.attendedBy,
          `${completedFollowUpCount(lead)} / 7`,
          reminderLabel(lead),
          latestFollowUp(lead)?.remarks || lead.remarks,
          leadClosureReason(lead) || 'Keep following up',
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
      return <CustomFieldsView leads={leads} />
    case 'integrations':
      return <IntegrationsView leads={leads} error={error} />
    case 'call-retention':
      return <CallRetentionView leads={leads} />
    case 'seven-follow-ups':
      return <SevenFollowUpsView leads={leads} />
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
