import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTopbarAction } from "../layout/useTopbarAction";
import { getToken } from "../auth/token";

type VehicleDocumentType = "SOAT" | "TARJETA_PROPIEDAD" | "TECNOMECANICA";
type DocumentStatus = "VIGENTE" | "VENCIDO";

type VehicleLegalDocument = {
  id: string;
  type: VehicleDocumentType;
  originalName: string;
  mimeType: string;
  size: number;
  expiresAt: string;
  uploadedAt: string;
  status: DocumentStatus;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const DOCUMENT_TYPE_OPTIONS: { value: VehicleDocumentType; label: string }[] = [
  { value: "SOAT", label: "SOAT" },
  { value: "TARJETA_PROPIEDAD", label: "Tarjeta de propiedad" },
  { value: "TECNOMECANICA", label: "Tecnomecánica" },
];

function normalizeMessage(msg: any): string[] {
  if (Array.isArray(msg)) return msg.map(String);
  if (typeof msg === "string") return [msg];
  return ["Error inesperado"];
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15">
      {text}
    </span>
  );
}

function StatusPill({ status }: { status: DocumentStatus }) {
  const isOk = status === "VIGENTE";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 " +
        (isOk
          ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25"
          : "bg-red-500/10 text-red-200 ring-red-500/25")
      }
    >
      {status}
    </span>
  );
}

function SkeletonDocRow() {
  return (
    <tr className="animate-pulse border-t border-white/10">
      <td className="px-3 py-3">
        <div className="h-3 w-16 rounded bg-white/10" />
      </td>
      <td className="px-3 py-3">
        <div className="h-3 w-52 rounded bg-white/10" />
      </td>
      <td className="px-3 py-3">
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </td>
      <td className="px-3 py-3">
        <div className="h-3 w-20 rounded bg-white/10" />
      </td>
      <td className="px-3 py-3">
        <div className="h-3 w-14 rounded bg-white/10" />
      </td>
      <td className="px-3 py-3 text-right">
        <div className="ml-auto h-8 w-28 rounded bg-white/10" />
      </td>
    </tr>
  );
}

