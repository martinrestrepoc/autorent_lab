import { useState } from "react";
import { useParams } from "react-router-dom";
import { extractErrorMessages } from "../api/error";
import { http } from "../api/http";
import { useTopbarAction } from "../layout/useTopbarAction";

type FormState = {
  fechaRecordatorio: string;
  titulo: string;
  detalle: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export default function ReminderCreatePage() {
  const { id } = useParams<{ id: string }>();
  useTopbarAction({
    label: "Volver",
    to: id ? `/vehicles/${id}/reminders` : "/vehicles",
  });

  const [form, setForm] = useState<FormState>({
    fechaRecordatorio: "",
    titulo: "",
    detalle: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError(null);
    setSuccessMsg(null);
  }

  function validate() {
    const nextErrors: FieldErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!form.fechaRecordatorio) {
      nextErrors.fechaRecordatorio = "La fecha es obligatoria";
    } else {
      const selected = new Date(form.fechaRecordatorio);
      selected.setHours(0, 0, 0, 0);
      if (selected <= today) {
        nextErrors.fechaRecordatorio = "La fecha del recordatorio debe ser futura";
      }
    }

    if (!form.titulo.trim()) {
      nextErrors.titulo = "El título es obligatorio";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!validate()) return;

    try {
      setLoading(true);
      const { data } = await http.post(`/vehiculos/${id}/recordatorios`, {
        fechaRecordatorio: form.fechaRecordatorio,
        titulo: form.titulo.trim(),
        detalle: form.detalle.trim() || undefined,
      });

      setSuccessMsg(
        data?.message ??
          "Recordatorio agendado. Se notificará cuando llegue la fecha.",
      );
      setForm({
        fechaRecordatorio: "",
        titulo: "",
        detalle: "",
      });
      setErrors({});
    } catch (error: unknown) {
      setFormError(
        extractErrorMessages(error, "No se pudo guardar el recordatorio").join(", "),
      );
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25";

  const errorClass = "mt-1 text-xs text-red-300";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Nuevo recordatorio
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Agenda una revisión preventiva y recíbela en notificaciones cuando llegue la fecha.
        </p>
      </div>

      {formError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {formError}
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {successMsg}
        </div>
      )}

      <section className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-300">
              Fecha del recordatorio <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              name="fechaRecordatorio"
              value={form.fechaRecordatorio}
              onChange={handleChange}
              className={inputBase}
            />
            {errors.fechaRecordatorio && (
              <p className={errorClass}>{errors.fechaRecordatorio}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              placeholder="Ej: Cambio de aceite preventivo"
              className={inputBase}
            />
            {errors.titulo && <p className={errorClass}>{errors.titulo}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Detalle (opcional)
            </label>
            <textarea
              name="detalle"
              value={form.detalle}
              onChange={handleChange}
              rows={4}
              placeholder="Detalle adicional para recordar qué revisión debe hacerse"
              className={`${inputBase} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar recordatorio"}
          </button>
        </form>
      </section>
    </div>
  );
}
