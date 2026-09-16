export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  try {
    let images = [];
    if (apiKey) {
      const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=15`, {
        headers: { Authorization: apiKey }
      });
      const data = await response.json();
      images = data.photos ? data.photos.map(p => p.src.large) : [];
    }

    // 만약 API 키 설정이 안 되어 있거나 결과가 없으면, 
    // 작동 확인을 위해 랜덤 이미지를 무조건 반환합니다.
    if (images.length === 0) {
      images = [
        `https://picsum.photos/seed/${q}1/1200/800`,
        `https://picsum.photos/seed/${q}2/1200/800`,
        `https://picsum.photos/seed/${q}3/1200/800`
      ];
    }

    res.status(200).json({ images });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/error/1200/800`] });
  }
}
