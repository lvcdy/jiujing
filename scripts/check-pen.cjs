const fs = require('fs');
const d = JSON.parse(fs.readFileSync('d:\\git\\jiujing\\responsive-calculator.pen', 'utf8'));
const ds = d.children[0];
function printTree(node, indent = 0) {
  const pad = '  '.repeat(indent);
  const name = node.name || node.id || '?';
  const type = node.type;
  let info = pad + type + ': ' + name;
  if (node.content) info += ' "' + node.content + '"';
  const childCount = node.children ? node.children.length : 0;
  if (childCount > 0) info += ' [' + childCount + ' children]';
  console.log(info);
  if (node.children) node.children.forEach(c => printTree(c, indent + 1));
}
printTree(ds);
console.log('\n--- MOBILE ---');
printTree(d.children[1]);
