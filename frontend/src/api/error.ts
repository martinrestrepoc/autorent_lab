import axios from "axios";

type ApiErrorPayload = {
  message?: string | string[];
};

export function normalizeMessage(
  message: unknown,
  fallback = "Error inesperado",
): string[] {
  if (Array.isArray(message)) return message.map(String);
  if (typeof message === "string") return [message];
  return [fallback];
}

export function extractErrorMessages(
  error: unknown,
  fallback: string,
): string[] {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return normalizeMessage(error.response?.data?.message, fallback);
  }

  if (error instanceof Error && error.message) {
    return [error.message];
  }

  return [fallback];
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  return extractErrorMessages(error, fallback)[0] ?? fallback;
}
