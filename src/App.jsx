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
  const [inputText, setInputText] = useState('');
  const [nodes] = useState(generateGridNodes());
  const [mode, setMode] = useState('static'); 
  const [activeIndices, setActiveIndices] = useState(INITIAL_LOGO_INDICES);
  const [currentBgImage, setCurrentBgImage] = useState('');
  
  const lastInteractionTime = useRef(Date.now()); 
  const subPageActivityTime = useRef(Date.now()); 

  const fetchNewImage = async (query = 'abstract') => {
    try {
      const res = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        setCurrentBgImage(data.images[Math.floor(Math.random() * data.images.length)]);
      }
    } catch (e) {
      setCurrentBgImage(`https://picsum.photos/seed/${Math.random()}/1200/800`);
    }
  };

  const handleHomeInteraction = (val) => {
    setInputText(val);
    lastInteractionTime.current = Date.now();
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

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (view === 'home') {
        const diff = (now - lastInteractionTime.current) / 1000;
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
      if (view !== 'home') {
        const inactiveDiff = (now - subPageActivityTime.current) / 1000;
        if (inactiveDiff >= 180) {
          setView('home');
          setMode('static');
          setActiveIndices(INITIAL_LOGO_INDICES);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, view]);

  useEffect(() => {
    const handleGlobalMove = () => { subPageActivityTime.current = Date.now(); };
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('keydown', handleGlobalMove);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('keydown', handleGlobalMove);
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

  const renderHome = () => (
    <div className="page-home">
      <div className="viewport">
        <div className="main-grid-wrapper">
          <div className={`layer-static ${mode === 'static' ? 'is-active' : ''}`}>
            <img src="/assets/initial-grid.png" alt="Static Grid" className="pixel-perfect" />
          </div>
          <div className={`layer-dynamic ${mode !== 'static' ? 'is-active' : ''}`}>
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
              <div key={`marker-${i}`} 
                className="logo-overlay-marker clickable-logo"
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
        <form onSubmit={(e) => { e.preventDefault(); fetchNewImage(inputText); }} className="footer-form">
          <input 
            value={inputText} 
            onChange={(e) => handleHomeInteraction(e.target.value)} 
            placeholder="TYPE TO START" 
          />
        </form>
      </footer>
    </div>
  );

  const renderSubPage = (title, description) => (
    <div className="page-sub">
      <nav className="top-nav">
        <button className={view === 'about' ? 'on' : ''} onClick={() => setView('about')}>ABOUT</button>
        <button className={view === 'identity' ? 'on' : ''} onClick={() => setView('identity')}>IDENTITY</button>
        <button className={view === 'objects' ? 'on' : ''} onClick={() => setView('objects')}>OBJECTS</button>
      </nav>
      <div className="content-area">
        <h1 className="sub-title">{title}</h1>
        <p className="sub-desc">{description}</p>
      </div>
      <div className="home-back-btn" onClick={() => { setView('home'); setMode('static'); }}>
        <img src="/assets/logo-reference.png" alt="Home" />
      </div>
    </div>
  );

  return (
    <div className="app-root-container">
      {view === 'home' && renderHome()}
      {view === 'about' && renderSubPage('ABOUT', 'Experimental Motion Identity Project Overview.')}
      {view === 'identity' && renderSubPage('IDENTITY', 'A 3-4-3-4-3 Grid System and Brand Guidelines.')}
      {view === 'objects' && renderSubPage('OBJECTS', 'Visualized outcome and physical applications.')}
    </div>
  );
}

export default App;
