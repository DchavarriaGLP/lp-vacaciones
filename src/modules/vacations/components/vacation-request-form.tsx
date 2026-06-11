"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  vacationRequestInputSchema,
  type VacationRequestInput,
} from "@/lib/schemas/vacation";
import { submitVacationRequest } from "@/modules/vacations/actions";
import { diffBusinessDays, isShortNotice } from "@/lib/domain/vacation-rules";

interface Props {
  employeeId: string;
  policyId: string;
  policy: {
    allowFraction: boolean;
    maxFractions: number;
    advanceNoticeDays: number;
  };
  availableDays: number;
}

export function VacationRequestForm({
  employeeId,
  policyId,
  policy,
  availableDays,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<VacationRequestInput>({
    resolver: zodResolver(vacationRequestInputSchema),
    defaultValues: {
      employeeId,
      policyId,
      fractionIndex: 1,
      fractionTotal: 1,
      shortNoticeAck: false,
    },
  });

  const start = form.watch("startDate");
  const end = form.watch("endDate");

  const businessDays =
    start && end ? diffBusinessDays(new Date(start), new Date(end)) : 0;
  const shortNotice =
    start
      ? isShortNotice(new Date(start), new Date(), {
          advanceNoticeDays: policy.advanceNoticeDays,
        })
      : false;

  async function onSubmit(data: VacationRequestInput) {
    setSubmitting(true);
    setServerError(null);
    const res = await submitVacationRequest(data);
    setSubmitting(false);
    if (!res.ok) {
      setServerError(
        Array.isArray(res.error) ? res.error.join(" · ") : String(res.error)
      );
      return;
    }
    router.push("/vacaciones");
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha inicio" error={form.formState.errors.startDate?.message}>
          <input
            type="date"
            {...form.register("startDate")}
            className="input"
          />
        </Field>
        <Field label="Fecha fin" error={form.formState.errors.endDate?.message}>
          <input type="date" {...form.register("endDate")} className="input" />
        </Field>
      </div>

      <Field label="Motivo (opcional)" error={form.formState.errors.reason?.message}>
        <textarea
          rows={3}
          {...form.register("reason")}
          className="input"
          placeholder="Vacaciones familiares, descanso, viaje..."
        />
      </Field>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 text-sm space-y-1">
        <p>
          Días hábiles solicitados: <strong>{businessDays}</strong>
        </p>
        <p>
          Saldo disponible: <strong>{availableDays}</strong>
        </p>
        {businessDays > availableDays && (
          <p className="text-red-600">⚠ Excedes tu saldo disponible.</p>
        )}
      </div>

      {policy.allowFraction && (
        <Field label="Fraccionamiento" error="">
          <select {...form.register("fractionTotal", { valueAsNumber: true })} className="input">
            <option value={1}>Período completo</option>
            <option value={2}>Primera fracción de 2</option>
          </select>
        </Field>
      )}

      {shortNotice && (
        <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-sm">
          <input type="checkbox" {...form.register("shortNoticeAck")} className="mt-1" />
          <span>
            Solicito con menos de {policy.advanceNoticeDays} días de anticipación. Confirmo
            que existe acuerdo expreso con mi jefe directo (Art. 56 - C. de Trabajo).
          </span>
        </label>
      )}

      {serverError && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-3 text-sm">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || businessDays > availableDays}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          {submitting ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
