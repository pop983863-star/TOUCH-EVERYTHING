import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const COLUMN_STRUCTURE = [3, 4, 3, 4, 3];
const TOTAL_NODES = 17;
const INITIAL_LOGO_INDICES = [3, 13]; 
const SAFE_FALLBACKS = ['sunny day', 'modern architecture', 'clear blue ocean', 'green forest', 'minimalist design'];

const generateGridNodes = () => {
  const nodes = [];
  const gap = 100;
  COLUMN_STRUCTURE.forEach((rowCount, colIndex) => {
    const offsetY = rowCount === 3 ? 50 : 0;
    for (let i = 0; i < rowCount; i++) {
      nodes.push({ id: nodes.length, x: colIndex * gap, y: i * gap + offsetY });
    }
  });
  return nodes;
};

function App() {
  const [view, setView] = useState('home'); 
  const [lastSubView, setLastSubView] = useState('about'); 
  const [inputText, setInputText] = useState('');
  const [nodes] = useState(generateGridNodes());
  const [mode, setMode] = useState('static'); 
  const [activeIndices, setActiveIndices] = useState(INITIAL_LOGO_INDICES);
  const [currentBgImage, setCurrentBgImage] = useState('');
  
  const [dotSize, setDotSize] = useState(15);
  const [isZooming, setIsZooming] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const canvasRef = useRef(null);
  const imageBuffer = useRef(null);
  
  const lastInteractionTime = useRef(Date.now()); 
  const subPageActivityTime = useRef(Date.now()); 

  const preloadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(url);
      img.onerror = () => resolve(url);
    });
  };

  // --- [수정] 사용자 키워드 우선 이미지 검색 함수 ---
  const fetchNewImage = async (query = '', color = null) => {
    // 1. 금지어 검사
    const badWords = ['horror', 'scary', 'blood', 'gore', 'ghost', 'kill', 'death'];
    const isUnsafe = badWords.some(bw => query.toLowerCase().includes(badWords));
    
    // 2. 안전한 쿼리 결정
    let safeQuery = query.trim();
    if (isUnsafe || safeQuery === '') {
      safeQuery = SAFE_FALLBACKS[Math.floor(Math.random() * SAFE_FALLBACKS.length)];
    }

    try {
      let url = `/api/images?q=${encodeURIComponent(safeQuery)}`;
      if (color) url += `&color=${encodeURIComponent(color)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.images && data.images.length > 0) {
        // 여러 장 중 무작위 하나 선택하여 다양성 확보
        const nextImgUrl = data.images[Math.floor(Math.random() * data.images.length)];
        await preloadImage(nextImgUrl);
        setCurrentBgImage(nextImgUrl);
      }
    } catch (e) {
      const fallback = `https://picsum.photos/seed/${Math.random()}/1200/800`;
      await preloadImage(fallback);
      setCurrentBgImage(fallback);
    }
  };

  const handleHomeInteraction = (val) => {
    setInputText(val);
    lastInteractionTime.current = Date.now();
    subPageActivityTime.current = Date.now();
    if (mode === 'static' && val.trim() !== '') {
      setMode('interactive');
      fetchNewImage(val); // 타이핑한 글자로 이미지 검색
    }
  };

  const moveLogos = useCallback(() => {
    setActiveIndices(() => {
      let first = Math.floor(Math.random() * TOTAL_NODES);
      let second = Math.floor(Math.random() * TOTAL_NODES);
      while (second === first) second = Math.floor(Math.random() * TOTAL_NODES);
      return [first, second];
    });
  }, []);

  // --- EVERYTHING 망점 드로잉 ---
  const drawHalftone = useCallback(async () => {
    if (view !== 'everything' || !canvasRef.current || !currentBgImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = currentBgImage;

    img.onload = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageBuffer.current = imageDataObj;

      if (dotSize <= 1) return; // 덴시티 1일 때 원본

      const data = imageDataObj.data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let h = 0; h < canvas.height; h += dotSize) {
        for (let w = 0; w < canvas.width; w += dotSize) {
          const i = (Math.floor(h) * canvas.width + Math.floor(w)) * 4;
          ctx.fillStyle = `rgb(${data[i]},${data[i+1]},${data[i+2]})`;
          ctx.beginPath(); ctx.arc(w, h, dotSize * 0.43, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
  }, [view, currentBgImage, dotSize]);

  useEffect(() => { if (view === 'everything') drawHalftone(); }, [drawHalftone, view]);

  const handleHalftoneClick = (e) => {
    if (isZooming || !imageBuffer.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    const data = imageBuffer.current.data;
    const i = (y * canvasRef.current.width + x) * 4;
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    const hex = rgbToHex(data[i], data[i+1], data[i+2]);
    setSelectedColor(hex);
    setIsZooming(true);
    // 에브리띵 페이지에서 컬러 클릭 시: 기존 키워드 + 컬러 조합
    fetchNewImage(inputText || 'minimal', hex).then(() => {
      setTimeout(() => { setIsZooming(false); setSelectedColor(null); }, 1500);
    });
  };

  // 타이머/시퀀스 로직
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (view === 'home') {
        const diff = (now - lastInteractionTime.current) / 1000;
        if (mode === 'interactive' && diff >= 10) {
          setMode('static'); setActiveIndices(INITIAL_LOGO_INDICES);
        } else if (mode === 'static' && diff >= 20 && diff < 50) {
          if (mode !== 'slideshow') { setMode('slideshow'); fetchNewImage(''); }
        } else if (mode === 'slideshow' && diff >= 50) {
          setMode('static'); setActiveIndices(INITIAL_LOGO_INDICES);
        }
      } else {
        if ((now - subPageActivityTime.current) / 1000 >= 180) { setView('home'); setMode('static'); }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, view]);

  useEffect(() => {
    if (view === 'home' && mode !== 'static') {
      const interval = setInterval(() => { moveLogos(); fetchNewImage(inputText); }, 5000);
      return () => clearInterval(interval);
    }
  }, [mode, view, moveLogos, inputText]);

  // 렌더링 파트
  const renderNav = () => (
    <nav className="top-nav">
      {['about', 'identity', 'objects'].map(v => (
        <button key={v} className={view === v ? 'active' : ''} onClick={() => { setView(v); setLastSubView(v); }}>{v.toUpperCase()}</button>
      ))}
      <button className={view === 'everything' ? 'active' : ''} onClick={() => { setView('everything'); fetchNewImage(inputText || 'nature'); }}>EVERYTHING</button>
    </nav>
  );

  const HomeLogo = () => (
    <div className="home-back-btn" onClick={() => {
      if (view === 'everything') setView(lastSubView);
      else { setView('home'); setMode('static'); }
    }}>
      <img src="/assets/logo-reference.png" alt="Home" />
    </div>
  );

  return (
    <div className="app-root-container">
      {view === 'home' && (
        <div className="page-home">
          <div className="viewport">
            <div className="main-grid-wrapper">
              <div className={`layer-static ${mode === 'static' ? 'on' : ''}`}><img src="/assets/initial-grid.png" alt="Static" className="pixel-perfect" /></div>
              <div className={`layer-dynamic ${mode !== 'static' ? 'on' : ''}`}>
                {nodes.map(n => (
                  <div key={n.id} className="mask-circle" style={{ left: n.x, top: n.y, backgroundImage: currentBgImage ? `url(${currentBgImage})` : 'none', backgroundPosition: `-${n.x}px -${n.y}px`, backgroundSize: '496px 396px' }} />
                ))}
                {activeIndices.map((idx, i) => (
                  <div key={i} className="logo-overlay-marker clickable" style={{ transform: `translate(${nodes[idx].x}px, ${nodes[idx].y}px)` }} onClick={() => { setView('about'); setLastSubView('about'); }}><img src="/assets/logo-reference.png" alt="Logo" /></div>
                ))}
              </div>
            </div>
          </div>
          <footer className="footer-layout">
            <div className="footer-container">
              <form onSubmit={e => { e.preventDefault(); fetchNewImage(inputText); }} className="footer-form">
                <input value={inputText} onChange={e => handleHomeInteraction(e.target.value)} placeholder="TYPE TO START" inputMode="text" />
              </form>
              {mode !== 'static' && <div className="footer-hint">TOUCH SYMBOL</div>}
            </div>
          </footer>
        </div>
      )}

      {['about', 'identity', 'objects'].includes(view) && (
        <div className="page-sub">
          {renderNav()}
          <div className="content-area">
            <h1 className="sub-title">{view.toUpperCase()}</h1>
            <p className="sub-desc">Brand System Documentation for {view}.</p>
          </div>
          <HomeLogo />
        </div>
      )}

      {view === 'everything' && (
        <div className={`page-everything ${isZooming ? 'zooming' : ''}`}>
          <canvas ref={canvasRef} onClick={handleHalftoneClick} />
          <div className="halftone-controls-wrapper">
            <div className="halftone-box">
              <span>DENSITY</span>
              <input type="range" min="1" max="60" value={dotSize} onChange={e => setDotSize(parseInt(e.target.value))} />
            </div>
          </div>
          <div className="everything-zoom-hint">CLICK ANYWHERE TO ZOOM INTO COLOR</div>
          <HomeLogo />
        </div>
      )}
    </div>
  );
}

export default App;
