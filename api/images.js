export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key missing" });

  let userQuery = (q || '').toLowerCase().trim();

  // 1. 금지어 체크
  const dangerZone = ['sex', 'sexy', 'nude', 'porn', 'horror', 'scary', 'blood', 'hospital', 'medical', 'dead', 'gore'];
  const isDangerous = dangerZone.some(word => userQuery.includes(word));

  try {
    let apiUrl;
    const randomPage = Math.floor(Math.random() * 15) + 1;

    // 2. 검색어가 없거나 위험할 경우 "명예의 전당(Curated)" API 호출
    if (!userQuery || isDangerous) {
      apiUrl = `https://api.pexels.com/v1/curated?per_page=20&page=${randomPage}`;
    } else {
      // 3. 정상 검색 시 인물 배제 필터 자동 강화
      const strictExclusion = " scenery background empty no-people texture landscape -person -photographer";
      apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(userQuery + strictExclusion)}&per_page=20&page=${randomPage}&orientation=landscape`;
    }

    if (color) apiUrl += `&color=${encodeURIComponent(color)}`;

    const response = await fetch(apiUrl, { headers: { Authorization: apiKey } });
    const data = await response.json();
    
    // 4. [코드 레벨 필터] 인물/카메라 관련 태그가 있는 이미지를 마지막으로 한 번 더 거름
    let images = data.photos ? data.photos.filter(photo => {
      const altText = (photo.alt || '').toLowerCase();
      const personWords = ['person', 'man', 'woman', 'photographer', 'camera', 'holding', 'male', 'female', 'portrait'];
      return !personWords.some(word => altText.includes(word));
    }).map(p => p.src.large) : [];

    // 결과가 부족할 경우를 대비한 고화질 풍경 백업
    if (images.length < 5) {
      const backup = await fetch(`https://api.pexels.com/v1/curated?per_page=10&page=${randomPage + 1}`);
      const backupData = await backup.json();
      images = [...images, ...backupData.photos.map(p => p.src.large)];
    }

    res.status(200).json({ images });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/scenery/1200/800`] });
  }
}
