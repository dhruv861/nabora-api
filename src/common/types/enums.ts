/**
 * Nabora Application-Level Enum Types
 *
 * All enums are stored as TEXT in PostgreSQL (not native Postgres enum types).
 * This avoids painful migration issues when adding new values — TEXT requires no schema change.
 *
 * Rule: ALL status/type fields in Prisma schema use String. These const objects provide
 * TypeScript type safety in the application layer.
 */

// ─── Account ───────────────────────────────────────────────────────────────

export const AccountType = {
  PERSONAL:     'PERSONAL',
  ORGANIZATION: 'ORGANIZATION',
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

// ─── Verification ──────────────────────────────────────────────────────────

export const VerificationLevel = {
  NONE:   'NONE',
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD:   'GOLD',
} as const;
export type VerificationLevel = (typeof VerificationLevel)[keyof typeof VerificationLevel];

// ─── Availability ──────────────────────────────────────────────────────────

export const AvailabilityStatus = {
  AVAILABLE_NOW:       'AVAILABLE_NOW',
  AVAILABLE_THIS_WEEK: 'AVAILABLE_THIS_WEEK',
  BUSY:                'BUSY',
  UNAVAILABLE:         'UNAVAILABLE',
} as const;
export type AvailabilityStatus = (typeof AvailabilityStatus)[keyof typeof AvailabilityStatus];

// ─── Jobs ──────────────────────────────────────────────────────────────────

export const JobStatus = {
  DRAFT:     'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED:    'CLOSED',
  EXPIRED:   'EXPIRED',
  DELETED:   'DELETED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

// ─── Applications ──────────────────────────────────────────────────────────

export const ApplicationStatus = {
  PENDING:    'PENDING',
  SHORTLISTED:'SHORTLISTED',
  HIRED:      'HIRED',
  REJECTED:   'REJECTED',
  WITHDRAWN:  'WITHDRAWN',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

// ─── Hires ─────────────────────────────────────────────────────────────────

export const HireStatus = {
  ACTIVE:    'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED:  'DISPUTED',
} as const;
export type HireStatus = (typeof HireStatus)[keyof typeof HireStatus];

// ─── Events ────────────────────────────────────────────────────────────────

export const EventStatus = {
  DRAFT:     'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ONGOING:   'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

// ─── Attendance ────────────────────────────────────────────────────────────

export const AttendanceStatus = {
  CHECKED_IN:  'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  ABSENT:      'ABSENT',
  DISPUTED:    'DISPUTED',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

// ─── Messages ──────────────────────────────────────────────────────────────

export const MessageType = {
  TEXT:   'TEXT',
  IMAGE:  'IMAGE',
  SYSTEM: 'SYSTEM',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// ─── Notifications ─────────────────────────────────────────────────────────

export const NotificationType = {
  JOB_NEARBY:             'JOB_NEARBY',
  APPLICATION_RECEIVED:   'APPLICATION_RECEIVED',
  APPLICATION_SHORTLISTED:'APPLICATION_SHORTLISTED',
  APPLICATION_HIRED:      'APPLICATION_HIRED',
  APPLICATION_REJECTED:   'APPLICATION_REJECTED',
  HIRE_COMPLETED:         'HIRE_COMPLETED',
  REVIEW_RECEIVED:        'REVIEW_RECEIVED',
  CHAT_MESSAGE:           'CHAT_MESSAGE',
  EVENT_REMINDER:         'EVENT_REMINDER',
  ATTENDANCE_REMINDER:    'ATTENDANCE_REMINDER',
  INVOICE_GENERATED:      'INVOICE_GENERATED',
  PAYMENT_RECEIVED:       'PAYMENT_RECEIVED',
  DISPUTE_OPENED:         'DISPUTE_OPENED',
  DISPUTE_RESOLVED:       'DISPUTE_RESOLVED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ─── Invoices ──────────────────────────────────────────────────────────────

export const InvoiceStatus = {
  DRAFT:          'DRAFT',
  SENT:           'SENT',
  PENDING:        'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID:           'PAID',
  DISPUTED:       'DISPUTED',
  CANCELLED:      'CANCELLED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  UPI:           'UPI',
  CASH:          'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ─── Disputes ──────────────────────────────────────────────────────────────

export const DisputeType = {
  WORKER_NO_SHOW:     'WORKER_NO_SHOW',
  ATTENDANCE_DISPUTE: 'ATTENDANCE_DISPUTE',
  PAYMENT_DISPUTE:    'PAYMENT_DISPUTE',
  FRAUDULENT_REVIEW:  'FRAUDULENT_REVIEW',
} as const;
export type DisputeType = (typeof DisputeType)[keyof typeof DisputeType];

export const DisputeStatus = {
  OPEN:         'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED:     'RESOLVED',
  REJECTED:     'REJECTED',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

// ─── Organizations ─────────────────────────────────────────────────────────

export const OrgRole = {
  OWNER:               'OWNER',
  OPERATIONS_MANAGER:  'OPERATIONS_MANAGER',
  EVENT_MANAGER:       'EVENT_MANAGER',
  FIELD_COORDINATOR:   'FIELD_COORDINATOR',
  FINANCE_MANAGER:     'FINANCE_MANAGER',
} as const;
export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

// ─── Ratings ───────────────────────────────────────────────────────────────

export const RatingTargetType = {
  WORKER:   'WORKER',
  EMPLOYER: 'EMPLOYER',
} as const;
export type RatingTargetType = (typeof RatingTargetType)[keyof typeof RatingTargetType];

// ─── Pay Units ─────────────────────────────────────────────────────────────

export const PayUnit = {
  HOUR:  'HOUR',
  DAY:   'DAY',
  FIXED: 'FIXED',
} as const;
export type PayUnit = (typeof PayUnit)[keyof typeof PayUnit];

// ─── File Types ────────────────────────────────────────────────────────────

export const UploadType = {
  AVATAR:           'AVATAR',
  PORTFOLIO:        'PORTFOLIO',
  LOGO:             'LOGO',
  VERIFICATION:     'VERIFICATION',
  SELFIE:           'SELFIE',
  DISPUTE_EVIDENCE: 'DISPUTE_EVIDENCE',
} as const;
export type UploadType = (typeof UploadType)[keyof typeof UploadType];

export const EvidenceFileType = {
  IMAGE:       'IMAGE',
  GPS_LOG:     'GPS_LOG',
  CHAT_EXPORT: 'CHAT_EXPORT',
} as const;
export type EvidenceFileType = (typeof EvidenceFileType)[keyof typeof EvidenceFileType];
