export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    // API 키가 없을 때의 더미 데이터
    return res.status(200).json({
      images: [
        "https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400",
        "https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=400"
      ]
    });
  }

  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=5`, {
      headers: { Authorization: apiKey }
    });
    const data = await response.json();
    res.status(200).json({ images: data.photos.map(p => p.src.large) });
  } catch (e) {
    res.status(500).json({ error: "API fetch failed" });
  }
}