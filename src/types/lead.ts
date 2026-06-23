export type LeadStatus = string

export interface FollowUpEntry {
  date: string
  remarks: string
}

export interface FollowUpAttempt extends FollowUpEntry {
  attempt: number
  label: string
}

export interface Lead {
  slNo: number
  attendedBy: string
  date: string
  source: string
  referredBy: string
  studentName: string
  contactNo: string
  category: string
  qualification: string
  areaWithPlace: string
  courseName: string
  remarks: string
  status: LeadStatus
  referenceCount: number
  cstRefollowUp: FollowUpEntry
  followUpDone: FollowUpEntry
  refollowUp: FollowUpEntry
  cstRefollowUpDate: FollowUpEntry
  cst3rdRefollowUp: FollowUpEntry
  fourthRefollowUp: FollowUpEntry
  seventhFollowUp?: FollowUpEntry
  followUps: FollowUpAttempt[]
  earnings?: number
  customFields?: Record<string, string>
  sheetColumns?: string[]
}

export type ViewMode = 'Daily' | 'Monthly' | 'Yearly'
