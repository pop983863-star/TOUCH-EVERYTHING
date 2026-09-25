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
  const [view, setView] = useState('home'); 
  const [inputText, setInputText] = useState('');
  const [nodes] = useState(generateGridNodes());
  const [mode, setMode] = useState('static'); 
  const [activeIndices, setActiveIndices] = useState(INITIAL_LOGO_INDICES);
  const [currentBgImage, setCurrentBgImage] = useState('');
  
  // EVERYTHING 챕터 전용
  const [dotSize, setDotSize] = useState(15);
  const [isZooming, setIsZooming] = useState(false);
  const canvasRef = useRef(null);
  
  const lastInteractionTime = useRef(Date.now()); 
  const subPageActivityTime = useRef(Date.now()); 

  // --- 이미지 프리로딩 (안정성 강화) ---
  const preloadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = "Anonymous"; // 보안 설정
      img.onload = () => resolve(url);
      img.onerror = () => resolve(url); // 에러 시에도 진행
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
      }
    } catch (e) {
      const fallback = `https://picsum.photos/seed/${Math.random()}/1200/800`;
      setCurrentBgImage(fallback);
    }
  };

  // --- 홈 인터랙션 핸들러 ---
  const handleHomeInteraction = (val) => {
    setInputText(val);
    lastInteractionTime.current = Date.now();
    subPageActivityTime.current = Date.now();
    
    if (mode === 'static' && val.trim() !== '') {
      setMode('interactive');
      fetchNewImage(val);
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

  // --- 망점 그래픽 그리기 (EVERYTHING 전용) ---
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
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let h = 0; h < canvas.height; h += dotSize) {
          for (let w = 0; w < canvas.width; w += dotSize) {
            const index = (h * canvas.width + w) * 4;
            const r = imageData[index];
            const g = imageData[index + 1];
            const b = imageData[index + 2];
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.arc(w, h, dotSize * 0.42, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } catch (e) {
        console.error("CORS 보안으로 인한 망점 데이터 접근 불가");
      }
    };
  }, [view, currentBgImage, dotSize]);

  useEffect(() => {
    if (view === 'everything') drawHalftone();
  }, [drawHalftone, view]);

  // --- 타이머 & 시퀀스 ---
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

  useEffect(() => {
    const reset = () => { subPageActivityTime.current = Date.now(); };
    window.addEventListener('mousemove', reset);
    window.addEventListener('touchstart', reset);
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
    };
  }, []);

  useEffect(() => {
    if (view === 'home' && mode !== 'static') {
      const interval = setInterval(() => {
        moveLogos();
        fetchNewImage(inputText || 'minimal');
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [mode, view, moveLogos, inputText]);

  // --- 렌더링 ---
  const renderNav = () => (
    <nav className="top-nav">
      <button className={view === 'about' ? 'active' : ''} onClick={() => setView('about')}>ABOUT</button>
      <button className={view === 'identity' ? 'active' : ''} onClick={() => setView('identity')}>IDENTITY</button>
      <button className={view === 'objects' ? 'active' : ''} onClick={() => setView('objects')}>OBJECTS</button>
      <button className={view === 'everything' ? 'active' : ''} onClick={() => { setView('everything'); fetchNewImage('color'); }}>EVERYTHING</button>
    </nav>
  );

  return (
    <div className="app-root-container">
      {view === 'home' && (
        <div className="page-home">
          <div className="viewport">
            <div className="main-grid-wrapper">
              <div className={`layer-static ${mode === 'static' ? 'on' : ''}`}>
                <img src="/assets/initial-grid.png" alt="Static" className="pixel-perfect" />
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
              <form onSubmit={(e) => { e.preventDefault(); fetchNewImage(inputText); }} className="footer-form">
                <input value={inputText} onChange={(e) => handleHomeInteraction(e.target.value)} placeholder="TYPE TO START" inputMode="text" />
              </form>
              {mode !== 'static' && <div className="footer-hint">TOUCH SYMBOL</div>}
            </div>
          </footer>
        </div>
      )}

      {(view === 'about' || view === 'identity' || view === 'objects') && (
        <div className="page-sub">
          {renderNav()}
          <div className="content-area">
            <h1 className="sub-title">{view.toUpperCase()}</h1>
            <p className="sub-desc">Experimental Design Systems for {view}.</p>
          </div>
          <div className="home-back-btn" onClick={() => { setView('home'); setMode('static'); }}>
            <img src="/assets/logo-reference.png" alt="Home" />
          </div>
        </div>
      )}

      {view === 'everything' && (
        <div className={`page-everything ${isZooming ? 'zooming' : ''}`}>
          {renderNav()}
          <canvas ref={canvasRef} onClick={() => {
            if (isZooming) return;
            setIsZooming(true);
            fetchNewImage('texture').then(() => setTimeout(() => setIsZooming(false), 1500));
          }} />
          <div className="halftone-controls">
            <span>DENSITY</span>
            <input type="range" min="8" max="50" value={dotSize} onChange={(e) => setDotSize(parseInt(e.target.value))} />
          </div>
          <div className="home-back-btn" onClick={() => setView('home')}>
            <img src="/assets/logo-reference.png" alt="Home" />
          </div>
          <div className="everything-hint">CLICK TO ZOOM INTO EVERYTHING</div>
        </div>
      )}
    </div>
  );
}

export default App;
