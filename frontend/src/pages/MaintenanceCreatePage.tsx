import { useState } from "react";
import { useParams } from "react-router-dom";
import { extractErrorMessages } from "../api/error";
import { http } from "../api/http";
import { useTopbarAction } from "../layout/useTopbarAction";
import { getTodayDateInputValue } from "../utils/date";

type MaintenanceType = "preventivo" | "correctivo";

type FormState = {
  tipo: MaintenanceType;
  descripcion: string;
  fechaInicio: string;
  fechaEntrega: string;
  costo: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export default function MaintenanceCreatePage() {
  const { id } = useParams<{ id: string }>();
  useTopbarAction({
    label: "Volver",
    to: id ? `/vehicles/${id}/maintenances` : "/vehicles",
  });

  const [form, setForm] = useState<FormState>({
    tipo: "preventivo",
    descripcion: "",
    fechaInicio: "",
    fechaEntrega: "",
    costo: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [crearRecordatorio, setCrearRecordatorio] = useState(false);
  const [fechaRecordatorio, setFechaRecordatorio] = useState("");
  const [tituloRecordatorio, setTituloRecordatorio] = useState("");
  const [detalleRecordatorio, setDetalleRecordatorio] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError(null);
    setSuccessMsg(null);
  }

  function validate(): boolean {
    const errs: FieldErrors = {};

    if (!form.tipo) errs.tipo = "El tipo es obligatorio";
    if (!form.descripcion.trim())
      errs.descripcion = "La descripción es obligatoria";
    if (!form.fechaInicio) errs.fechaInicio = "La fecha de inicio es obligatoria";
    if (!form.fechaEntrega) errs.fechaEntrega = "La fecha de entrega es obligatoria";
    if (form.fechaInicio && form.fechaEntrega && form.fechaEntrega < form.fechaInicio) {
      errs.fechaEntrega = "La fecha de entrega no puede ser anterior a la fecha de inicio";
    }
    if (form.costo !== "" && isNaN(Number(form.costo)))
      errs.costo = "El costo debe ser un número";
    if (form.costo !== "" && Number(form.costo) < 0)
      errs.costo = "El costo no puede ser negativo";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const todayString = getTodayDateInputValue();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!validate()) return;

    try {
      setLoading(true);

      const payload = {
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        fechaInicio: form.fechaInicio,
        fechaEntrega: form.fechaEntrega,
        ...(form.costo !== "" ? { costo: Number(form.costo) } : {}),
        crearRecordatorio,
        ...(crearRecordatorio
          ? {
              fechaRecordatorio: fechaRecordatorio || form.fechaInicio,
              tituloRecordatorio:
                tituloRecordatorio ||
                `Mantenimiento ${form.tipo}`,
              detalleRecordatorio:
                detalleRecordatorio || form.descripcion.trim(),
            }
          : {}),
      };

      const { data } = await http.post(
        `/vehiculos/${id}/mantenimientos`,
        payload
      );

      setSuccessMsg(data?.message ?? "Mantenimiento registrado con éxito");
      setForm({
        tipo: "preventivo",
        descripcion: "",
        fechaInicio: "",
        fechaEntrega: "",
        costo: "",
      });
      setCrearRecordatorio(false);
      setFechaRecordatorio("");
      setTituloRecordatorio("");
      setDetalleRecordatorio("");
      setErrors({});
    } catch (error: unknown) {
      setFormError(
        extractErrorMessages(error, "No se pudo conectar con el servidor.").join(", "),
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
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Registrar mantenimiento
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Programa un mantenimiento y bloquea la disponibilidad del vehículo durante ese rango.
          </p>
        </div>

      </div>

      {/* Alerts */}
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

      {/* Form */}
      <section className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Tipo <span className="text-red-400">*</span>
            </label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              className={inputBase}
            >
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
            </select>
            {errors.tipo && <p className={errorClass}>{errors.tipo}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Descripción <span className="text-red-400">*</span>
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={3}
              placeholder="Ej: Cambio de aceite y filtro"
              className={`${inputBase} resize-none`}
            />
            {errors.descripcion && (
              <p className={errorClass}>{errors.descripcion}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Fecha de inicio <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="fechaInicio"
                value={form.fechaInicio}
                onChange={handleChange}
                className={inputBase}
              />
              {errors.fechaInicio && <p className={errorClass}>{errors.fechaInicio}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Fecha de entrega <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="fechaEntrega"
                value={form.fechaEntrega}
                onChange={handleChange}
                min={form.fechaInicio || undefined}
                className={inputBase}
              />
              {errors.fechaEntrega && <p className={errorClass}>{errors.fechaEntrega}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">
                Recordatorio opcional
              </h2>
              <p className="text-xs text-slate-400">
                Si quieres, deja programado el aviso desde este mismo mantenimiento.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={crearRecordatorio}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCrearRecordatorio(checked);
                  if (checked) {
                    setFechaRecordatorio((current) => current || form.fechaInicio);
                    setTituloRecordatorio((current) => current || `Mantenimiento ${form.tipo}`);
                    setDetalleRecordatorio((current) => current || form.descripcion);
                  }
                }}
                className="h-4 w-4 rounded border-white/20 bg-black/20"
              />
              Agregar recordatorio
            </label>

            {crearRecordatorio && (
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Fecha del recordatorio
                  </label>
                  <input
                    type="date"
                    value={fechaRecordatorio}
                    onChange={(e) => setFechaRecordatorio(e.target.value)}
                    min={todayString}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Título
                  </label>
                  <input
                    type="text"
                    value={tituloRecordatorio}
                    onChange={(e) => setTituloRecordatorio(e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-300">
                    Detalle
                  </label>
                  <textarea
                    value={detalleRecordatorio}
                    onChange={(e) => setDetalleRecordatorio(e.target.value)}
                    rows={3}
                    className={`${inputBase} resize-none`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Costo */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Costo (opcional)
            </label>
            <input
              type="number"
              name="costo"
              value={form.costo}
              onChange={handleChange}
              min={0}
              step="0.01"
              placeholder="0"
              className={inputBase}
            />
            {errors.costo && <p className={errorClass}>{errors.costo}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Registrar mantenimiento"}
          </button>
        </form>
      </section>
    </div>
  );
}
