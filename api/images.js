export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  // 비주얼 감도를 높여주는 "매직 키워드" 리스트
  const visualEnhancers = [
    "cinematic", "moody", "abstract texture", "grainy", "high contrast", 
    "experimental", "minimalist architecture", "organic shapes", "macro details"
  ];

  try {
    let url = "";
    
    if (q && q.trim() !== "") {
      // 금지어 필터링은 최소한(NSFW, Gore 등)으로만 유지
      const forbidden = ["nude", "porn", "blood", "kill", "gore"];
      const isForbidden = forbidden.some(word => q.toLowerCase().includes(word));
      
      if (isForbidden) {
        url = `https://api.pexels.com/v1/curated?per_page=15`;
      } else {
        // [핵심] 사용자의 검색어에 무작위 디자인 형용사 추가
        const enhancer = visualEnhancers[Math.floor(Math.random() * visualEnhancers.length)];
        url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q + " " + enhancer)}&per_page=20`;
      }
    } else {
      url = `https://api.pexels.com/v1/curated?per_page=40`; // 결과 풀을 넓힘
    }

    if (!apiKey) {
      return res.status(200).json({
        images: [`https://picsum.photos/seed/${Math.random()}/1200/800`]
      });
    }

    const response = await fetch(url, { headers: { Authorization: apiKey } });
    const data = await response.json();
    
    // 단순한 첫 페이지 결과 대신, 결과 리스트에서 무작위로 섞어서 반환
    const images = data.photos 
      ? data.photos.map(p => p.src.large2x || p.src.large).sort(() => Math.random() - 0.5) 
      : [];
      
    res.status(200).json({ images });

  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/art/1200/800`] });
  }
}
