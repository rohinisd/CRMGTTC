import type { FollowUpEntry, Lead, LeadStatus } from '../types/lead'

const SHEET_ID = '1VlHAfjQwTBBleJhRKLNmPbWqJxHGdm5YmoB4jE0JGHI'
const SHEET_GID = '0'

export const googleSheetCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`

type SheetRow = string[]
type GoogleSheetCell = { v?: string | number | boolean | null; f?: string | null } | null
type GoogleSheetTableRow = { c?: GoogleSheetCell[] }
type GoogleSheetResponse = {
  status: string
  errors?: { detailed_message?: string; message?: string; reason?: string }[]
  table?: {
    cols: unknown[]
    rows: GoogleSheetTableRow[]
  }
}

function clean(value: string | undefined): string {
  return (value ?? '').replace(/\u200b/g, '').trim()
}

function parseCsv(csv: string): SheetRow[] {
  const rows: SheetRow[] = []
  let row: string[] = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i]
    const next = csv[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++
      row.push(value)
      rows.push(row)
      row = []
      value = ''
      continue
    }

    value += char
  }

  if (value || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  return rows
}

function formatDate(value: string): string {
  const raw = clean(value)
  if (!raw) return ''

  const dateMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch
    const fullYear = yyyy.length === 2 ? `20${yyyy}` : yyyy
    return `${fullYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  const serial = Number(raw)
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30 + serial))
    return date.toISOString().slice(0, 10)
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10)
}

function parseNumber(value: string): number {
  const parsed = Number(clean(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeStatus(value: string): LeadStatus {
  const status = clean(value)
  if (!status) return 'Enquiry'
  if (/admission\s+completed/i.test(status)) return 'Admission Completed'
  if (/course\s+completed/i.test(status)) return 'Course Completed'
  if (/not\s+available|not\s+received/i.test(status)) return 'Not Available'
  if (/site\s+visit|visit/i.test(status)) return 'Site Visit'
  if (/follow/i.test(status)) return 'Follow Up'
  if (/pending|document\s+pending/i.test(status)) return 'Pending'
  if (/converted/i.test(status)) return 'Converted'
  return status
}

function followUp(row: SheetRow, dateIndex: number, remarksIndex: number): FollowUpEntry {
  return {
    date: formatDate(row[dateIndex] ?? ''),
    remarks: clean(row[remarksIndex]),
  }
}

function fallbackStatus(row: SheetRow): string {
  const remarks = clean(row[11])
  if (/admission\s+completed/i.test(remarks)) return 'Admission Completed'
  if (/course\s+completed/i.test(remarks)) return 'Course Completed'
  if (/not\s+available|not\s+received/i.test(remarks)) return 'Not Available'
  if (/pending/i.test(remarks)) return 'Pending'
  return clean(row[12])
}

function mapSheetRow(row: SheetRow, index: number): Lead | null {
  const studentName = clean(row[5])
  const contactNo = clean(row[6])
  const date = formatDate(row[2])

  if (!studentName && !contactNo && !date) return null

  return {
    slNo: parseNumber(row[0]) || index + 1,
    attendedBy: clean(row[1]) || 'Unassigned',
    date,
    source: clean(row[3]),
    referredBy: clean(row[4]),
    studentName,
    contactNo,
    category: clean(row[7]),
    qualification: clean(row[8]),
    areaWithPlace: clean(row[9]),
    courseName: clean(row[10]),
    remarks: clean(row[11]),
    status: normalizeStatus(fallbackStatus(row)),
    referenceCount: parseNumber(row[13]),
    cstRefollowUp: followUp(row, 14, 15),
    followUpDone: followUp(row, 16, 17),
    refollowUp: followUp(row, 18, 19),
    cstRefollowUpDate: followUp(row, 20, 21),
    cst3rdRefollowUp: followUp(row, 22, 23),
    fourthRefollowUp: followUp(row, 24, 25),
    earnings: 0,
  }
}

export function mapGoogleSheetCsv(csv: string): Lead[] {
  const [, ...dataRows] = parseCsv(csv)
  return dataRows.map(mapSheetRow).filter((lead): lead is Lead => lead !== null)
}

function googleSheetJsonpUrl(callbackName: string): string {
  const tqx = `out:json;responseHandler:${callbackName}`
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=${encodeURIComponent(tqx)}&gid=${SHEET_GID}&cacheBust=${Date.now()}`
}

function cellValue(row: GoogleSheetTableRow, index: number): string {
  const cell = row.c?.[index]
  const value = cell?.f ?? cell?.v
  return value === undefined || value === null ? '' : String(value)
}

function mapGoogleSheetResponse(response: GoogleSheetResponse): Lead[] {
  if (response.status !== 'ok' || !response.table) {
    const error = response.errors?.[0]
    throw new Error(error?.detailed_message ?? error?.message ?? error?.reason ?? 'Google Sheet returned an error')
  }

  const columnCount = response.table.cols.length
  return response.table.rows
    .map((row) => Array.from({ length: columnCount }, (_, index) => cellValue(row, index)))
    .map(mapSheetRow)
    .filter((lead): lead is Lead => lead !== null)
}

export function fetchGoogleSheetLeads(): Promise<Lead[]> {
  return new Promise((resolve, reject) => {
    const callbackName = `crmSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const windowWithCallback = window as unknown as Window & Record<string, (response: GoogleSheetResponse) => void>
    const script = document.createElement('script')
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('Google Sheet request timed out'))
    }, 20000)

    function cleanup() {
      window.clearTimeout(timeoutId)
      script.remove()
      delete windowWithCallback[callbackName]
    }

    windowWithCallback[callbackName] = (response) => {
      try {
        resolve(mapGoogleSheetResponse(response))
      } catch (err) {
        reject(err)
      } finally {
        cleanup()
      }
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('Google Sheet script failed to load'))
    }
    script.src = googleSheetJsonpUrl(callbackName)
    document.body.appendChild(script)
  })
}
