const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:\\git\\jiujing\\responsive-calculator.pen', 'utf8'));

let fixes = 0;

function fixNode(node, screenId) {
  // Fix Tab Navigation - missing fill and layout
  if (node.type === 'frame' && node.name === 'Tab Navigation') {
    if (!node.fill) {
      node.fill = { color: '#ffffff', opacity: 0.03 };
      fixes++;
    }
    if (!node.layout) {
      node.layout = 'horizontal';
      fixes++;
    }
  }
  
  // Fix input grid layout
  if (node.type === 'frame' && node.name === 'Input Grid' && !node.layout) {
    node.layout = 'horizontal';
    fixes++;
  }
  
  // Fix mobile input containers
  if (node.type === 'frame' && node.id && node.id.startsWith('mb-inputs') && !node.layout) {
    node.layout = 'vertical';
    fixes++;
  }
  
  // Fix Header gradient opacity
  if (node.type === 'frame' && node.name === 'Header' && node.fill && node.fill.colors) {
    node.fill.colors.forEach(c => {
      if (c.opacity === undefined) {
        c.opacity = 0.35;
        fixes++;
      }
    });
  }
  
  // Fix glass card stroke
  if (node.type === 'frame' && (node.name === 'Glass Card' || node.name === 'Mobile Glass Card')) {
    if (!node.stroke) {
      node.stroke = { color: '#ffffff', opacity: 0.12 };
      fixes++;
    }
    if (!node.strokeWidth) {
      node.strokeWidth = 1;
      fixes++;
    }
    if (!node.borderRadius) {
      node.borderRadius = 24;
      fixes++;
    }
  }
  
  // Fix inactive tabs (they have fill: 'none' or no fill)
  if (node.type === 'frame' && node.id && node.id.match(/df-tab-[123]|dr-tab-[0123]|dd-tab-[0123]|dc-tab-[0123]|mb-tab-[123]/)) {
    if (!node.fill || node.fill === 'none') {
      node.fill = { color: '#ffffff', opacity: 0.03 };
      fixes++;
    }
  }
  
  // Fix mobile active tab too
  if (node.type === 'frame' && node.id === 'mb-tab-0') {
    if (!node.fill || (typeof node.fill === 'string')) {
      node.fill = { type: 'gradient', gradientType: 'linear', enabled: true, rotation: 135, size: { height: 1 }, colors: [
        { color: '#667eea', position: 0, opacity: 1 },
        { color: '#764ba2', position: 1, opacity: 1 }
      ]};
      fixes++;
    }
  }
  
  // Fix Mobile Controls
  if (node.type === 'frame' && node.name === 'Mobile Controls' && !node.layout) {
    node.layout = 'horizontal';
    fixes++;
  }
  
  // Fix background orbs position in mobile
  if (screenId === 'mobile-screen') {
    if (node.type === 'ellipse' && node.id && node.id.endsWith('-bg1')) {
      if (node.x === undefined) { node.x = -60; fixes++; }
      if (node.y === undefined) { node.y = -40; fixes++; }
    }
    if (node.type === 'ellipse' && node.id && node.id.endsWith('-bg2')) {
      if (node.x === undefined) { node.x = 200; fixes++; }
      if (node.y === undefined) { node.y = 600; fixes++; }
    }
  }
  
  // Recurse
  if (node.children) {
    node.children.forEach(child => fixNode(child, screenId));
  }
}

data.children.forEach(screen => {
  fixNode(screen, screen.id);
});

fs.writeFileSync('d:\\git\\jiujing\\responsive-calculator.pen', JSON.stringify(data, null, 2));
console.log(`Applied ${fixes} additional fixes`);
console.log('File size:', fs.statSync('d:\\git\\jiujing\\responsive-calculator.pen').size, 'bytes');
