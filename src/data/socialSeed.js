// Social post seed data — fallback when Supabase is empty
// Dates computed dynamically from current month

function getSeedDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const next = m === 11 ? 0 : m + 1;
  const nextY = m === 11 ? y + 1 : y;

  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (year, month, day) =>
    `${year}-${pad(month + 1)}-${pad(day)}`;

  return {
    currentMonth15: toISO(y, m, 15),
    currentMonth22: toISO(y, m, 22),
    nextMonth5: toISO(nextY, next, 5),
    nextMonth12: toISO(nextY, next, 12),
    nextMonth20: toISO(nextY, next, 20),
  };
}

const d = getSeedDates();

export const seedSocialPosts = [
  {
    id: "seed-post-1",
    title: "Bell Tower Wedding Highlights",
    caption: "",
    post_type: "highlight",
    platform: "instagram",
    status: "draft",
    scheduled_date: d.currentMonth15,
    posted_date: null,
    image_url: null,
    gallery_photo_id: null,
    brand: "Greenway",
    ai_prompt: "",
    notes: "Select best 3 photos from Bell Tower gallery",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-post-2",
    title: "Band Setup BTS",
    caption: "",
    post_type: "bts",
    platform: "instagram",
    status: "review",
    scheduled_date: d.currentMonth22,
    posted_date: null,
    image_url: null,
    gallery_photo_id: null,
    brand: "Greenway",
    ai_prompt: "",
    notes: "Soundcheck footage from River Oaks gig",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-post-3",
    title: "Client Testimonial — Lauren and James",
    caption:
      '"Our guests are still talking about the band." — Lauren M.',
    post_type: "testimonial",
    platform: "instagram",
    status: "approved",
    scheduled_date: d.nextMonth5,
    posted_date: null,
    image_url: null,
    gallery_photo_id: null,
    brand: "Greenway",
    ai_prompt: "",
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-post-4",
    title: "Musician Spotlight — Rome",
    caption: "",
    post_type: "spotlight",
    platform: "instagram",
    status: "draft",
    scheduled_date: d.nextMonth12,
    posted_date: null,
    image_url: null,
    gallery_photo_id: null,
    brand: "Greenway",
    ai_prompt: "",
    notes: "Use rehearsal photos",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-post-5",
    title: "KC Cocktail Hour Set",
    caption: "",
    post_type: "highlight",
    platform: "instagram",
    status: "draft",
    scheduled_date: d.nextMonth20,
    posted_date: null,
    image_url: null,
    gallery_photo_id: null,
    brand: "Kirby Collective",
    ai_prompt: "",
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const seedGalleries = [
  {
    id: "demo-gallery-1",
    name: "The Bell Tower on 34th",
    slug: "bell-tower-demo",
    pin: "1234",
    brand: "Greenway",
    description: "Lauren and James — October 2025",
    is_active: true,
    view_count: 12,
    photo_count: 0,
    created_at: "2025-10-15T00:00:00Z",
    updated_at: "2025-10-15T00:00:00Z",
  },
];
