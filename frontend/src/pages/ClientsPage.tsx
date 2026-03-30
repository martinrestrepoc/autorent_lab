import { useEffect, useMemo, useState } from "react";
import { extractErrorMessage, extractErrorMessages } from "../api/error";
import { http } from "../api/http";

type Client = {
  _id: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  email: string;
  status?: string;
};

type Mode = "list" | "create" | "edit";

const emptyForm = {
  fullName: "",
  documentType: "CC",
  documentNumber: "",
  phone: "",
  email: "",
};

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15">
      {text}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-white/10">
      <td className="p-3">
        <div className="h-3 w-40 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-32 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-24 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-48 rounded bg-white/10" />
      </td>
      <td className="p-3 text-right">
        <div className="ml-auto h-8 w-28 rounded bg-white/10" />
      </td>
    </tr>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");

  const [mode, setMode] = useState<Mode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const loadClients = async () => {
    try {
      setError("");
      setLoading(true);
      const { data } = await http.get("/clients");

      // tu API a veces devuelve data.clients, a veces un array directo.
      const list = Array.isArray(data) ? data : data.clients ?? [];
      setClients(list);
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "Error cargando clientes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const doc = `${c.documentType} ${c.documentNumber}`.toLowerCase();
      return (
        c.fullName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        doc.includes(q)
      );
    });
  }, [clients, query]);

  // ---------- CREATE ----------
  const startCreate = () => {
    setForm({ ...emptyForm });
    setSelectedId(null);
    setError("");
    setMode("create");
  };

  const create = async () => {
    try {
      setError("");
      await http.post("/clients", form);
      await loadClients();
      setMode("list");
    } catch (error: unknown) {
      setError(extractErrorMessages(error, "Error creando cliente").join(" • "));
    }
  };

  // ---------- EDIT ----------
  const startEdit = async (id: string) => {
    try {
      setError("");
      setLoading(true);
      const { data } = await http.get(`/clients/${id}`);
      const c: Client = data.client ?? data;

      setForm({
        fullName: c.fullName ?? "",
        documentType: c.documentType ?? "CC",
        documentNumber: c.documentNumber ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
      });

      setSelectedId(id);
      setMode("edit");
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "No se pudo cargar el cliente"));
    } finally {
      setLoading(false);
    }
  };

  const update = async () => {
    if (!selectedId) return;

    try {
      setError("");
      await http.patch(`/clients/${selectedId}`, form);
      await loadClients();
      setMode("list");
      setSelectedId(null);
    } catch (error: unknown) {
      setError(
        extractErrorMessages(error, "Error actualizando cliente").join(" • "),
      );
    }
  };

  // ---------- DELETE ----------
  const remove = async (id: string, name: string) => {
    const ok = window.confirm(`¿Eliminar a "${name}" permanentemente?`);
    if (!ok) return;

    try {
      setError("");
      await http.delete(`/clients/${id}`);
      await loadClients();
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "Error eliminando cliente"));
    }
  };

  const cancelForm = () => {
    setMode("list");
    setSelectedId(null);
    setForm({ ...emptyForm });
    setError("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Registra, busca y gestiona tu base de clientes.
          </p>
        </div>

        {mode === "list" ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={startCreate}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              + Nuevo cliente
            </button>
            <button
              onClick={loadClients}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Refrescar
            </button>
          </div>
        ) : (
          <button
            onClick={cancelForm}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Volver
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* LIST */}
      {mode === "list" && (
        <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Badge text={`${filtered.length} clientes`} />
              {query.trim() && <Badge text={`Filtro: "${query.trim()}"`} />}
            </div>

            <div className="w-full md:w-80">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, email, teléfono o documento..."
                className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-black/20 text-slate-300">
                <tr>
                  <th className="text-left p-3 font-medium">Nombre</th>
                  <th className="text-left p-3 font-medium">Documento</th>
                  <th className="text-left p-3 font-medium">Teléfono</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-right p-3 font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody className="text-slate-200">
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="p-6 text-slate-400" colSpan={5}>
                      {clients.length === 0
                        ? "Aún no tienes clientes. Crea el primero con “+ Nuevo cliente”."
                        : "No hay resultados con ese filtro."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c._id}
                      className="border-t border-white/10 hover:bg-white/5 transition"
                    >
                      <td className="p-3 font-medium text-white">
                        {c.fullName}
                      </td>
                      <td className="p-3">
                        {c.documentType} {c.documentNumber}
                      </td>
                      <td className="p-3">{c.phone}</td>
                      <td className="p-3">{c.email}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => startEdit(c._id)}
                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => remove(c._id, c.fullName)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FORM */}
      {(mode === "create" || mode === "edit") && (
        <section className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                {mode === "create" ? "Crear cliente" : "Editar cliente"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Completa los datos y guarda los cambios.
              </p>
            </div>

            <Badge text={mode === "create" ? "Nuevo" : "Edición"} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-300">Nombre completo</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 p-2.5 text-sm text-white outline-none focus:border-white/25"
                value={form.fullName}
                onChange={(e) => onChange("fullName", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-300">Tipo documento</label>
              <select
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 p-2.5 text-sm text-white outline-none focus:border-white/25"
                value={form.documentType}
                onChange={(e) => onChange("documentType", e.target.value)}
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="PAS">PAS</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300">Número documento</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 p-2.5 text-sm text-white outline-none focus:border-white/25"
                value={form.documentNumber}
                onChange={(e) => onChange("documentNumber", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-300">Teléfono</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 p-2.5 text-sm text-white outline-none focus:border-white/25"
                value={form.phone}
                onChange={(e) => onChange("phone", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-300">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 p-2.5 text-sm text-white outline-none focus:border-white/25"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {mode === "create" ? (
              <button
                onClick={create}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
              >
                Guardar
              </button>
            ) : (
              <button
                onClick={update}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
              >
                Guardar cambios
              </button>
            )}

            <button
              onClick={cancelForm}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
