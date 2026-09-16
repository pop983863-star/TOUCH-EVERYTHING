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
  const [view, setView] = useState('home'); // 'home', 'about', 'identity', 'objects'
  const [inputText, setInputText] = useState('');
  const [nodes] = useState(generateGridNodes());
  const [mode, setMode] = useState('static'); 
  const [activeIndices, setActiveIndices] = useState(INITIAL_LOGO_INDICES);
  const [currentBgImage, setCurrentBgImage] = useState('');
  
  const lastActivity = useRef(Date.now());
  const lastInteraction = useRef(Date.now()); // 인트로 시퀀스용

  // --- 이미지 fetch 로직 ---
  const fetchNewImage = async (query = 'minimal') => {
    try {
      const res = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.images?.length > 0) {
        setCurrentBgImage(data.images[Math.floor(Math.random() * data.images.length)]);
      }
    } catch (e) {
      setCurrentBgImage(`https://picsum.photos/seed/${Math.random()}/1200/800`);
    }
  };

  // --- 인터랙션 핸들러 ---
  const handleHomeInteraction = (val) => {
    setInputText(val);
    lastInteraction.current = Date.now();
    lastActivity.current = Date.now();
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

  // --- 타이머 & 시퀀스 로직 ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      
      // 1. [홈 전용] 인트로 시퀀스 (10초/30초)
      if (view === 'home') {
        const diff = (now - lastInteraction.current) / 1000;
        if (mode === 'interactive' && diff >= 10) {
          setMode('static');
          setActiveIndices(INITIAL_LOGO_INDICES);
        } else if (mode === 'static' && diff >= 20 && diff < 50) {
          if (mode !== 'slideshow') {
            setMode('slideshow');
            fetchNewImage('nature');
          }
        } else if (mode === 'slideshow' && diff >= 50) {
          setMode('static');
          setActiveIndices(INITIAL_LOGO_INDICES);
        }
      }

      // 2. [서브페이지 전용] 3분(180초) 무반응 시 홈으로 복귀
      if (view !== 'home') {
        const inactiveTime = (now - lastActivity.current) / 1000;
        if (inactiveTime >= 180) {
          setView('home');
          setMode('static');
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, view]);

  // 홈이 아닐 때 마우스 움직임 감지하여 타이머 리셋
  useEffect(() => {
    const resetTimer = () => { lastActivity.current = Date.now(); };
    window.addEventListener('mousemove', resetTimer);
    return () => window.removeEventListener('mousemove', resetTimer);
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

  // --- 렌더링 함수 ---
  const renderHome = () => (
    <div className="home-screen">
      <main className="viewport">
        <div className="main-grid-wrapper">
          <div className={`layer-static ${mode === 'static' ? 'on' : ''}`}>
            <img src="/assets/initial-grid.png" alt="Static Grid" className="pixel-perfect" />
          </div>
          <div className={`layer-dynamic ${mode !== 'static' ? 'on' : ''}`}>
            {nodes.map((node) => (
              <div key={node.id} className="mask-circle"
                style={{ 
                  left: `${node.x}px`, top: `${node.y}px`,
                  backgroundImage: `url(${currentBgImage})`,
                  backgroundPosition: `-${node.x}px -${node.y}px`,
                  backgroundSize: '496px 396px' 
                }}
              />
            ))}
            {activeIndices.map((idx, i) => (
              <div key={`marker-${i}`} className="moving-logo-marker clickable"
                style={{ transform: `translate(${nodes[idx].x}px, ${nodes[idx].y}px)` }}
                onClick={() => setView('about')} // 로고 클릭 시 About 페이지로 이동
              >
                <img src="/assets/logo-reference.png" alt="Logo" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="footer">
        <form onSubmit={(e) => { e.preventDefault(); fetchNewImage(inputText); }}>
          <input value={inputText} onChange={(e) => handleHomeInteraction(e.target.value)} placeholder="TYPE TO START INTERACTION" />
        </form>
      </footer>
    </div>
  );

  const renderSubPage = (title, content) => (
    <div className="sub-page">
      <nav className="sub-nav">
        <button className={view === 'about' ? 'active' : ''} onClick={() => setView('about')}>ABOUT</button>
        <button className={view === 'identity' ? 'active' : ''} onClick={() => setView('identity')}>IDENTITY</button>
        <button className={view === 'objects' ? 'active' : ''} onClick={() => setView('objects')}>OBJECTS</button>
      </nav>
      <div className="sub-content-container">
        <h1>{title}</h1>
        <p>{content}</p>
      </div>
      <div className="home-return-btn" onClick={() => { setView('home'); setMode('static'); }}>
        <img src="/assets/logo-reference.png" alt="Home" />
      </div>
    </div>
  );

  return (
    <div className="app-root">
      {view === 'home' && renderHome()}
      {view === 'about' && renderSubPage('ABOUT', 'Brand introduction and vision summary.')}
      {view === 'identity' && renderSubPage('IDENTITY', 'Design system, color palette, and grid guidelines.')}
      {view === 'objects' && renderSubPage('OBJECTS', 'Physical outcomes and visual explorations.')}
    </div>
  );
}

export default App;
