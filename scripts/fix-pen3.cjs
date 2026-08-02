const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:\\git\\jiujing\\responsive-calculator.pen', 'utf8'));

let fixes = 0;

function deepFix(node) {
  // Match by id prefix patterns instead of name
  const id = node.id || '';
  
  // Fix all Tab Navigation frames by id pattern
  if (id.endsWith('-tabs') || id === 'mb-tabs') {
    if (!node.fill || typeof node.fill === 'string') {
      node.fill = { color: '#ffffff', opacity: 0.03 };
      fixes++;
    }
    if (!node.layout) {
      node.layout = 'horizontal';
      fixes++;
    }
    console.log(`Fixed Tab Navigation ${id}: fill=${JSON.stringify(node.fill)}, layout=${node.layout}`);
  }
  
  // Fix inactive tabs (not the active one with gradient)
  if (id.match(/-(tab-[123]|tabs)/)) {
    if (!node.fill || node.fill === 'none') {
      node.fill = { color: '#ffffff', opacity: 0.03 };
      fixes++;
    }
  }
  
  // Input grids
  if (node.name === 'Input Grid' && !node.layout) {
    node.layout = 'horizontal';
    fixes++;
  }
  
  if (node.id && node.id.startsWith('mb-inputs') && !node.layout) {
    node.layout = 'vertical';
    fixes++;
  }
  
  // Mobile controls
  if (node.name === 'Mobile Controls' && !node.layout) {
    node.layout = 'horizontal';
    fixes++;
  }
  
  if (node.children) {
    node.children.forEach(child => deepFix(child));
  }
}

data.children.forEach(screen => deepFix(screen));

fs.writeFileSync('d:\\git\\jiujing\\responsive-calculator.pen', JSON.stringify(data, null, 2));
console.log(`\nTotal additional fixes: ${fixes}`);
console.log('File size:', fs.statSync('d:\\git\\jiujing\\responsive-calculator.pen').size, 'bytes');
