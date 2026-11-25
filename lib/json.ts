import { promises as fs } from "node:fs";
import path from "node:path";

export const DATA_ROOT = path.join(process.cwd(), "data");

export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asNumeric(value: unknown): number | null {
  const direct = asNumber(value);
  if (direct !== null) return direct;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replaceAll(",", "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listJsonFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".json") &&
          entry.name !== "schema.json",
      )
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

export async function domainHasJson(relativeDir: string): Promise<boolean> {
  const root = path.join(DATA_ROOT, relativeDir);
  return hasJsonRecursive(root);
}

async function hasJsonRecursive(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isFile() && entry.name.endsWith(".json")) return true;
      if (entry.isDirectory() && (await hasJsonRecursive(full))) return true;
    }
    return false;
  } catch {
    return false;
  }
}
