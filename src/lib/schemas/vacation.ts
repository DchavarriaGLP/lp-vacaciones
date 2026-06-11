// Validaciones Zod compartidas entre cliente (RHF) y server actions.

import { z } from "zod";

export const vacationRequestInputSchema = z
  .object({
    employeeId: z.string().uuid(),
    policyId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().max(500).optional().nullable(),
    fractionIndex: z.number().int().min(1).max(2).default(1),
    fractionTotal: z.number().int().min(1).max(2).default(1),
    shortNoticeAck: z.boolean().default(false),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "La fecha fin debe ser mayor o igual a la de inicio",
    path: ["endDate"],
  })
  .refine((d) => new Date(d.startDate) >= new Date(), {
    message: "Las vacaciones no pueden iniciar en el pasado",
    path: ["startDate"],
  });

export type VacationRequestInput = z.infer<typeof vacationRequestInputSchema>;

export const approvalDecisionSchema = z.object({
  requestId: z.string().uuid(),
  stepId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(500).optional().nullable(),
});

export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
