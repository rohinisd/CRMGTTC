import type { Lead } from '../types/lead'

const emptyFollowUp = () => ({ date: '', remarks: '' })

export const sampleLeads: Lead[] = [
  {
    slNo: 185,
    attendedBy: 'JYOTI',
    date: '2023-08-10',
    source: 'Mobile Call',
    referredBy: 'Mobilization',
    studentName: 'Davalsab',
    contactNo: '9620017570',
    category: 'OBC',
    qualification: 'SSLC',
    areaWithPlace: '186',
    courseName: 'Meghna',
    remarks: '451289675173 ALREADY COURSE COMPLETED, PAID COURSE',
    status: 'Course Completed',
    referenceCount: 0,
    cstRefollowUp: emptyFollowUp(),
    followUpDone: { date: '2024-08-10', remarks: 'Mobile Call' },
    refollowUp: emptyFollowUp(),
    cstRefollowUpDate: emptyFollowUp(),
    cst3rdRefollowUp: emptyFollowUp(),
    fourthRefollowUp: emptyFollowUp(),
    earnings: 15000,
  },
  {
    slNo: 79,
    attendedBy: 'JYOTI',
    date: '2023-07-24',
    source: 'WALK IN',
    referredBy: 'By Friends',
    studentName: 'Mubarak Khudavan',
    contactNo: '8861871759',
    category: 'OBC',
    qualification: '7th Pass',
    areaWithPlace: 'Hubli',
    courseName: 'PLUMBING',
    remarks: 'Tomorrow will Coming',
    status: 'Enquiry',
    referenceCount: 0,
    cstRefollowUp: emptyFollowUp(),
    followUpDone: emptyFollowUp(),
    refollowUp: { date: '', remarks: 'Already Admission completed in Electrician Course' },
    cstRefollowUpDate: emptyFollowUp(),
    cst3rdRefollowUp: emptyFollowUp(),
    fourthRefollowUp: emptyFollowUp(),
  },
  {
    slNo: 170,
    attendedBy: 'JYOTI',
    date: '2023-08-09',
    source: 'Mobile Call',
    referredBy: 'By Friends',
    studentName: 'Altaf Mulla',
    contactNo: '8197288041',
    category: 'OBC',
    qualification: '10th Fail',
    areaWithPlace: '171',
    courseName: 'Meghna',
    remarks: 'Incoming call Not Available',
    status: 'Not Available',
    referenceCount: 0,
    cstRefollowUp: emptyFollowUp(),
    followUpDone: { date: '2024-08-09', remarks: 'Mobile Call' },
    refollowUp: emptyFollowUp(),
    cstRefollowUpDate: emptyFollowUp(),
    cst3rdRefollowUp: emptyFollowUp(),
    fourthRefollowUp: emptyFollowUp(),
  },
  {
    slNo: 175,
    attendedBy: 'JYOTI',
    date: '2023-08-10',
    source: 'WALK IN',
    referredBy: 'By Friends',
    studentName: 'Arjun',
    contactNo: '9108005912',
    category: 'General',
    qualification: 'Plumbing',
    areaWithPlace: '176',
    courseName: 'Sharada',
    remarks: 'Incoming call Not Available',
    status: 'Not Available',
    referenceCount: 0,
    cstRefollowUp: emptyFollowUp(),
    followUpDone: { date: '2024-08-10', remarks: 'Mobile Call' },
    refollowUp: emptyFollowUp(),
    cstRefollowUpDate: emptyFollowUp(),
    cst3rdRefollowUp: emptyFollowUp(),
    fourthRefollowUp: emptyFollowUp(),
  },
  {
    slNo: 105,
    attendedBy: 'JYOTI',
    date: '2023-07-27',
    source: 'WALK IN',
    referredBy: 'Vijay Karnataka',
    studentName: 'Mohammad Ameen Peerajade',
    contactNo: '9743656225',
    category: 'OBC',
    qualification: 'PUC - Science',
    areaWithPlace: 'Venkatapur',
    courseName: 'PLUMBING',
    remarks: 'coming on monday',
    status: 'Enquiry',
    referenceCount: 0,
    cstRefollowUp: emptyFollowUp(),
    followUpDone: emptyFollowUp(),
    refollowUp: {
      date: '',
      remarks: 'Information taken, asking Long term course & Diploma Mechatronics completed',
    },
    cstRefollowUpDate: emptyFollowUp(),
    cst3rdRefollowUp: emptyFollowUp(),
    fourthRefollowUp: emptyFollowUp(),
  },
]

const statuses: Lead['status'][] = [
  'Enquiry',
  'Pending',
  'Site Visit',
  'Converted',
  'Admission Completed',
  'Follow Up',
  'Not Available',
]

const sources = ['WALK IN', 'Mobile Call', 'Website', 'Referral', 'Vijay Karnataka']
const courses = ['PLUMBING', 'ELECTRICIAN', 'MEGHNA', 'MECHATRONICS', 'WELDING', 'SHARADA']
const areas = ['Hubli', 'Dharwad', 'Gadag', 'Haveri', 'Venkatapur', 'Belgaum']
const reps = ['JYOTI', 'PRIYA', 'RAJESH', 'ANITA']

function generateLeads(): Lead[] {
  const leads: Lead[] = [...sampleLeads]
  let slNo = 200

  for (let month = 0; month < 12; month++) {
    const count = month === 5 ? 12 : 7 + (month % 4)
    for (let i = 0; i < count; i++) {
      const day = 1 + ((i * 3 + month) % 28)
      const date = `2026-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const status = statuses[(slNo + i) % statuses.length]
      const converted = status === 'Converted' || status === 'Admission Completed'

      leads.push({
        slNo: slNo++,
        attendedBy: reps[(slNo + i) % reps.length],
        date,
        source: sources[(slNo + i) % sources.length],
        referredBy: ['By Friends', 'Mobilization', 'Newspaper', 'Social Media'][(slNo + i) % 4],
        studentName: `Student ${slNo}`,
        contactNo: `9${String(100000000 + slNo * 137).slice(0, 9)}`,
        category: ['OBC', 'General', 'SC', 'ST'][(slNo + i) % 4],
        qualification: ['SSLC', 'PUC', '10th Fail', '7th Pass', 'ITI'][(slNo + i) % 5],
        areaWithPlace: areas[(slNo + i) % areas.length],
        courseName: courses[(slNo + i) % courses.length],
        remarks: 'Auto-generated sample lead',
        status,
        referenceCount: (slNo + i) % 3,
        cstRefollowUp: emptyFollowUp(),
        followUpDone: emptyFollowUp(),
        refollowUp: emptyFollowUp(),
        cstRefollowUpDate: emptyFollowUp(),
        cst3rdRefollowUp: emptyFollowUp(),
        fourthRefollowUp: emptyFollowUp(),
        earnings: converted ? 8000 + (slNo % 5) * 2000 : 0,
      })
    }
  }

  return leads
}

export const allLeads = generateLeads()
