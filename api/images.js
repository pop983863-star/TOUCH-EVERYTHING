export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key missing" });

  // 1. 차단 키워드
  const dangerZone = ['sex', 'sexy', 'nude', 'adult', 'horror', 'scary', 'blood', 'hospital', 'medical', 'dead', 'gore'];
  let userQuery = (q || '').toLowerCase().trim();
  const isDangerous = dangerZone.some(word => userQuery.includes(word));
  
  // 2. 인물 사진을 피하기 위한 강력한 보조 키워드 (사람, 카메라 등 배제)
  const exclusion = " -person -people -man -woman -photographer -camera -face -holding";
  
  let finalQuery;
  if (!userQuery || isDangerous) {
    // 검색어가 없거나 위험할 때 평화로운 풍경 중 랜덤 선택
    const landscapePicks = ['serene landscape', 'misty mountain', 'calm ocean', 'forest morning', 'minimal architecture', 'clear sky'];
    finalQuery = landscapePicks[Math.floor(Math.random() * landscapePicks.length)];
  } else {
    // 사용자 검색어에 배제 필터 적용
    finalQuery = userQuery + exclusion;
  }

  try {
    // 매번 다른 페이지를 불러와 중복 방지 (1~15페이지 랜덤)
    const randomPage = Math.floor(Math.random() * 15) + 1;
    let apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(finalQuery)}&per_page=25&page=${randomPage}&orientation=landscape`;
    
    if (color) apiUrl += `&color=${encodeURIComponent(color)}`;

    const response = await fetch(apiUrl, { headers: { Authorization: apiKey } });
    const data = await response.json();
    let images = data.photos ? data.photos.map(p => p.src.large) : [];

    // 결과가 너무 적으면 예비용 고품질 사진 추가
    if (images.length < 5) {
      images = [...images, "https://images.pexels.com/photos/2817421/pexels-photo-2817421.jpeg"];
    }
    res.status(200).json({ images });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/${Math.random()}/1200/800`] });
  }
}
