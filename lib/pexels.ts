const PEXELS_API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;

export async function fetchPexelsImage(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.warn('Pexels API key is missing; returning null image.');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: PEXELS_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      console.error('Pexels fetch failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.photos?.[0]?.src?.medium || null;
  } catch (error) {
    console.error('Error fetching from Pexels:', error);
    return null;
  }
}
