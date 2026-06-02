export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}
