export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  try {
    let images = [];
    if (apiKey) {
      const response = await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=15`, {
        headers: { Authorization: apiKey }
      });
      const data = await response.json();
      images = data.photos ? data.photos.map(p => p.src.large) : [];
    }

    // API 키가 없거나 검색 결과가 없으면 랜덤 이미지 반환 (작동 확인용)
    if (images.length === 0) {
      images = [
        `https://picsum.photos/seed/${Math.random()}/1200/800`,
        `https://picsum.photos/seed/${Math.random()}/1200/800`,
        `https://picsum.photos/seed/${Math.random()}/1200/800`
      ];
    }

    res.status(200).json({ images });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/err/1200/800`] });
  }
}
