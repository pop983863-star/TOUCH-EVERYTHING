export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key missing" });

  // 1. 금지어 발견 시 즉시 'curated' 모드로 전환하기 위한 리스트
  const forbidden = ['horror', 'scary', 'blood', 'gore', 'dead', 'ghost', 'kill', 'creepy', 'dark', 'pain'];
  const query = (q || '').toLowerCase();
  const isUnsafe = forbidden.some(word => query.includes(word));

  try {
    let apiUrl;
    
    // 2. 사용자의 단어가 안전하고 존재한다면 search, 아니면 curated(검증된 사진들) 호출
    if (q && !isUnsafe) {
      // 긍정적인 단어(serene, beautiful)만 덧붙여서 분위기를 밝게 유도
      apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q + " serene beautiful")}&per_page=15&orientation=landscape`;
    } else {
      // 위험한 단어거나 입력이 없을 때: Pexels에서 엄선한 고화질 안전 사진(Curated)만 가져옴
      apiUrl = `https://api.pexels.com/v1/curated?per_page=15`;
    }

    if (color) {
      // 컬러 탐험 시에는 컬러 파라미터 추가
      apiUrl += `&color=${encodeURIComponent(color)}`;
    }

    const response = await fetch(apiUrl, {
      headers: { Authorization: apiKey }
    });
    const data = await response.json();
    
    let images = data.photos ? data.photos.map(p => p.src.large) : [];

    // 결과가 0개일 경우를 대비한 최후의 안전한 자연 이미지
    if (images.length === 0) {
      images = [`https://images.pexels.com/photos/2817421/pexels-photo-2817421.jpeg?auto=compress&cs=tinysrgb&w=1200`];
    }

    res.status(200).json({ images });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/nature/1200/800`] });
  }
}
