export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key missing" });

  // 1. 아주 넓은 범위의 위험 단어 감지 리스트
  const dangerZone = [
    'horror', 'scary', 'blood', 'gore', 'dead', 'ghost', 'kill', 'creepy', 
    'dark', 'pain', 'scream', 'fear', 'nightmare', 'evil', 'monster', 'zombie',
    'weapon', 'gun', 'knife', 'fight', 'war', 'skull', 'grave'
  ];

  let userQuery = (q || '').toLowerCase().trim();
  
  // 2. 위험 단어가 하나라도 포함되면 즉시 "평화로운 자연"으로 검색어 강제 전환
  const isDangerous = dangerZone.some(word => userQuery.includes(word));
  
  // 3. 긍정적인 이미지만 나오게 하는 마법의 접미사 (Exclusion 기호 삭제)
  const positiveBoost = " bright aesthetic high-quality professional";
  
  let finalQuery;
  if (!userQuery || isDangerous) {
    // 입력이 없거나 위험하면 평화로운 테마 중 랜덤 선택
    const safePicks = ['sunny morning', 'clear blue sky', 'minimal design', 'spring garden', 'white modern architecture'];
    finalQuery = safePicks[Math.floor(Math.random() * safePicks.length)];
  } else {
    // 안전한 입력일 때만 사용자 검색어 + 긍정 보정
    finalQuery = userQuery + positiveBoost;
  }

  try {
    // orientation=landscape를 강제하여 기괴한 세로형 이미지 배제
    let apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(finalQuery)}&per_page=20&orientation=landscape`;
    
    if (color) apiUrl += `&color=${encodeURIComponent(color)}`;

    const response = await fetch(apiUrl, {
      headers: { Authorization: apiKey }
    });
    const data = await response.json();
    
    let images = data.photos ? data.photos.map(p => p.src.large) : [];

    // 검색 결과가 없거나 적을 때를 대비한 3중 안전망 (검증된 고화질 풍경 사진들)
    if (images.length < 5) {
      const fallbackImages = [
        "https://images.pexels.com/photos/2817421/pexels-photo-2817421.jpeg",
        "https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg",
        "https://images.pexels.com/photos/709552/pexels-photo-709552.jpeg"
      ];
      images = [...images, ...fallbackImages];
    }

    res.status(200).json({ images });
  } catch (error) {
    // 서버 에러 시 Picsum에서 안전한 seed로 이미지 호출
    res.status(200).json({ images: [`https://picsum.photos/seed/peaceful/1200/800`] });
  }
}
