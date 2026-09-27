‎import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [inputText, setInputText] = useState('');
  const [nodes] = useState(generateGridNodes());
  const [mode, setMode] = useState('static'); 
  const [activeIndices, setActiveIndices] = useState(INITIAL_LOGO_INDICES);
  const [currentBgImage, setCurrentBgImage] = useState('');
  const lastInteractionTime = useRef(Date.now());

  const fetchNewImage = async (query = 'abstract') => {
    try {
      const res = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        setCurrentBgImage(data.images[Math.floor(Math.random() * data.images.length)]);
      }
    } catch (e) {
      setCurrentBgImage(`https://picsum.photos/seed/nature/1200/800`);
    }
  };

  const handleInteraction = (val) => {
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
      const diff = (now - lastInteractionTime.current) / 1000;
      if (mode === 'interactive' && diff >= 10) {
        setMode('static'); setActiveIndices(INITIAL_LOGO_INDICES);
      } else if (mode === 'static' && diff >= 20 && diff < 50) {
        if (mode !== 'slideshow') { setMode('slideshow'); fetchNewImage('minimal'); }
      } else if (mode === 'slideshow' && diff >= 50) {
        setMode('static'); setActiveIndices(INITIAL_LOGO_INDICES);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'static') {
      const interval = setInterval(() => {
        moveLogos();
        fetchNewImage(inputText || 'minimal');
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [mode, moveLogos, inputText]);

  return (
    <div className="app-root-container">
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
                    backgroundImage: `url(${currentBgImage})`,
                    backgroundPosition: `-${node.x}px -${node.y}px`,
                    backgroundSize: '496px 396px' 
                  }}
                />
              ))}
              {activeIndices.map((idx, i) => (
                <div key={`marker-${i}`} className="moving-logo-marker"
                  style={{ transform: `translate(${nodes[idx].x}px, ${nodes[idx].y}px)` }}
                >
                  <img src="/assets/logo-reference.png" alt="Logo" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <footer className="footer-layout">
          <div className="footer-form">
            <input 
              value={inputText} 
              onChange={(e) => handleInteraction(e.target.value)} 
              placeholder="TYPE TO START INTERACTION" 
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
