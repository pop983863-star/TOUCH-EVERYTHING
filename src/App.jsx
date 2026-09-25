import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const COLUMN_STRUCTURE = [3, 4, 3, 4, 3];
const TOTAL_NODES = 17;
const INITIAL_LOGO_INDICES = [3, 13]; 

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
  // --- 상태 관리 ---
  const [view, setView] = useState('home'); // home, about, identity, objects, everything
  const [inputText, setInputText] = useState('');
  const [nodes] = useState(generateGridNodes());
  const [mode, setMode] = useState('static'); 
  const [activeIndices, setActiveIndices] = useState(INITIAL_LOGO_INDICES);
  const [currentBgImage, setCurrentBgImage] = useState('');
  
  // EVERYTHING 페이지 전용 상태
  const [dotSize, setDotSize] = useState(15);
  const [isZooming, setIsZooming] = useState(false);
  const canvasRef = useRef(null);
  
  const lastInteractionTime = useRef(Date.now()); 
  const subPageActivityTime = useRef(Date.now()); 

  // --- 이미지 fetch 및 프리로딩 ---
  const preloadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Canvas 픽셀 읽기를 위해 필요
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const fetchNewImage = async (query = 'minimal') => {
    try {
      const res = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        const nextImgUrl = data.images[Math.floor(Math.random() * data.images.length)];
        await preloadImage(nextImgUrl);
        setCurrentBgImage(nextImgUrl);
        return nextImgUrl;
      }
    } catch (e) {
      const fallback = `https://picsum.photos/seed/${Math.random()}/1200/800`;
      setCurrentBgImage(fallback);
      return fallback;
    }
  };

  // --- EVERYTHING 망점 그래픽 로직 ---
  const drawHalftone = useCallback(async () => {
    if (view !== 'everything' || !canvasRef.current || !currentBgImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = await preloadImage(currentBgImage);
    if (!img) return;

    // 캔버스 크기를 브라우저에 맞춤
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 이미지를 화면에 꽉 차게 그리기 위한 비율 계산
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 망점 그리기
    for (let h = 0; h < canvas.height; h += dotSize) {
      for (let w = 0; w < canvas.width; w += dotSize) {
        const index = (h * canvas.width + w) * 4;
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(w, h, dotSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [view, currentBgImage, dotSize]);

  useEffect(() => {
    drawHalftone();
  }, [drawHalftone]);

  // 클릭 시 해당 색상으로 줌인 및 이미지 교체
  const handleEverythingClick = (e) => {
    if (isZooming) return;
    setIsZooming(true);
    // 무한 줌을 시각화하기 위해 새로운 이미지 호출
    fetchNewImage('color-texture').then(() => {
      setTimeout(() => setIsZooming(false), 1500);
    });
  };

  // --- 기존 로직 (Home 시퀀스 등) 유지 ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (view === 'home') {
        const diff = (now - lastInteractionTime.current) / 1000;
        if (mode === 'interactive' && diff >= 10) {
          setMode('static');
          setActiveIndices(INITIAL_LOGO_INDICES);
        } else if (mode === 'static' && diff >= 20 && diff < 50) {
          if (mode !== 'slideshow') { setMode('slideshow'); fetchNewImage('nature'); }
        } else if (mode === 'slideshow' && diff >= 50) {
          setMode('static'); setActiveIndices(INITIAL_LOGO_INDICES);
        }
      }
      if (view !== 'home' && (now - subPageActivityTime.current) / 1000 >= 180) {
        setView('home'); setMode('static');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, view]);

  // --- 렌더링 함수들 ---
  const renderNav = () => (
    <nav className="top-nav">
      <button className={view === 'about' ? 'active' : ''} onClick={() => setView('about')}>ABOUT</button>
      <button className={view === 'identity' ? 'active' : ''} onClick={() => setView('identity')}>IDENTITY</button>
      <button className={view === 'objects' ? 'active' : ''} onClick={() => setView('objects')}>OBJECTS</button>
      <button className={view === 'everything' ? 'active' : ''} onClick={() => { setView('everything'); fetchNewImage('vivid'); }}>EVERYTHING</button>
    </nav>
  );

  return (
    <div className="app-root-container">
      {/* 1. HOME VIEW */}
      {view === 'home' && (
        <div className="page-home">
          <div className="viewport">
            <div className="main-grid-wrapper">
              <div className={`layer-static ${mode === 'static' ? 'on' : ''}`}>
                <img src="/assets/initial-grid.png" alt="Static" />
              </div>
              <div className={`layer-dynamic ${mode !== 'static' ? 'on' : ''}`}>
                {nodes.map((node) => (
                  <div key={node.id} className="mask-circle"
                    style={{ 
                      left: `${node.x}px`, top: `${node.y}px`,
                      backgroundImage: currentBgImage ? `url(${currentBgImage})` : 'none',
                      backgroundPosition: `-${node.x}px -${node.y}px`,
                      backgroundSize: '496px 396px' 
                    }}
                  />
                ))}
                {activeIndices.map((idx, i) => (
                  <div key={`marker-${i}`} className="logo-overlay-marker clickable"
                    style={{ transform: `translate(${nodes[idx].x}px, ${nodes[idx].y}px)` }}
                    onClick={() => setView('about')}
                  >
                    <img src="/assets/logo-reference.png" alt="Logo" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <footer className="footer-layout">
            <div className="footer-container">
              <form onSubmit={(e) => e.preventDefault()} className="footer-form">
                <input value={inputText} onChange={(e) => { setInputText(e.target.value); lastInteractionTime.current = Date.now(); if (mode === 'static' && e.target.value !== '') { setMode('interactive'); fetchNewImage(e.target.value); } }} placeholder="TYPE TO START" />
              </form>
              {mode !== 'static' && <div className="footer-hint">TOUCH SYMBOL</div>}
            </div>
          </footer>
        </div>
      )}

      {/* 2. SUB PAGES (About, Identity, Objects) */}
      {(view === 'about' || view === 'identity' || view === 'objects') && (
        <div className="page-sub">
          {renderNav()}
          <div className="content-area">
            <h1 className="sub-title">{view.toUpperCase()}</h1>
            <p className="sub-desc">Design System Exploration for {view}.</p>
          </div>
          <div className="home-back-btn" onClick={() => { setView('home'); setMode('static'); }}>
            <img src="/assets/logo-reference.png" alt="Home" />
          </div>
        </div>
      )}

      {/* 3. EVERYTHING VIEW (Halftone Explorer) */}
      {view === 'everything' && (
        <div className={`page-everything ${isZooming ? 'zooming' : ''}`}>
          {renderNav()}
          <canvas ref={canvasRef} onClick={handleEverythingClick} />
          
          <div className="halftone-controls">
            <span>DENSITY</span>
            <input 
              type="range" min="5" max="50" step="1" 
              value={dotSize} 
              onChange={(e) => setDotSize(parseInt(e.target.value))} 
            />
          </div>

          <div className="home-back-btn" onClick={() => setView('home')}>
            <img src="/assets/logo-reference.png" alt="Home" />
          </div>
          <div className="everything-hint">CLICK ANYWHERE TO ZOOM INTO COLOR</div>
        </div>
      )}
    </div>
  );
}

export default App;
