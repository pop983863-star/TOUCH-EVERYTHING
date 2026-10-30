import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const COLUMN_STRUCTURE = [3, 4, 3, 4, 3];
const TOTAL_NODES = 17;
const INITIAL_LOGO_INDICES = [3, 13]; 

const EPISODE_DATA = [
  { id: 1, text: "보이지 않지만 언제나 곁은 지나간다." },
  { id: 2, text: "시간과 공간을 기억하며" },
  { id: 3, text: "빛나는 시간과 평온함" },
  { id: 4, text: "가지 않은 길" },
  { id: 5, text: "비로소 보이는 것들" },
  { id: 6, text: "구독을 통해 매월 테마와 아이템이 공개됩니다." }
];

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
  const [activeSection, setActiveSection] = useState('overview'); 
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
  const [isShuffling, setIsShuffling] = useState(false);

  const canvasRef = useRef(null);
  const imageBuffer = useRef(null);
  const lastInteractionTime = useRef(Date.now()); 
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const inputTimeout = useRef(null);

  const overviewRef = useRef(null);
  const everythingRef = useRef(null);
  const aboutRef = useRef(null);
  const experienceRef = useRef(null);
  const episodeRef = useRef(null);

  const preloadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url; img.crossOrigin = "Anonymous";
      img.onload = () => resolve(url); img.onerror = () => resolve(url);
    });
  };

  const fetchNewImage = async (query = '', color = null) => {
    try {
      const cleanColor = color ? color.replace('#', '') : '';
      const res = await fetch(`/api/images?q=${encodeURIComponent(query)}&color=${cleanColor}`);
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

  const moveLogos = useCallback(() => {
    setIsShuffling(true);
    setActiveIndices(() => {
      let first = Math.floor(Math.random() * TOTAL_NODES);
      let second = Math.floor(Math.random() * TOTAL_NODES);
      while (second === first) second = Math.floor(Math.random() * TOTAL_NODES);
      return [first, second];
    });
    setTimeout(() => setIsShuffling(false), 800);
  }, []);

  useEffect(() => {
    const shuffleInterval = setInterval(() => {
      if (view === 'home') moveLogos();
    }, 10000);
    return () => clearInterval(shuffleInterval);
  }, [view, moveLogos]);

  const handleHomeInteraction = (val) => {
    setInputText(val);
    lastInteractionTime.current = Date.now();
    if (mode === 'static' && val.trim() !== '') setMode('interactive');
    if (inputTimeout.current) clearTimeout(inputTimeout.current);
    inputTimeout.current = setTimeout(() => { if (val.trim() !== '') fetchNewImage(val); }, 600);
  };

  const drawHalftone = useCallback(async () => {
    if (view !== 'internal' || !canvasRef.current || !currentBgImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = currentBgImage;
    img.onload = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width = container.clientWidth; canvas.height = container.clientHeight;
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

  useEffect(() => { if (view === 'internal') drawHalftone(); }, [drawHalftone, view, currentBgImage, dotSize]);

  useEffect(() => {
    if (view !== 'internal') return;
    const handleScroll = () => {
      const scrollPos = scrollContainerRef.current.scrollTop + window.innerHeight / 2;
      if (episodeRef.current && scrollPos >= episodeRef.current.offsetTop) setActiveSection('episode');
      else if (experienceRef.current && scrollPos >= experienceRef.current.offsetTop) setActiveSection('experience');
      else if (aboutRef.current && scrollPos >= aboutRef.current.offsetTop) setActiveSection('about');
      else if (everythingRef.current && scrollPos >= everythingRef.current.offsetTop) setActiveSection('everything');
      else setActiveSection('overview');
    };
    const container = scrollContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [view]);

  // [수정] 인트로 시퀀스 타이머 (자동 새로고침/복귀 로직 삭제)
  useEffect(() => {
    const timer = setInterval(() => {
      if (view !== 'home' || isFocused) return;
      const now = Date.now();
      const diff = (now - lastInteractionTime.current) / 1000;

      // 입력 중 무반응 시 초기화는 유지 (인트로 내에서만)
      if (mode === 'interactive' && diff >= 12) { 
        setMode('static'); setInputText(''); 
      }
      // 유휴 상태에서 슬라이드쇼 전환 유지
      else if (mode === 'static' && diff >= 25 && diff < 55) { 
        if (mode !== 'slideshow') { setMode('slideshow'); fetchNewImage('minimal'); } 
      }
      else if (mode === 'slideshow' && diff >= 55) { 
        setMode('static'); lastInteractionTime.current = Date.now(); 
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, view, isFocused]);

  const scrollTo = (ref) => {
    ref.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div key={view} className={`app-root-container ${isSloganHovered ? 'slogan-focus-mode' : ''} view-${view} view-fade-in`}>
      
      {view === 'home' && (
        <div className="page-home">
          <div className="viewport">
            {/* [수정] 메인 그리드 래퍼 자체에 클릭 이벤트 부여 */}
            <div className="main-grid-wrapper clickable-grid" onClick={() => setView('internal')}>
              <div className={`layer-static ${mode === 'static' ? 'on' : ''}`}><img src="/assets/initial-grid.png" alt="Static" className="pixel-perfect" /></div>
              <div className={`layer-dynamic ${mode !== 'static' ? 'on' : ''}`}>
                {nodes.map(n => (
                  <div key={n.id} className="mask-circle" style={{ left: n.x, top: n.y, backgroundImage: currentBgImage ? `url(${currentBgImage})` : 'none', backgroundPosition: `-${n.x}px -${n.y}px`, backgroundSize: '496px 396px' }} />
                ))}
                {activeIndices.map((idx, i) => (
                  <div key={i} className={`logo-overlay-marker ${isShuffling ? 'shuffling' : ''}`} style={{ transform: `translate(${nodes[idx].x}px, ${nodes[idx].y}px)` }}>
                    <img src="/assets/logo-reference.png" alt="Logo" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <footer className="footer-layout">
            <div className="footer-container">
              <div className={`dynamic-input-area ${inputText ? 'is-active' : ''}`} onClick={(e) => { e.stopPropagation(); inputRef.current?.focus(); }}>
                <span className="touch-text">TOUCH</span><span className="comma-text">,</span>
                <div className="input-field-wrapper">
                  <input ref={inputRef} value={inputText} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={e => handleHomeInteraction(e.target.value)} autoComplete="off" spellCheck="false" />
                  <span className="input-measure">{inputText}</span>
                </div>
              </div>
              {(mode !== 'static' || inputText) && <div className="footer-hint-centered">TOUCH SYMBOL</div>}
            </div>
          </footer>
        </div>
      )}

      {view === 'internal' && (
        <div className="internal-layout">
          <aside className="internal-sidebar">
            <div className="sidebar-group">
              <div className="sidebar-title" onClick={() => setView('home')}>TOUCH</div>
              <div className={`sidebar-comma ${activeSection !== 'overview' ? 'active' : ''}`}>,</div>
              <nav className="sidebar-nav">
                <button className={activeSection === 'everything' ? 'active' : ''} onClick={() => scrollTo(everythingRef)}>EVERYTHING</button>
                <button className={activeSection === 'about' ? 'active' : ''} onClick={() => scrollTo(aboutRef)}>ABOUT</button>
                <button className={activeSection === 'experience' ? 'active' : ''} onClick={() => scrollTo(experienceRef)}>THE EXPERIENCE</button>
                <button className={activeSection === 'episode' ? 'active' : ''} onClick={() => scrollTo(episodeRef)}>EPISODE</button>
              </nav>
            </div>
          </aside>

          <main className="internal-main" ref={scrollContainerRef}>
            <section className="internal-section section-overview" ref={overviewRef}>
              <div className="internal-home-video-row scaled-row">
                <div className="video-box-large"><video autoPlay loop muted playsInline className="brand-video"><source src="/assets/logo-system.mp4" type="video/mp4" /></video></div>
                <div className="video-box-large"><video autoPlay loop muted playsInline className="brand-video"><source src="/assets/logo-loop.mp4" type="video/mp4" /></video></div>
              </div>
              <h1 className="main-slogan">REDISCOVER THE ORDINARY</h1>
            </section>

            <section className="internal-section" ref={everythingRef}>
              <div className="everything-frame">
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
                  <div className="halftone-controls-outer"><div className="halftone-box"><span>DENSITY</span><input type="range" min="1" max="60" value={dotSize} onChange={e => setDotSize(parseInt(e.target.value))} /></div></div>
                </div>
                <div className="everything-zoom-hint-inline">{selectedColor ? <span style={{ color: selectedColor, fontWeight: '700' }}>ZOOMING INTO {selectedColor}</span> : <span>CLICK ANYWHERE TO EXPLORE COLOR</span>}</div>
              </div>
            </section>

            <section className="internal-section" ref={aboutRef}>
              <div className="about-editorial-wrap">
                <p className="about-date">2026년 6월 12일, 맑음</p>
                <h2 className="about-question">당신은 무엇에 주의를 기울이고 있나요?</h2>
                <p className="about-body">
                  그 어느 때보다 많은 정보와 콘텐츠가 우리의 삶을 풍족하게 해주고 있다.<br/>
                  새로운 정보와 즐거움을 찾기 쉬워졌지만, 우연히 발견하게 되는 일상의 즐거움은 어디로 갔을까.<br/><br/>
                  오늘 마주한 것들을 떠올릴 수 있을까.<br/>
                  브랜드는 어떤 시선을 제안할 수 있을까.<br/>
                  우리는 일상의 재발견이라는 주제로<br/>
                  쉽게 지나치는 순간에 주목하고, 감각적 경험을 통해<br/>
                  새로운 라이프스타일을 제안한다.
                </p>
                <div className={`about-slogan-text ${isSloganHovered ? 'hovered' : ''}`} onMouseEnter={() => setIsSloganHovered(true)} onMouseLeave={() => setIsSloganHovered(false)}>지나친 모든 것에 다시 관심을 기울일 때,<br/>평범한 일상은 새로운 발견이 된다.</div>
                <div className="about-audio-widget-inpage"><iframe width="100%" height="120" src="https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=%2Fthomyorke_%2Fin-the-absence-thereof-2%2F" frameBorder="0"></iframe></div>
              </div>
            </section>

            <section className="internal-section" ref={experienceRef}>
               <div className="experience-img-frame"><img src="/assets/ex.png" alt="Experience" /></div>
            </section>

            <section className="internal-section section-episode" ref={episodeRef}>
              <div className="episode-vertical-list">
                {EPISODE_DATA.map(item => (
                  <div key={item.id} className="episode-item-original">
                    <img src={`/assets/${item.id}.png`} alt={`Episode ${item.id}`} />
                    <div className="episode-overlay"><p className="overlay-text">{item.text}</p></div>
                  </div>
                ))}
              </div>
              <div className="episode-footer-text">
                <p className="footer-small">TOUCH, EVERYTHING is a subscription-based service that introduces new lifestyle experiences each month through curated themes and items.</p>
                <p className="footer-small">터치 에브리띵은 구독제로 운영되는 서비스이며, 매달 테마와 아이템을 통해 새로운 라이프스타일 경험을 제안합니다.</p>
              </div>
            </section>
          </main>
          <div className="home-back-btn" onClick={() => { setView('home'); setMode('static'); setInputText(''); }}><img src="/assets/logo-reference.png" alt="Home" /></div>
        </div>
      )}
    </div>
  );
}

export default App;
