export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "Missing API Key" });

  // 1. 진짜 위험한 것만 걸러내는 최소한의 블랙리스트
  const forbidden = ['horror', 'gore', 'dead', 'blood', 'zombie', 'ghost', 'pain', 'scary'];
  const query = (q || '').toLowerCase();
  const isUnsafe = forbidden.some(word => query.includes(word));

  try {
    let apiUrl;
    // 2. 검색 엔진에게 "이 단어들이 포함된 태그는 결과에서 빼줘"라고만 요청 (Negative Filter)
    // 사용자 검색어에 영향을 주지 않으면서 필터링만 수행
    const strictExclusion = " -horror -gore -blood -dead -scary -creepy";

    if (q && !isUnsafe) {
      // 사용자의 검색어 그대로 사용 (다양성 확보)
      apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q + strictExclusion)}&per_page=20&orientation=landscape`;
    } else {
      // 금지어거나 비어있을 때만 무작위 고화질 이미지
      apiUrl = `https://api.pexels.com/v1/curated?per_page=20`;
    }

    if (color) apiUrl += `&color=${encodeURIComponent(color)}`;

    const response = await fetch(apiUrl, { headers: { Authorization: apiKey } });
    const data = await response.json();
    
    let images = data.photos ? data.photos.map(p => p.src.large) : [];

    if (images.length === 0) {
      images = [`https://picsum.photos/seed/${Math.random()}/1200/800`];
    }

    res.status(200).json({ images });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/safe/1200/800`] });
  }
}
