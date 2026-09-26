// api/images.js
export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key missing" });

  let userQuery = (q || '').toLowerCase().trim();

  // 1. 추상적인 인사말이나 짧은 단어를 시각적 실체가 있는 풍경 단어로 매핑
  const queryMap = {
    'hi': 'sunrise landscape',
    'hello': 'open window view',
    'hey': 'morning light texture',
    'day': 'bright horizon',
    'sky': 'clear blue sky background' // sky 단독 대신 background 추가
  };

  let processedQuery = queryMap[userQuery] || userQuery;

  // 2. 인물이 절대 나올 수 없는 "배경/사물용" 접미사 강제 추가
  // 'person'을 빼는게 아니라 'background', 'texture', 'empty'를 더해서 사람을 밀어냅니다.
  const forcedSafeSuffix = " empty no-people background texture landscape";

  try {
    const randomPage = Math.floor(Math.random() * 15) + 1; // 중복 방지 오프셋
    let apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(processedQuery + forcedSafeSuffix)}&per_page=30&page=${randomPage}&orientation=landscape`;
    
    if (color) apiUrl += `&color=${encodeURIComponent(color)}`;

    const response = await fetch(apiUrl, { headers: { Authorization: apiKey } });
    const data = await response.json();
    
    // 3. 결과 필터링 (이미지 제목이나 설명에 사람 관련 단어가 있으면 코드에서 한 번 더 거름)
    const personKeywords = ['person', 'photographer', 'man', 'woman', 'girl', 'boy', 'camera', 'model', 'holding'];
    
    let filteredImages = data.photos ? data.photos.filter(photo => {
      // 사진 작가 이름이나 메타데이터에 '카메라/작가' 키워드가 너무 강한 것들을 제외
      const alt = (photo.alt || '').toLowerCase();
      return !personKeywords.some(badWord => alt.includes(badWord));
    }).map(p => p.src.large) : [];

    // 필터링 후 이미지가 너무 적으면 Curated(검증된 사진)로 대체
    if (filteredImages.length < 5) {
      const curatedRes = await fetch(`https://api.pexels.com/v1/curated?per_page=20&page=${randomPage}`);
      const curatedData = await curatedRes.json();
      filteredImages = curatedData.photos.map(p => p.src.large);
    }

    res.status(200).json({ images: filteredImages });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/nature/1200/800`] });
  }
}
