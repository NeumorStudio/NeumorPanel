"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { deletePayment, recordPayment } from "@/app/actions";
import { isOverdue, sortedPayments, todayISO } from "@/lib/payments";
import type { Project } from "@/lib/types";

const inputClass = "mt-1 block w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2.5 text-base";
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const dateFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" });
const dateLabel = (value: string) => dateFormat.format(new Date(value + "T00:00:00Z"));

export default function PaymentsTab({ project }: { project: Project }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [today] = useState(todayISO);
  const payments = sortedPayments(project);
  const nextDue = payments[0]?.nextDue;
  const overdue = isOverdue(nextDue, today);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    setError("");
    start(async () => {
      try {
        const result = await recordPayment(
          project.id,
          id,
          String(data.get("paidOn")),
          String(data.get("amount")),
          String(data.get("nextDue")),
          String(data.get("concept") ?? ""),
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        form.reset();
        setRequestId("");
      } catch {
        setError("No se ha podido confirmar el cobro. Vuelve a intentarlo.");
      }
    });
  }

  return (
    <section className="space-y-6">
      <div className={`rounded-2xl p-4 ${overdue ? "bg-red-500/10" : "bg-col"}`}>
        <h2 className="text-sm text-muted">Próximo pago</h2>
        <p className={`font-semibold ${overdue ? "text-red-500" : ""}`}>
          {nextDue ? dateLabel(nextDue) : "Sin fecha prevista"}
          {overdue && " · vencido"}
        </p>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label>Concepto (opcional)<input name="concept" type="text" maxLength={80} placeholder="Web, mantenimiento…" className={inputClass} /></label>
          <label>Fecha del cobro<input name="paidOn" type="date" required className={inputClass} /></label>
          <label>Importe (€)<input name="amount" type="text" inputMode="decimal" placeholder="0,00" required className={inputClass} /></label>
          <label>Próximo pago (opcional)<input name="nextDue" type="date" className={inputClass} /></label>
          <button className="rounded-xl bg-primary px-4 py-2.5 font-medium text-white disabled:opacity-50">
            {pending ? "Guardando…" : "Registrar cobro"}
          </button>
        </fieldset>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
      <div>
        <h2 className="mb-3 font-semibold">Historial de cobros</h2>
        {payments.length === 0 ? <p className="text-muted">Aún no hay cobros registrados.</p> : (
          <ul className="divide-y divide-line rounded-2xl bg-surface px-4">
            {payments.map((payment) => (
              <li key={payment.id} className="group flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0">
                  <time dateTime={payment.paidOn}>{dateLabel(payment.paidOn)}</time>
                  {payment.concept && <span className="ml-2 text-muted">· {payment.concept}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <strong className="tabular-nums">{money.format(payment.amountCents / 100)}</strong>
                  <button
                    type="button"
                    onClick={() => {
                      const what = `${money.format(payment.amountCents / 100)} del ${dateLabel(payment.paidOn)}`;
                      if (confirm(`¿Eliminar el cobro de ${what}?`)) start(() => deletePayment(project.id, payment.id));
                    }}
                    className="self-center p-1 text-faint hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                    aria-label="Eliminar cobro"
                  >
                    <X size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
