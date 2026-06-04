const fs = require('fs');
const path = require('path');
const dir = 'C:\\\\Users\\\\udayps\\\\Documents\\\\code26\\\\Resumex\\\\packages\\\\renderer\\\\src\\\\templates\\\\typst';
const files = ['alta.js', 'classic.js', 'compact.js', 'executive.js', 'jake.js', 'minimalist.js', 'modern.js'];

files.forEach(f => {
  const file = path.join(dir, f);
  let content = fs.readFileSync(file, 'utf8');
  
  // Extract the title, which is different for each template
  const titleMatch = content.match(/blocks\.skills = `#sectionhead\[\$\{H\('skills', '([^']+)'\)\}\](.*?)`;/s);
  if (!titleMatch) return;
  const defaultTitle = titleMatch[1];
  const postHead = titleMatch[2];
  
  let sep = ", ";
  if (f === 'compact.js') sep = " #sym.bullet ";
  
  let extraPre = '';
  if (f === 'jake.js') extraPre = '  ';

  const hasBullets = content.includes('#let bullets');

  let newLogic = `
  if (r.skills?.length) {
    const isBullets = r.settings?.skillsAsBullets ?? true;
    let lines = '';
    if (isBullets) {
      lines = r.skills
        .map(s => \`#strong[\${typ(s.category || 'Skills')}:]\\n${hasBullets ? '#bullets[\\n' : ''}\${(s.items || []).map(i => \`  - \${typ(i)}\`).join('\\n')}${hasBullets ? '\\n]' : ''}\`)
        .join('\\n\\n');
    } else {
      lines = r.skills
        .map(s => \`${extraPre}#strong[\${typ(s.category || 'Skills')}:] \${(s.items || []).map(typ).join('${sep}')}\`)
        .join(' \\\\\\n');
    }
    blocks.skills = \`#sectionhead[\${H('skills', '${defaultTitle}')}]${postHead}\`;
  }
`;

  // Find the exact block
  const start = content.indexOf('if (r.skills?.length) {');
  const end = content.indexOf('blocks.skills =', start);
  const endLine = content.indexOf(';', end);
  if (start !== -1 && endLine !== -1) {
    const oldBlock = content.substring(start, endLine + 1);
    content = content.replace(oldBlock, newLogic.trim());
    fs.writeFileSync(file, content);
    console.log(f + ' done');
  }
});
