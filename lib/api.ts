// lib/api.ts
import { RecordWithDetails } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Fetch all records
export async function fetchRecords(
  page = 1,
  limit = 10,
  filters: Record<string, any> = {}
): Promise<{ data: RecordWithDetails[]; count?: number; totalPages?: number }> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const res = await fetch(`${API_BASE}/records?${params.toString()}`);

    if (!res.ok) throw new Error("Failed to fetch records");
    return await res.json();
  } catch (error) {
    console.error("Error fetching records:", error);
    return { data: [] };
  }
}

// Fetch a single record by ID
export async function fetchRecordById(id: number) {
    const res = await fetch(`/api/records/${id}`);
    if (!res.ok) throw new Error('Record not found');
    return res.json();
  }
  