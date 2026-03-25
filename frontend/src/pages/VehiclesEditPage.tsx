import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../api/base-url";
import { useTopbarAction } from "../layout/useTopbarAction";
import { getToken } from "../auth/token";

type FieldErrors = Partial<Record<"plate" | "brand" | "model" | "year", string>>;

const PLATE_REGEX = /^[A-Z]{3}\d{3,4}$/;

function normalizeMessage(msg: any): string[] {
  if (Array.isArray(msg)) return msg.map(String);
  if (typeof msg === "string") return [msg];
  return ["Error inesperado"];
}

function mapBackendErrorsToFields(messages: string[]): {
  fieldErrors: FieldErrors;
  formError?: string;
} {
  const fieldErrors: FieldErrors = {};
  let formError: string | undefined;

  for (const m of messages) {
    const lower = m.toLowerCase();

    if (lower.includes("placa") || lower.includes("plate")) {
      fieldErrors.plate = m;
      continue;
    }
    if (lower.includes("marca") || lower.includes("brand")) {
      fieldErrors.brand = m;
      continue;
    }
    if (lower.includes("modelo") || lower.includes("model")) {
      fieldErrors.model = m;
      continue;
    }
    if (lower.includes("año") || lower.includes("year")) {
      fieldErrors.year = m;
      continue;
    }

    formError = m;
  }

  return { fieldErrors, formError };
}

function SkeletonForm() {
  const box = "h-10 w-full rounded-xl bg-white/10";
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className={box} />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className={box} />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className={box} />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className={box} />
      </div>
      <div className="h-11 w-full rounded-xl bg-white/10" />
    </div>
  );
}

export default function VehiclesEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbarAction({ label: "Volver", to: "/vehicles" });

  const [form, setForm] = useState({
    plate: "",
    brand: "",
    model: "",
    year: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25";

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError(null);
    setSuccessMsg(null);
  }

  function validateLocal(): boolean {
    const next: FieldErrors = {};
    const plate = form.plate.trim().toUpperCase();
    const brand = form.brand.trim();
    const model = form.model.trim();
    const yearStr = form.year.trim();

    if (!plate) next.plate = "Campo obligatorio";
    else if (!PLATE_REGEX.test(plate))
      next.plate = "Formato de placa inválido (ej: ABC123)";

    if (!brand) next.brand = "Campo obligatorio";
    if (!model) next.model = "Campo obligatorio";

    if (!yearStr) next.year = "Campo obligatorio";
    else {
      const yearNum = Number(yearStr);
      if (Number.isNaN(yearNum)) next.year = "Año inválido";
      else if (yearNum < 1950 || yearNum > 2100)
        next.year = "Año fuera de rango (1950 - 2100)";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  useEffect(() => {
    async function load() {
      if (!id) {
        setFormError("Falta el ID del vehículo.");
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      setFormError(null);

      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const messages = normalizeMessage(data?.message);
          setFormError(messages[0] ?? "No se pudo cargar el vehículo");
          return;
        }

        const v = data?.vehicle ?? data;
        setForm({
          plate: String(v?.plate ?? ""),
          brand: String(v?.brand ?? ""),
          model: String(v?.model ?? ""),
          year: String(v?.year ?? ""),
        });
      } catch {
        setFormError("No se pudo conectar con el servidor.");
      } finally {
        setLoadingData(false);
      }
    }

    load();
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setFormError(null);

    if (!id) {
      setFormError("Falta el ID del vehículo.");
      return;
    }

    if (!validateLocal()) return;

    setLoading(true);
    try {
      const token = getToken();

      const payload = {
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
      };

      const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const messages = normalizeMessage(data?.message);
        const mapped = mapBackendErrorsToFields(messages);
        setErrors((prev) => ({ ...prev, ...mapped.fieldErrors }));
        setFormError(mapped.formError ?? messages[0] ?? null);
        return;
      }

      setSuccessMsg(data?.message ?? "Vehículo actualizado con éxito");
    } catch {
      setFormError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Editar vehículo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Actualiza placa, marca, modelo y año.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {id && (
            <button
              type="button"
              onClick={() => navigate(`/vehicles/${id}/documents`)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Documentos
            </button>
          )}
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

      {/* Form card */}
      <section className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        {loadingData ? (
          <SkeletonForm />
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-300">Placa</label>
              <input
                name="plate"
                value={form.plate}
                onChange={onChange}
                placeholder="Ej: ABC123"
                className={inputBase}
                autoCapitalize="characters"
              />
              {errors.plate && (
                <p className="mt-2 text-xs text-red-300">{errors.plate}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300">Año</label>
              <input
                name="year"
                value={form.year}
                onChange={onChange}
                placeholder="Ej: 2021"
                className={inputBase}
                inputMode="numeric"
              />
              {errors.year && (
                <p className="mt-2 text-xs text-red-300">{errors.year}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300">Marca</label>
              <input
                name="brand"
                value={form.brand}
                onChange={onChange}
                placeholder="Ej: Toyota"
                className={inputBase}
              />
              {errors.brand && (
                <p className="mt-2 text-xs text-red-300">{errors.brand}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300">Modelo</label>
              <input
                name="model"
                value={form.model}
                onChange={onChange}
                placeholder="Ej: Corolla"
                className={inputBase}
              />
              {errors.model && (
                <p className="mt-2 text-xs text-red-300">{errors.model}</p>
              )}
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
              <button
                disabled={loading}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Actualizando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/vehicles")}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
