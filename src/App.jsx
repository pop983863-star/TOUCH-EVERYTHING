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
  const [view, setView] = useState('home'); 
  const [lastSubView, setLastSubView] = useState('about');
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
  const inputRef = useRef(null);

  const preloadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url; img.crossOrigin = "Anonymous";
      img.onload = () => resolve(url); img.onerror = () => resolve(url);
    });
  };

  const fetchNewImage = async (query = '', color = null) => {
    try {
      const res = await fetch(`/api/images?q=${encodeURIComponent(query)}${color ? `&color=${encodeURIComponent(color)}` : ''}`);
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        const nextImgUrl = data.images[Math.floor(Math.random() * data.images.length)];
        await preloadImage(nextImgUrl);
        setCurrentBgImage(nextImgUrl);
      }
    } catch (e) {
      setCurrentBgImage(`https://picsum.photos/seed/nature/1200/800`);
    }
  };

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

  const drawHalftone = useCallback(async () => {
    if (view !== 'everything' || !canvasRef.current || !currentBgImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = currentBgImage;
    img.onload = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageBuffer.current = imageDataObj;
      if (dotSize <= 1) return;
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

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (view === 'home' && !isFocused) {
        const diff = (now - lastInteractionTime.current) / 1000;
        if (mode === 'interactive' && diff >= 12) { setMode('static'); setActiveIndices(INITIAL_LOGO_INDICES); }
        else if (mode === 'static' && diff >= 25 && diff < 55) { if (mode !== 'slideshow') { setMode('slideshow'); fetchNewImage(''); } }
        else if (mode === 'slideshow' && diff >= 55) { setMode('static'); setActiveIndices(INITIAL_LOGO_INDICES); }
      } else if (view !== 'home' && (now - subPageActivityTime.current) / 1000 >= 180) { setView('home'); setMode('static'); }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, view, isFocused]);

  useEffect(() => {
    if (view === 'home' && mode !== 'static' && !isFocused) {
      const interval = setInterval(() => { moveLogos(); if (mode === 'slideshow') fetchNewImage(''); }, 7500);
      return () => clearInterval(interval);
    }
  }, [mode, view, moveLogos, isFocused]);

  const renderNav = () => (
    <nav className="top-nav">
      {['about', 'identity', 'objects'].map(v => (
        <button key={v} className={view === v ? 'active' : ''} onClick={() => { setView(v); setLastSubView(v); }}>{v.toUpperCase()}</button>
      ))}
      <button onClick={() => { setView('everything'); fetchNewImage(inputText); }}>EVERYTHING</button>
    </nav>
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
              {/* [수정] 텍스트가 잘리지 않고 중앙 정렬을 유지하는 가변 입력 영역 */}
              <div className={`editorial-input-block ${isFocused || inputText ? 'is-active' : ''}`} onClick={() => inputRef.current?.focus()}>
                <span className="touch-label">TOUCH</span>
                <span className="editorial-comma">,</span>
                <div className="flexible-input-container">
                  <input 
                    ref={inputRef}
                    value={inputText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChange={e => handleHomeInteraction(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {/* 글자 길이에 맞춰 너비를 벌려주는 투명 장치 (중복 렌더링 없음) */}
                  <span className="ghost-width-measure">{inputText}</span>
                  <div className="editorial-cursor"></div>
                </div>
              </div>
              {(mode !== 'static' || inputText) && <div className="footer-hint">TOUCH SYMBOL</div>}
            </div>
          </footer>
        </div>
      )}

      {['about', 'identity', 'objects'].includes(view) && (
        <div className="page-sub">
          {renderNav()}
          <div className="content-area">
            <h1 className="sub-title">{view.toUpperCase()}</h1>
            <p className="sub-desc">Experimental Design System for {view}.</p>
          </div>
          <div className="home-back-btn" onClick={() => { setView('home'); setMode('static'); }}><img src="/assets/logo-reference.png" alt="Home" /></div>
        </div>
      )}

      {view === 'everything' && (
        <div className={`page-everything ${isZooming ? 'zooming' : ''}`}>
          <canvas ref={canvasRef} onClick={(e) => {
            if (isZooming || !imageBuffer.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = Math.floor(e.clientX - rect.left);
            const y = Math.floor(e.clientY - rect.top);
            const data = imageBuffer.current.data;
            const i = (y * canvasRef.current.width + x) * 4;
            const hex = '#' + [data[i], data[i+1], data[i+2]].map(val => val.toString(16).padStart(2, '0')).join('');
            setSelectedColor(hex); setIsZooming(true);
            fetchNewImage(inputText, hex).then(() => { setTimeout(() => { setIsZooming(false); setSelectedColor(null); }, 1500); });
          }} />
          <div className="halftone-controls-wrapper">
            <div className="halftone-box">
              <span>DENSITY</span>
              <input type="range" min="1" max="60" value={dotSize} onChange={e => setDotSize(parseInt(e.target.value))} />
            </div>
          </div>
          <div className="everything-zoom-hint" style={{ color: selectedColor || '#d1d1d1' }}>
             {selectedColor ? `ZOOMING INTO ${selectedColor.toUpperCase()}` : 'CLICK ANYWHERE TO EXPLORE COLOR'}
          </div>
          <div className="home-back-btn" onClick={() => setView(lastSubView)}><img src="/assets/logo-reference.png" alt="Back" /></div>
        </div>
      )}
    </div>
  );
}

export default App;
