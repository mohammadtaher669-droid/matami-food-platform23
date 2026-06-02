import { menuStore, categoryStore, restaurantStore } from "./store";
import type { MenuItem } from "./store";

export function buildFoodPrompt(
  item: Pick<MenuItem, "name_en" | "name_ar" | "description_en" | "description_ar">,
  categoryName: string,
  restaurantName: string
): string {
  const name = item.name_en || item.name_ar || "food";
  const desc = (item.description_en || item.description_ar || "").slice(0, 80);
  const parts: string[] = [
    `Professional Arabic food photography of ${name}`,
  ];
  if (desc) parts.push(desc);
  if (categoryName) parts.push(`${categoryName} dish`);
  if (restaurantName) parts.push(`served at a Saudi restaurant`);
  parts.push(
    "ultra realistic, cinematic lighting, shallow depth of field, restaurant menu style, vibrant colors, appetizing, high resolution, commercial food photo, clean background"
  );
  return parts.join(", ");
}

export async function generateImageForItem(
  item: MenuItem,
  opts: { force?: boolean; size?: "1024x1024" | "1024x1536" } = {}
): Promise<string> {
  const allCategories = categoryStore.getAll();
  const allRestaurants = restaurantStore.getAll();
  const category = allCategories.find((c) => c.id === item.category_id);
  const restaurant = allRestaurants.find((r) => r.id === item.restaurant_id);

  const catName = category?.name_en || "";
  const restName = restaurant?.name_en || "";
  const prompt = buildFoodPrompt(item, catName, restName);
  const cacheKey = opts.force ? `regen_${item.id}_${Date.now()}` : `item_${item.id}`;

  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      cacheKey,
      size: opts.size || "1024x1024",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { url?: string; error?: string };
  if (data.error) throw new Error(data.error);
  if (!data.url) throw new Error("No URL returned from API");

  const updated: MenuItem = {
    ...item,
    image_url: data.url,
    image_ai_generated: true,
  };
  menuStore.save(updated);
  return data.url;
}
