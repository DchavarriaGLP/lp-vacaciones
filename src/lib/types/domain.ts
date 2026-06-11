// Tipos de dominio (lo que la UI y los services usan).
// Se mapean desde database.types.ts cuando se hace fetch.

export type UserRole = "employee" | "manager" | "hr" | "admin";

export type EmployeeStatus =
  | "active"
  | "on_leave"
  | "on_vacation"
  | "terminated";

export type RequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type ApprovalDecision = "pending" | "approved" | "rejected";

export interface Employee {
  id: string;
  companyId: string;
  userId: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  position: string | null;
  hireDate: string; // ISO date
  terminatedAt: string | null;
  monthlySalary: number | null;
  managerId: string | null;
  status: EmployeeStatus;
}

export interface VacationPolicy {
  id: string;
  companyId: string;
  name: string;
  isDefault: boolean;
  accrualDaysPerMonth: number;
  maxAccumulatedPeriods: number;
  allowFraction: boolean;
  maxFractions: number;
  advanceNoticeDays: number;
  paymentLeadDays: number;
  paymentCalcBasis: "avg_11m" | "last_base";
  approvalLevels: number;
}

export interface VacationBalance {
  id: string;
  employeeId: string;
  periodYear: number;
  accruedDays: number;
  usedDays: number;
  availableDays: number;
  accumulationAuthorizedAt: string | null;
}

export interface VacationRequest {
  id: string;
  companyId: string;
  employeeId: string;
  policyId: string;
  startDate: string;
  endDate: string;
  businessDays: number;
  calendarDays: number;
  reason: string | null;
  status: RequestStatus;
  fractionIndex: number;
  fractionTotal: number;
  shortNotice: boolean;
  shortNoticeAck: boolean;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNotes: string | null;
}
