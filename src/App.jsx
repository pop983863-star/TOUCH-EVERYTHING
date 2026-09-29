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
  const [lastSubView, setLastSubView] = useState('overview');
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [nodes] = useState(generateGridNodes());
  const [mode, setMode] = useState('static'); 
  const [activeIndices, setActiveIndices] = useState(INITIAL_LOGO_INDICES);
  const [currentBgImage, setCurrentBgImage] = useState('');
  const [dotSize, setDotSize] = useState(15);
  const [isZooming, setIsZooming] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null); 
  const [isSloganHovered, setIsSloganHovered] = useState(false);

  const canvasRef = useRef(null);
  const imageBuffer = useRef(null);
  const lastInteractionTime = useRef(Date.now()); 
  const subPageActivityTime = useRef(Date.now()); 
  const inputRef = useRef(null);
  const inputTimeout = useRef(null);

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
        const randomIndex = Math.floor(Math.random() * data.images.length);
        const nextImgUrl = data.images[randomIndex];
        await preloadImage(nextImgUrl);
        setCurrentBgImage(nextImgUrl);
      }
    } catch (e) {
      setCurrentBgImage(`https://picsum.photos/seed/${Math.random()}/1200/800`);
    }
  };

  const handleHomeInteraction = (val) => {
    setInputText(val);
    lastInteractionTime.current = Date.now();
    subPageActivityTime.current = Date.now();
    if (mode === 'static' && val.trim() !== '') setMode('interactive');
    if (inputTimeout.current) clearTimeout(inputTimeout.current);
    inputTimeout.current = setTimeout(() => { if (val.trim() !== '') fetchNewImage(val); }, 600);
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
      const interval = setInterval(() => { moveLogos(); fetchNewImage(mode === 'slideshow' ? '' : inputText); }, 7500);
      return () => clearInterval(interval);
    }
  }, [mode, view, moveLogos, isFocused, inputText]);

  const renderNav = () => (
    <nav className="top-nav">
      {['overview', 'about', 'identity', 'objects'].map(v => (
        <button key={v} className={view === v ? 'active' : ''} onClick={() => { setView(v); setLastSubView(v); }}>
          {v === 'overview' ? 'HOME' : v.toUpperCase()}
        </button>
      ))}
      <button onClick={() => { setView('everything'); fetchNewImage(inputText); }}>EVERYTHING</button>
    </nav>
  );

  const renderSubPage = (title, description) => (
    <div className="page-sub">
      {renderNav()}
      <div className="sub-content-scroll">
        <div className="content-area">
          {view === 'overview' && (
            <div className="sub-video-container">
              <div className="video-box"><video src="/assets/logo-loop.mp4" autoPlay loop muted playsInline className="brand-video" /></div>
              <div className="video-box"><video src="/assets/logo-system.mp4" autoPlay loop muted playsInline className="brand-video" /></div>
            </div>
          )}
          {view === 'about' && (
            <div className="about-editorial-wrap">
              <p className="about-date">2026년 6월 12일, 맑음</p>
              <h2 className="about-question">당신은 무엇에 주의를 기울이고 있나요?</h2>
              <div className="about-body">
                그 어느 때보다 많은 정보와 콘텐츠에 접근할 수 있게 되었다.<br/>
                새로운 것을 발견하는 일은 쉬워졌지만, 정작 우리 주변의 익숙한 것들은 관심 밖으로 밀려나고 있다.<br/><br/>
                오늘 마주한 것들을 떠올릴 수 있을까.<br/>
                브랜드는 어떤 시선을 제안할 수 있을까.
              </div>
              <div 
                className={`about-slogan-text ${isSloganHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setIsSloganHovered(true)} onMouseLeave={() => setIsSloganHovered(false)}
                onTouchStart={() => setIsSloganHovered(true)} onTouchEnd={() => setIsSloganHovered(false)}
              >
                지나친 모든 것에 다시 관심을 기울일 때,<br/>
                평범한 일상은 새로운 발견이 된다.
              </div>
              {/* 음악 위젯의 시각적 위치를 위한 앵커 포인트 */}
              <div className="audio-anchor-point"></div>
            </div>
          )}
          {(view === 'identity' || view === 'objects') && <p className="sub-desc">Experimental Design System for {view.toUpperCase()}.</p>}
        </div>
      </div>
      <div className="home-back-btn" onClick={() => { setView('home'); setMode('static'); }}><img src="/assets/logo-reference.png" alt="Home" /></div>
    </div>
  );

  return (
    <div className={`app-root-container ${isSloganHovered ? 'slogan-focus-mode' : ''} view-${view}`}>
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
                  <div key={i} className="logo-overlay-marker clickable" style={{ transform: `translate(${nodes[idx].x}px, ${nodes[idx].y}px)` }} 
                    onClick={() => { setView('overview'); setLastSubView('overview'); }}>
                    <img src="/assets/logo-reference.png" alt="Logo" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <footer className="footer-layout">
            <div className="footer-container">
              <div className={`dynamic-input-area ${isFocused || inputText ? 'is-active' : ''}`} onClick={() => inputRef.current?.focus()}>
                <span className="touch-text">TOUCH</span><span className="comma-text">,</span>
                <div className="input-field-wrapper">
                  <input ref={inputRef} value={inputText} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={e => handleHomeInteraction(e.target.value)} autoComplete="off" spellCheck="false" />
                  <span className="input-measure">{inputText}</span>
                </div>
              </div>
              {(mode !== 'static' || inputText) && <div className="footer-hint">TOUCH SYMBOL</div>}
            </div>
          </footer>
        </div>
      )}

      {['overview', 'about', 'identity', 'objects'].includes(view) && renderSubPage(view.toUpperCase(), `Content for ${view} page.`)}

      {view === 'everything' && (
        <div className={`page-everything ${isZooming ? 'zooming' : ''}`}>
          <canvas ref={canvasRef} onClick={(e) => {
            if (isZooming || !imageBuffer.current) return;
            try {
              const canvas = canvasRef.current;
              const rect = canvas.getBoundingClientRect();
              const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
              const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
              const data = imageBuffer.current.data;
              const i = (y * canvas.width + x) * 4;
              const hex = '#' + [data[i], data[i+1], data[i+2]].map(val => val.toString(16).padStart(2, '0')).join('');
              setSelectedColor(hex.toUpperCase()); setIsZooming(true);
              fetchNewImage(inputText, hex).then(() => { setTimeout(() => { setIsZooming(false); setSelectedColor(null); }, 2000); });
            } catch(err) { setIsZooming(true); fetchNewImage(inputText).then(() => { setTimeout(() => setIsZooming(false), 2000); }); }
          }} />
          <div className="halftone-controls-outer">
            <div className="halftone-box">
              <span>DENSITY</span>
              <input type="range" min="1" max="60" value={dotSize} onChange={e => setDotSize(parseInt(e.target.value))} />
            </div>
          </div>
          <div className="everything-zoom-hint">
            {selectedColor ? <span style={{ color: selectedColor, fontWeight: '700' }}>ZOOMING INTO {selectedColor}</span> : <span style={{ color: '#888' }}>CLICK ANYWHERE TO EXPLORE COLOR</span>}
          </div>
          <div className="home-back-btn" onClick={() => setView(lastSubView)}><img src="/assets/logo-reference.png" alt="Home" /></div>
        </div>
      )}

      {/* 영속적 오디오 플레이어: 홈(인트로)이 아닐 때만 존재하여 재생 유지 */}
      {view !== 'home' && (
        <div className={`persistent-audio-player ${view === 'about' && !isSloganHovered ? 'is-about-view' : 'is-hidden-view'}`}>
          <iframe 
            width="100%" height="120" 
            src="https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=%2Fthomyorke_%2Fin-the-absence-thereof-2%2F&utm_medium=share&utm_source=embed&utm_content=show&utm_term=VXNlcjo1MzUzMTE0NA%3D%3D" 
            frameBorder="0" allow="encrypted-media; speaker-selection; web-share;"
          ></iframe>
        </div>
      )}
    </div>
  );
}

export default App;
