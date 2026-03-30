import { useEffect, useMemo, useState } from "react";
import { extractErrorMessage } from "../api/error";
import { http } from "../api/http";
import { formatAppDate, startOfAppDay } from "../utils/date";

type VehicleSummary = {
  _id: string;
  plate?: string;
  brand?: string;
  model?: string;
};

type Reminder = {
  _id: string;
  tipo: string;
  evento?: string | null;
  titulo: string;
  detalle?: string;
  fechaRecordatorio: string;
  estado: string;
  notifiedAt?: string | null;
  vehiculo_id?: VehicleSummary | string;
};

type FilterKey = "todos" | "hoy" | "proximos" | "activados";

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = (status ?? "").toUpperCase();
  const classes =
    normalized === "ACTIVADO"
      ? "bg-amber-500/10 text-amber-200 ring-amber-500/25"
      : "bg-sky-500/10 text-sky-200 ring-sky-500/25";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${classes}`}
    >
      {normalized}
    </span>
  );
}

function getVehicleLabel(vehicle?: VehicleSummary | string) {
  if (!vehicle) return "Vehículo sin referencia";
  if (typeof vehicle === "string") return vehicle;
  const plate = vehicle.plate?.trim();
  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  if (plate && model) return `${plate} · ${model}`;
  return plate || model || vehicle._id;
}

function getReminderKind(reminder: Reminder) {
  if (reminder.tipo === "ALQUILER" && reminder.evento === "DEVOLUCION") {
    return "Devolución";
  }

  if (reminder.tipo === "ALQUILER") {
    return "Alquiler";
  }

  return "Mantenimiento";
}

export default function AgendaPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");

  async function loadAgenda() {
    try {
      setError("");
      setLoading(true);
      const { data } = await http.get("/recordatorios");
      const list = Array.isArray(data) ? data : data.recordatorios ?? [];
      setReminders(list);
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "Error cargando agenda"));
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
  }, []);

  const metrics = useMemo(() => {
    const today = startOfDay(new Date());

    return {
      total: reminders.length,
      today: reminders.filter(
        (item) => startOfDay(item.fechaRecordatorio).getTime() === today.getTime(),
      ).length,
      upcoming: reminders.filter(
        (item) => startOfDay(item.fechaRecordatorio).getTime() > today.getTime(),
      ).length,
      activated: reminders.filter((item) => item.estado === "ACTIVADO").length,
    };
  }, [reminders]);

  const filteredReminders = useMemo(() => {
    const today = startOfDay(new Date()).getTime();

    return reminders.filter((item) => {
      const date = startOfDay(item.fechaRecordatorio).getTime();

      if (filter === "hoy") return date === today;
      if (filter === "proximos") return date > today;
      if (filter === "activados") return item.estado === "ACTIVADO";
      return true;
    });
  }, [filter, reminders]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Reminder[]>();

    for (const reminder of filteredReminders) {
      const key = formatDate(reminder.fechaRecordatorio, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const current = groups.get(key) ?? [];
      current.push(reminder);
      groups.set(key, current);
    }

    return Array.from(groups.entries());
  }, [filteredReminders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Agenda
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Vista consolidada de todos los recordatorios programados para organizar el trabajo operativo.
          </p>
        </div>

        <button
          onClick={loadAgenda}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Refrescar
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Total" value={metrics.total} />
        <SummaryCard label="Hoy" value={metrics.today} />
        <SummaryCard label="Próximos" value={metrics.upcoming} />
        <SummaryCard label="Activados" value={metrics.activated} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Calendario operativo
            </h2>
            <p className="text-sm text-slate-400">
              Recordatorios agrupados por fecha, con prioridad visual tipo dashboard de agenda.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["todos", "Todos"],
              ["hoy", "Hoy"],
              ["proximos", "Próximos"],
              ["activados", "Activados"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as FilterKey)}
                className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                  filter === value
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-black/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-4 grid gap-3">
            <div className="h-28 animate-pulse rounded-2xl bg-black/10" />
            <div className="h-28 animate-pulse rounded-2xl bg-black/10" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-sm text-slate-400">
            No hay recordatorios en la agenda para este filtro.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {grouped.map(([dateLabel, items]) => (
              <section key={dateLabel} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {dateLabel}
                  </h3>
                  <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs text-slate-400">
                    {items.length} recordatorio{items.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid gap-3">
                  {items.map((reminder) => (
                    <article
                      key={reminder._id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200">
                              {getReminderKind(reminder)}
                            </span>
                            <StatusBadge status={reminder.estado} />
                          </div>

                          <h4 className="text-base font-semibold text-white">
                            {reminder.titulo}
                          </h4>
                          <p className="text-sm text-slate-300">
                            {reminder.detalle?.trim() || "Sin detalle adicional"}
                          </p>
                        </div>

                        <div className="space-y-1 text-sm text-slate-400 md:text-right">
                          <p>{getVehicleLabel(reminder.vehiculo_id)}</p>
                          <p>
                            {formatDate(reminder.fechaRecordatorio, {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                          <p>
                            Notificado:{" "}
                            {reminder.notifiedAt
                              ? formatDate(reminder.notifiedAt, {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "Pendiente"}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function startOfDay(date: string | Date) {
  return startOfAppDay(date);
}

function formatDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
) {
  return formatAppDate(dateString, "es-CO", options);
}
