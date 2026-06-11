"use server";

// Server Actions del módulo de vacaciones.
// Aplican: validación Zod + validación de negocio + Supabase + auditoría.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  vacationRequestInputSchema,
  approvalDecisionSchema,
} from "@/lib/schemas/vacation";
import {
  validateVacationRequest,
  diffBusinessDays,
  diffCalendarDays,
  isShortNotice,
} from "@/lib/domain/vacation-rules";

export async function submitVacationRequest(formData: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = vacationRequestInputSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten() };
  }
  const input = parsed.data;

  // Cargar política, balance y empleado
  const [{ data: policy }, { data: balance }, { data: employee }] =
    await Promise.all([
      supabase.from("vacation_policies").select("*").eq("id", input.policyId).single(),
      supabase
        .from("vacation_balances")
        .select("*")
        .eq("employee_id", input.employeeId)
        .eq("period_year", new Date().getUTCFullYear())
        .single(),
      supabase.from("employees").select("id, company_id, manager_id, user_id").eq("id", input.employeeId).single(),
    ]);

  if (!policy || !balance || !employee) {
    return { ok: false, error: "Datos no encontrados" };
  }

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  const validation = validateVacationRequest({
    startDate: start,
    endDate: end,
    fractionIndex: input.fractionIndex,
    fractionTotal: input.fractionTotal,
    shortNoticeAck: input.shortNoticeAck,
    policy: {
      id: policy.id,
      companyId: policy.company_id,
      name: policy.name,
      isDefault: policy.is_default,
      accrualDaysPerMonth: Number(policy.accrual_days_per_month),
      maxAccumulatedPeriods: policy.max_accumulated_periods,
      allowFraction: policy.allow_fraction,
      maxFractions: policy.max_fractions,
      advanceNoticeDays: policy.advance_notice_days,
      paymentLeadDays: policy.payment_lead_days,
      paymentCalcBasis: policy.payment_calc_basis,
      approvalLevels: policy.approval_levels,
    },
    balance: {
      id: balance.id,
      employeeId: balance.employee_id,
      periodYear: balance.period_year,
      accruedDays: Number(balance.accrued_days),
      usedDays: Number(balance.used_days),
      availableDays: Number(balance.available_days),
      accumulationAuthorizedAt: balance.accumulation_authorized_at,
    },
  });

  if (!validation.ok) return { ok: false, error: validation.errors };

  // Insertar request
  const { data: request, error: insertErr } = await supabase
    .from("vacation_requests")
    .insert({
      company_id: employee.company_id,
      employee_id: input.employeeId,
      policy_id: input.policyId,
      start_date: input.startDate,
      end_date: input.endDate,
      business_days: diffBusinessDays(start, end),
      calendar_days: diffCalendarDays(start, end),
      reason: input.reason,
      status: "pending",
      fraction_index: input.fractionIndex,
      fraction_total: input.fractionTotal,
      short_notice: isShortNotice(start, new Date(), {
        advanceNoticeDays: policy.advance_notice_days,
      }),
      short_notice_ack: input.shortNoticeAck,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr || !request) return { ok: false, error: insertErr?.message };

  // Crear approval step para el manager
  if (employee.manager_id) {
    const { data: manager } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", employee.manager_id)
      .single();

    if (manager?.user_id) {
      await supabase.from("approval_steps").insert({
        company_id: employee.company_id,
        request_id: request.id,
        step_order: 1,
        approver_id: manager.user_id,
      });

      await supabase.from("notifications").insert({
        company_id: employee.company_id,
        recipient_id: manager.user_id,
        type: "request_submitted",
        title: "Nueva solicitud de vacaciones",
        body: `Tienes una solicitud pendiente de aprobación para el período ${input.startDate} a ${input.endDate}.`,
        link_url: `/aprobaciones/${request.id}`,
      });
    }
  }

  // Auditoría
  await supabase.from("audit_logs").insert({
    company_id: employee.company_id,
    actor_id: user.id,
    actor_email: user.email,
    action: "create",
    entity_type: "vacation_request",
    entity_id: request.id,
    after_state: request,
  });

  revalidatePath("/vacaciones");
  return { ok: true, data: request, warnings: validation.warnings };
}

export async function decideApproval(formData: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const parsed = approvalDecisionSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.flatten() };
  const { requestId, stepId, decision, notes } = parsed.data;

  // Cargar request actual para auditoría
  const { data: before } = await supabase
    .from("vacation_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  // Actualizar step
  const { error: stepErr } = await supabase
    .from("approval_steps")
    .update({ decision, decided_at: new Date().toISOString(), notes })
    .eq("id", stepId);

  if (stepErr) return { ok: false, error: stepErr.message };

  // Si fue rechazo, marcar request inmediatamente
  // Si fue aprobación, verificar si todos los pasos están aprobados
  let newStatus: "approved" | "rejected" | "pending" = "pending";

  if (decision === "rejected") {
    newStatus = "rejected";
  } else {
    const { data: steps } = await supabase
      .from("approval_steps")
      .select("decision")
      .eq("request_id", requestId);
    const allApproved = steps?.every((s) => s.decision === "approved");
    if (allApproved) newStatus = "approved";
  }

  if (newStatus !== "pending") {
    await supabase
      .from("vacation_requests")
      .update({
        status: newStatus,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
        decision_notes: notes,
      })
      .eq("id", requestId);

    // Si fue aprobado: actualizar balance + crear payroll_event
    if (newStatus === "approved" && before) {
      await supabase.rpc("increment_used_days", {
        p_employee_id: before.employee_id,
        p_period_year: new Date(before.start_date).getUTCFullYear(),
        p_days: before.business_days,
      });

      const { data: policy } = await supabase
        .from("vacation_policies")
        .select("payment_lead_days, payment_calc_basis")
        .eq("id", before.policy_id)
        .single();

      if (policy) {
        const payDate = new Date(before.start_date);
        payDate.setUTCDate(payDate.getUTCDate() - policy.payment_lead_days);

        await supabase.from("payroll_events").insert({
          company_id: before.company_id,
          employee_id: before.employee_id,
          source_type: "vacation_request",
          source_id: before.id,
          event_type: "vacation_payment",
          scheduled_at: payDate.toISOString().slice(0, 10),
          calc_basis: policy.payment_calc_basis,
        });
      }
    }

    // Notificar al empleado
    const { data: emp } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", before?.employee_id ?? "")
      .single();
    if (emp?.user_id) {
      await supabase.from("notifications").insert({
        company_id: before!.company_id,
        recipient_id: emp.user_id,
        type: newStatus === "approved" ? "approved" : "rejected",
        title:
          newStatus === "approved"
            ? "Vacaciones aprobadas"
            : "Solicitud de vacaciones rechazada",
        body: notes ?? "",
        link_url: `/vacaciones/${requestId}`,
      });
    }
  }

  // Auditoría
  await supabase.from("audit_logs").insert({
    company_id: before?.company_id,
    actor_id: user.id,
    actor_email: user.email,
    action: decision === "approved" ? "approve" : "reject",
    entity_type: "vacation_request",
    entity_id: requestId,
    before_state: before,
  });

  revalidatePath("/aprobaciones");
  revalidatePath("/vacaciones");
  return { ok: true };
}
