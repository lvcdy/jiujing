const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:\\git\\jiujing\\responsive-calculator.pen', 'utf8'));

// Fix all screens
data.children.forEach(screen => {
  const prefix = screen.id === 'mobile-screen' ? 'mb' : 
    screen.id.replace('desktop-', '').replace('-', '');
  const shortPrefix = screen.id === 'desktop-forward' ? 'df' :
    screen.id === 'desktop-reverse' ? 'dr' :
    screen.id === 'desktop-density' ? 'dd' :
    screen.id === 'desktop-chart' ? 'dc' : 'mb';
  
  // Fix function for each node
  function fixNode(node) {
    // Fix background ellipses
    if (node.type === 'ellipse' && node.id && node.id.endsWith('-bg1')) {
      if (!node.fill) {
        node.fill = { type: 'radial', gradientType: 'radial', enabled: true, colors: [
          { color: '#667eea', position: 0, opacity: 0.4 },
          { color: '#667eea', position: 1, opacity: 0 }
        ]};
      }
      if (node.x === undefined) node.x = shortPrefix === 'mb' ? -60 : -120;
      if (node.y === undefined) node.y = shortPrefix === 'mb' ? -40 : -80;
    }
    if (node.type === 'ellipse' && node.id && node.id.endsWith('-bg2')) {
      if (!node.fill) {
        node.fill = { type: 'radial', gradientType: 'radial', enabled: true, colors: [
          { color: '#764ba2', position: 0, opacity: 0.4 },
          { color: '#764ba2', position: 1, opacity: 0 }
        ]};
      }
      if (node.x === undefined) node.x = shortPrefix === 'mb' ? 200 : 800;
      if (node.y === undefined) node.y = shortPrefix === 'mb' ? 600 : 500;
    }
    
    // Fix Glass Card
    if (node.type === 'frame' && node.name === 'Glass Card') {
      if (!node.borderRadius) node.borderRadius = 24;
      if (!node.stroke) node.stroke = { color: '#ffffff', opacity: 0.12 };
      if (!node.strokeWidth) node.strokeWidth = 1;
      // Fix gradient opacity
      if (node.fill && node.fill.colors) {
        node.fill.colors.forEach(c => {
          if (c.opacity === undefined) {
            c.opacity = c.position === 0 ? 0.08 : 0.04;
          }
        });
      }
    }
    
    // Fix Mobile Glass Card
    if (node.type === 'frame' && node.name === 'Mobile Glass Card') {
      if (!node.borderRadius) node.borderRadius = 24;
      if (!node.stroke) node.stroke = { color: '#ffffff', opacity: 0.12 };
      if (!node.strokeWidth) node.strokeWidth = 1;
      if (!node.margin) node.margin = 16;
      if (node.fill && node.fill.colors) {
        node.fill.colors.forEach(c => {
          if (c.opacity === undefined) {
            c.opacity = c.position === 0 ? 0.08 : 0.04;
          }
        });
      }
    }
    
    // Fix Tab Navigation background
    if (node.type === 'frame' && node.name === 'Tab Navigation') {
      if (!node.fill) {
        node.fill = { color: '#ffffff', opacity: 0.03 };
      }
      if (!node.layout) node.layout = 'horizontal';
    }
    
    // Fix Language Button
    if (node.type === 'frame' && node.name === 'Language Button') {
      if (!node.fill) node.fill = { color: '#ffffff', opacity: 0.08 };
      if (!node.stroke) node.stroke = { color: '#ffffff', opacity: 0.2 };
      if (!node.strokeWidth) node.strokeWidth = 1;
    }
    
    // Fix temperature/language buttons in mobile
    if (node.type === 'frame' && (node.id === 'mb-temp-btn' || node.id === 'mb-lang-btn')) {
      if (!node.fill) node.fill = { color: '#ffffff', opacity: 0.08 };
      if (!node.stroke) node.stroke = { color: '#ffffff', opacity: 0.2 };
      if (!node.strokeWidth) node.strokeWidth = 1;
    }
    
    // Fix Input Wrappers
    if (node.type === 'frame' && node.name && node.name.includes('Wrapper')) {
      if (!node.fill) node.fill = { color: '#ffffff', opacity: 0.05 };
      if (!node.stroke) node.stroke = { color: '#ffffff', opacity: 0.1 };
      if (!node.strokeWidth) node.strokeWidth = 1.5;
    }
    
    // Fix Clear Button
    if (node.type === 'frame' && node.name === 'Clear Button') {
      if (!node.fill) node.fill = { color: '#ffffff', opacity: 0.06 };
      if (!node.stroke) node.stroke = { color: '#ffffff', opacity: 0.1 };
      if (!node.strokeWidth) node.strokeWidth = 1.5;
    }
    
    // Fix input grid layout
    if (node.type === 'frame' && node.name === 'Input Grid' && !node.layout) {
      node.layout = 'horizontal';
    }
    
    // Fix mobile input grid
    if (node.type === 'frame' && node.id === 'mb-inputs' && !node.layout) {
      node.layout = 'vertical';
    }
    
    // Recurse children
    if (node.children) {
      node.children.forEach(fixNode);
    }
  }
  
  fixNode(screen);
});

fs.writeFileSync('d:\\git\\jiujing\\responsive-calculator.pen', JSON.stringify(data, null, 2));
console.log('Fixed! File size:', fs.statSync('d:\\git\\jiujing\\responsive-calculator.pen').size, 'bytes');
