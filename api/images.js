// api/images.js
export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  try {
    // 1. API 키가 있는 경우 Pexels 호출
    if (apiKey) {
      const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=15`, {
        headers: { Authorization: apiKey }
      });
      const data = await response.json();
      
      if (data.photos && data.photos.length > 0) {
        const images = data.photos.map(p => p.src.large);
        return res.status(200).json({ images });
      }
    }

    // 2. 키가 없거나 검색 결과가 없는 경우 대체 이미지 반환 (동작 확인용)
    const placeholders = [
      `https://picsum.photos/seed/${q}1/1200/800`,
      `https://picsum.photos/seed/${q}2/1200/800`,
      `https://picsum.photos/seed/${q}3/1200/800`
    ];
    res.status(200).json({ images: placeholders });

  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/error/1200/800`] });
  }
}
