export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  // API 키가 없으면 샘플 이미지를 반환하여 디자인이 깨지지 않게 함
  if (!apiKey) {
    return res.status(200).json({
      images: [
        `https://picsum.photos/seed/${Math.random()}/1200/800`,
        `https://picsum.photos/seed/${Math.random()}/1200/800`
      ]
    });
  }

  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=10`, {
      headers: { Authorization: apiKey }
    });
    const data = await response.json();
    const images = data.photos.map(p => p.src.large);
    res.status(200).json({ images });
  } catch (error) {
    res.status(500).json({ error: "API fetch failed" });
  }
}
