import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { useTopbarAction } from "../layout/useTopbarAction";

export default function ClientsCreatePage() {
  const navigate = useNavigate();
  useTopbarAction({ label: "Volver", to: "/clients" });

  const [form, setForm] = useState({
    fullName: "",
    documentType: "CC",
    documentNumber: "",
    phone: "",
    email: "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const onChange = (k: string, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      setSaving(true);
      await http.post("/clients", form);
      navigate("/clients");
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(" • ") : msg || "Error creando cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Nuevo cliente
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Registra un cliente para alquilar vehículos.
          </p>
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={onSubmit}
        className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Full name */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-300">Nombre completo</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
              value={form.fullName}
              onChange={(e) => onChange("fullName", e.target.value)}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          {/* Doc type */}
          <div>
            <label className="text-xs text-slate-300">Tipo documento</label>
            <select
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
              value={form.documentType}
              onChange={(e) => onChange("documentType", e.target.value)}
              required
            >
              <option value="CC">CC</option>
              <option value="CE">CE</option>
              <option value="PAS">PAS</option>
            </select>
          </div>

          {/* Doc number */}
          <div>
            <label className="text-xs text-slate-300">Número documento</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
              value={form.documentNumber}
              onChange={(e) => onChange("documentNumber", e.target.value)}
              placeholder="Ej: 123456789"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs text-slate-300">Teléfono</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Ej: 3001234567"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-slate-300">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="Ej: cliente@email.com"
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            disabled={saving}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
