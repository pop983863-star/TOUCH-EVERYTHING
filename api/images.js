export default async function handler(req, res) {
  const { q, color } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key missing" });

  const dangerZone = [
    'sex', 'sexy', 'nude', 'adult', 'porn', 'horror', 'scary', 'blood', 
    'hospital', 'clinic', 'medical', 'doctor', 'surgery', 'patient', 'dentist',
    'gore', 'dead', 'creepy', 'pain', 'kill', 'zombie', 'weapon'
  ];

  let userQuery = (q || '').toLowerCase().trim();
  const isDangerous = dangerZone.some(word => userQuery.includes(word));
  
  let finalQuery;
  if (!userQuery || isDangerous) {
    // [수정] 검색어가 없거나 위험할 때 풍경 이미지 키워드 중 랜덤 선택
    const landscapePicks = [
      'serene mountain landscape', 
      'calm ocean horizon', 
      'dense misty forest', 
      'scenic valley nature', 
      'beautiful sunset clouds',
      'arctic ice landscape',
      'autumn forest hills'
    ];
    finalQuery = landscapePicks[Math.floor(Math.random() * landscapePicks.length)];
  } else {
    finalQuery = userQuery + " professional photography";
  }

  try {
    let apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(finalQuery)}&per_page=20&orientation=landscape`;
    if (color) apiUrl += `&color=${encodeURIComponent(color)}`;

    const response = await fetch(apiUrl, { headers: { Authorization: apiKey } });
    const data = await response.json();
    let images = data.photos ? data.photos.map(p => p.src.large) : [];

    if (images.length < 5) {
      images = [...images, "https://images.pexels.com/photos/2817421/pexels-photo-2817421.jpeg"];
    }
    res.status(200).json({ images });
  } catch (error) {
    res.status(200).json({ images: [`https://picsum.photos/seed/landscape/1200/800`] });
  }
}
