import { describe, it, expect } from "vitest";
import {
  validateVacationRequest,
  diffBusinessDays,
  paymentScheduleDate,
} from "@/lib/domain/vacation-rules";
import type { VacationPolicy, VacationBalance } from "@/lib/types/domain";

const basePolicy: VacationPolicy = {
  id: "p1",
  companyId: "c1",
  name: "Default PA",
  isDefault: true,
  accrualDaysPerMonth: 2.7272,
  maxAccumulatedPeriods: 2,
  allowFraction: false,
  maxFractions: 2,
  advanceNoticeDays: 60,
  paymentLeadDays: 3,
  paymentCalcBasis: "avg_11m",
  approvalLevels: 1,
};

const baseBalance: VacationBalance = {
  id: "b1",
  employeeId: "e1",
  periodYear: 2026,
  accruedDays: 30,
  usedDays: 0,
  availableDays: 30,
  accumulationAuthorizedAt: null,
};

describe("vacation-rules", () => {
  it("diffBusinessDays cuenta lun-vie inclusive", () => {
    // Lunes 2026-06-01 a Viernes 2026-06-05 = 5 días
    expect(
      diffBusinessDays(new Date("2026-06-01"), new Date("2026-06-05"))
    ).toBe(5);
  });

  it("rechaza solicitud que excede saldo", () => {
    const result = validateVacationRequest({
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-09-30"),
      fractionIndex: 1,
      fractionTotal: 1,
      shortNoticeAck: true,
      policy: basePolicy,
      balance: baseBalance,
      today: new Date("2026-05-13"),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Saldo insuficiente/);
  });

  it("requiere acuerdo expreso si preaviso < 60 días", () => {
    const result = validateVacationRequest({
      startDate: new Date("2026-05-25"),
      endDate: new Date("2026-05-29"),
      fractionIndex: 1,
      fractionTotal: 1,
      shortNoticeAck: false,
      policy: basePolicy,
      balance: baseBalance,
      today: new Date("2026-05-13"),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Preaviso menor/);
  });

  it("bloquea fraccionamiento cuando política no lo permite", () => {
    const result = validateVacationRequest({
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-10"),
      fractionIndex: 1,
      fractionTotal: 2,
      shortNoticeAck: false,
      policy: basePolicy,
      balance: baseBalance,
      today: new Date("2026-05-13"),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/fraccionamiento/i);
  });

  it("paymentScheduleDate resta paymentLeadDays", () => {
    const d = paymentScheduleDate(new Date("2026-08-15"), { paymentLeadDays: 3 });
    expect(d.toISOString().slice(0, 10)).toBe("2026-08-12");
  });
});
