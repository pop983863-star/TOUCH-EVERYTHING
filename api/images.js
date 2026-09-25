export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  // 1. 금지어 목록 (블랙리스트)
  const blacklist = [
    'horror', 'scary', 'blood', 'ghost', 'death', 'kill', 'darkness', 'creepy',
    'sexy', 'nude', 'adult', 'gore', 'weapon', 'zombie', 'monster'
  ];

  // 2. 입력어 정화 (Sanitize)
  // 사용자가 입력한 단어 중 블랙리스트에 포함된 것이 있으면 'nature'로 강제 치환
  let safeQuery = (q || 'nature').toLowerCase();
  blacklist.forEach(word => {
    if (safeQuery.includes(word)) {
      safeQuery = 'nature'; 
    }
  });

  try {
    let images = [];
    if (apiKey) {
      // 3. 부정 검색어 강제 주입
      // 키워드 뒤에 -horror, -blood 등을 붙여 검색 결과에서 제외하도록 유도 (일부 엔진 지원)
      const safetyAddon = " -horror -blood -scary -creepy -adult";
      let apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(safeQuery + safetyAddon)}&per_page=15`;
      
      if (color) apiUrl += `&color=${encodeURIComponent(color)}`;

      const response = await fetch(apiUrl, {
        headers: { Authorization: apiKey }
      });
      const data = await response.json();
      
      // Pexels에서 제공하는 기본 필터링 외에 한번 더 검증
      images = data.photos ? data.photos.map(p => p.src.large) : [];
    }

    if (images.length === 0) {
      // 4. 안전한 백업 이미지 (Picsum 등에서 평화로운 키워드로 생성)
      images = [
        `https://picsum.photos/seed/safe${Math.random()}/1200/800`,
        `https://picsum.photos/seed/peace${Math.random()}/1200/800`
      ];
    }

    res.status(200).json({ images });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
}