export default function VehiclesDocumentsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbarAction({ label: "Volver", to: "/vehicles" });

  const [documents, setDocuments] = useState<VehicleLegalDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentSuccessMsg, setDocumentSuccessMsg] = useState<string | null>(null);

  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);

  const [fileInputKey, setFileInputKey] = useState(0);

  const [documentForm, setDocumentForm] = useState<{
    type: VehicleDocumentType;
    expiresAt: string;
    file: File | null;
  }>({
    type: "SOAT",
    expiresAt: "",
    file: null,
  });

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25";

  useEffect(() => {
    if (!id) return;
    void loadDocuments(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadDocuments(vehicleId: string) {
    setLoadingDocuments(true);
    setDocumentsError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/vehicles/${vehicleId}/documentos`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const messages = normalizeMessage(data?.message);
        setDocumentsError(messages[0] ?? "No se pudo cargar los documentos");
        setDocuments([]);
        return;
      }

      const docs = Array.isArray(data?.documents) ? data.documents : [];
      setDocuments(docs as VehicleLegalDocument[]);
    } catch {
      setDocumentsError("No se pudo conectar con el servidor.");
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function onUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    setDocumentsError(null);
    setDocumentSuccessMsg(null);

    if (!id) {
      setDocumentsError("Falta el ID del vehículo.");
      return;
    }

    if (!documentForm.expiresAt) {
      setDocumentsError("Debes indicar la fecha de vencimiento.");
      return;
    }

    if (!documentForm.file) {
      setDocumentsError("Debes seleccionar un archivo.");
      return;
    }

    setUploadingDocument(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("type", documentForm.type);
      formData.append("expiresAt", documentForm.expiresAt);
      formData.append("file", documentForm.file);

      const res = await fetch(`${API_URL}/vehicles/${id}/documentos`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const messages = normalizeMessage(data?.message);
        setDocumentsError(messages[0] ?? "No se pudo subir el documento");
        return;
      }

      setDocumentSuccessMsg(data?.message ?? "Documento cargado con éxito");
      setDocumentForm({ type: "SOAT", expiresAt: "", file: null });
      setFileInputKey((prev) => prev + 1);
      await loadDocuments(id);
    } catch {
      setDocumentsError("No se pudo conectar con el servidor.");
    } finally {
      setUploadingDocument(false);
    }
  }

  async function onDownloadDocument(document: VehicleLegalDocument) {
    if (!id) return;

    setDownloadingDocumentId(document.id);
    setDocumentsError(null);
    setDocumentSuccessMsg(null);

    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/vehicles/${id}/documentos/${document.id}/descargar`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const messages = normalizeMessage(data?.message);
        setDocumentsError(messages[0] ?? "No se pudo descargar el documento");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setDocumentsError("No se pudo conectar con el servidor.");
    } finally {
      setDownloadingDocumentId(null);
    }
  }

  function formatDate(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("es-CO");
  }

  function formatFileSize(size: number): string {
    if (!Number.isFinite(size) || size <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / 1024 ** power;
    return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Documentos del vehículo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sube, lista y descarga documentos legales.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {id && (
            <button
              type="button"
              onClick={() => navigate(`/vehicles/${id}/edit`)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Editar vehículo
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {documentsError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {documentsError}
        </div>
      )}

      {documentSuccessMsg && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {documentSuccessMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upload card */}
        <section className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Subir documento</h2>
            <Badge text="Legal" />
          </div>

          <form onSubmit={onUploadDocument} className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-slate-300">Tipo</label>
              <select
                value={documentForm.type}
                onChange={(e) =>
                  setDocumentForm((prev) => ({
                    ...prev,
                    type: e.target.value as VehicleDocumentType,
                  }))
                }
                className={inputBase}
              >
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300">Vence el</label>
              <input
                type="date"
                value={documentForm.expiresAt}
                onChange={(e) =>
                  setDocumentForm((prev) => ({
                    ...prev,
                    expiresAt: e.target.value,
                  }))
                }
                className={inputBase}
              />
            </div>

            <div>
              <label className="text-xs text-slate-300">
                Archivo (PDF/JPG/PNG - máx 8MB)
              </label>
              <input
                key={fileInputKey}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) =>
                  setDocumentForm((prev) => ({
                    ...prev,
                    file: e.target.files?.[0] ?? null,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-slate-950"
              />
            </div>

            <button
              disabled={uploadingDocument}
              className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
            >
              {uploadingDocument ? "Subiendo..." : "Subir documento"}
            </button>
          </form>
        </section>

        {/* List card */}
        <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Documentos cargados</h3>
              <Badge text={`${documents.length}`} />
            </div>

            <button
              type="button"
              onClick={() => id && void loadDocuments(id)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Refrescar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-black/20 text-slate-300">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Tipo</th>
                  <th className="px-3 py-3 text-left font-medium">Archivo</th>
                  <th className="px-3 py-3 text-left font-medium">Estado</th>
                  <th className="px-3 py-3 text-left font-medium">Vence</th>
                  <th className="px-3 py-3 text-left font-medium">Tamaño</th>
                  <th className="px-3 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-200">
                {loadingDocuments ? (
                  <>
                    <SkeletonDocRow />
                    <SkeletonDocRow />
                    <SkeletonDocRow />
                  </>
                ) : documents.length === 0 ? (
                  <tr>
                    <td className="p-6 text-slate-400" colSpan={6}>
                      No hay documentos cargados para este vehículo.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-t border-white/10 hover:bg-white/5 transition"
                    >
                      <td className="px-3 py-3">{doc.type}</td>
                      <td className="px-3 py-3">{doc.originalName}</td>
                      <td className="px-3 py-3">
                        <StatusPill status={doc.status} />
                      </td>
                      <td className="px-3 py-3">{formatDate(doc.expiresAt)}</td>
                      <td className="px-3 py-3">{formatFileSize(doc.size)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={downloadingDocumentId === doc.id}
                          onClick={() => onDownloadDocument(doc)}
                          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
                        >
                          {downloadingDocumentId === doc.id
                            ? "Descargando..."
                            : "Descargar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
