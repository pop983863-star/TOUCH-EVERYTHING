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
  const [view, setView] = useState('home'); // 'home' or 'internal'
  const [activeSection, setActiveSection] = useState('everything');
  const [inputText, setInputText] = useState('');
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
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  // 섹션 참조용 Refs
  const sectionRefs = {
    everything: useRef(null),
    about: useRef(null),
    episode: useRef(null)
  };

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
      setCurrentBgImage(`https://picsum.photos/seed/nature/1200/800`);
    }
  };

  const handleHomeInteraction = (val) => {
    setInputText(val);
    lastInteractionTime.current = Date.now();
    if (mode === 'static' && val.trim() !== '') setMode('interactive');
    const timer = setTimeout(() => { if (val.trim() !== '') fetchNewImage(val); }, 600);
    return () => clearTimeout(timer);
  };

  const moveLogos = useCallback(() => {
    setActiveIndices(() => {
      let first = Math.floor(Math.random() * TOTAL_NODES);
      let second = Math.floor(Math.random() * TOTAL_NODES);
      while (second === first) second = Math.floor(Math.random() * TOTAL_NODES);
      return [first, second];
    });
  }, []);

  // 망점 그리기 로직 (EVERYTHING 섹션용)
  const drawHalftone = useCallback(async () => {
    if (view !== 'internal' || !canvasRef.current || !currentBgImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = currentBgImage;
    img.onload = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth; 
      canvas.height = container.clientHeight;
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

  useEffect(() => { if (view === 'internal') drawHalftone(); }, [drawHalftone, view]);

  // 스크롤 시 좌측 메뉴 활성화 감지
  useEffect(() => {
    if (view !== 'internal') return;
    const handleScroll = () => {
      const scrollPos = scrollContainerRef.current.scrollTop + 200;
      Object.entries(sectionRefs).forEach(([name, ref]) => {
        if (ref.current && scrollPos >= ref.current.offsetTop && scrollPos < ref.current.offsetTop + ref.current.offsetHeight) {
          setActiveSection(name);
        }
      });
    };
    const container = scrollContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [view]);

  useEffect(() => {
    if (view === 'home' && mode !== 'static') {
      const interval = setInterval(moveLogos, 5000);
      return () => clearInterval(interval);
    }
  }, [mode, view, moveLogos]);

  // 섹션 이동 함수
  const scrollTo = (section) => {
    sectionRefs[section].current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`app-root-container ${isSloganHovered ? 'slogan-focus-mode' : ''} view-${view}`}>
      
      {/* 1. 홈/인트로 화면 */}
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
                    onClick={() => setView('internal')}>
                    <img src="/assets/logo-reference.png" alt="Logo" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <footer className="footer-layout">
            <div className="footer-container">
              <div className={`dynamic-input-area ${inputText ? 'is-active' : ''}`}>
                <span className="touch-text">TOUCH</span><span className="comma-text">,</span>
                <div className="input-field-wrapper">
                  <input ref={inputRef} value={inputText} onChange={e => handleHomeInteraction(e.target.value)} autoComplete="off" spellCheck="false" />
                  <span className="input-measure">{inputText}</span>
                </div>
              </div>
              {(mode !== 'static' || inputText) && <div className="footer-hint">TOUCH SYMBOL</div>}
            </div>
          </footer>
        </div>
      )}

      {/* 2. 내부 페이지 통합 레이아웃 (Side Menu + Scroll Content) */}
      {view === 'internal' && (
        <div className="internal-container">
          
          {/* 좌측 고정 메뉴 (이미지 스타일 반영) */}
          <aside className="side-nav">
            <div className="nav-group">
              <div className="nav-main-title" onClick={() => setView('home')}>TOUCH</div>
              <div className="nav-comma">,</div>
              <button className={activeSection === 'everything' ? 'active' : ''} onClick={() => scrollTo('everything')}>EVERYTHING</button>
              <button className={activeSection === 'about' ? 'active' : ''} onClick={() => scrollTo('about')}>ABOUT</button>
              <button className={activeSection === 'episode' ? 'active' : ''} onClick={() => scrollTo('episode')}>EPISODE</button>
            </div>
          </aside>

          {/* 우측 스크롤 콘텐츠 */}
          <main className="main-content-scroll" ref={scrollContainerRef}>
            
            {/* SECTION 1: EVERYTHING (망점 캔버스) */}
            <section className="internal-section" ref={sectionRefs.everything}>
              <div className={`page-everything ${isZooming ? 'zooming' : ''}`}>
                <canvas ref={canvasRef} onClick={(e) => {
                  if (isZooming || !imageBuffer.current) return;
                  const rect = canvasRef.current.getBoundingClientRect();
                  const x = Math.floor((e.clientX - rect.left) * (canvasRef.current.width / rect.width));
                  const y = Math.floor((e.clientY - rect.top) * (canvasRef.current.height / rect.height));
                  const data = imageBuffer.current.data;
                  const i = (y * canvasRef.current.width + x) * 4;
                  const hex = '#' + [data[i], data[i+1], data[i+2]].map(val => val.toString(16).padStart(2, '0')).join('');
                  setSelectedColor(hex.toUpperCase()); setIsZooming(true);
                  fetchNewImage(inputText, hex).then(() => { setTimeout(() => { setIsZooming(false); setSelectedColor(null); }, 2000); });
                }} />
                <div className="halftone-controls-outer">
                  <div className="halftone-box">
                    <span>DENSITY</span>
                    <input type="range" min="1" max="60" value={dotSize} onChange={e => setDotSize(parseInt(e.target.value))} />
                  </div>
                </div>
                <div className="everything-zoom-hint">
                   {selectedColor ? <span style={{ color: selectedColor }}>ZOOMING INTO {selectedColor}</span> : <span>CLICK TO EXPLORE COLOR</span>}
                </div>
              </div>
            </section>

            {/* SECTION 2: ABOUT (에디토리얼 + 음악) */}
            <section className="internal-section editorial-bg" ref={sectionRefs.about}>
              <div className="about-editorial-wrap">
                <p className="about-date">2026년 6월 12일, 맑음</p>
                <h2 className="about-question">당신은 무엇에 주의를 기울이고 있나요?</h2>
                <div className="about-body">
                  그 어느 때보다 많은 정보와 콘텐츠에 접근할 수 있게 되었다.<br/>
                  새로운 것을 발견하는 일은 쉬워졌지만, 정작 우리 주변의 익숙한 것들은 관심 밖으로 밀려나고 있다.<br/><br/>
                  오늘 마주한 것들을 떠올릴 수 있을까.<br/>
                  브랜드는 어떤 시선을 제안할 수 있을까.
                </div>
                <div className={`about-slogan-text ${isSloganHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => setIsSloganHovered(true)} onMouseLeave={() => setIsSloganHovered(false)}
                >
                  지나친 모든 것에 다시 관심을 기울일 때,<br/>
                  평범한 일상은 새로운 발견이 된다.
                </div>
                <div className="about-audio-widget-inpage">
                  <iframe width="100%" height="120" src="https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=%2Fthomyorke_%2Fin-the-absence-thereof-2%2F" frameBorder="0"></iframe>
                </div>
              </div>
            </section>

            {/* SECTION 3: EPISODE (영상 배치) */}
            <section className="internal-section" ref={sectionRefs.episode}>
               <div className="sub-video-container">
                  <div className="video-box"><video src="/assets/logo-loop.mp4" autoPlay loop muted playsInline className="brand-video" /></div>
                  <div className="video-box"><video src="/assets/logo-system.mp4" autoPlay loop muted playsInline className="brand-video" /></div>
               </div>
               <p className="sub-desc" style={{marginTop: '40px'}}>Visual explorations and motion systems.</p>
            </section>
          </main>

          {/* 우측 하단 홈 복귀 버튼 */}
          <div className="home-back-btn" onClick={() => setView('home')}>
            <img src="/assets/logo-reference.png" alt="Home" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
