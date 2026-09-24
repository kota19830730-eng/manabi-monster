/* ja.wikipedia の 記事の 代表画像を 見る */
const { execFileSync } = require('child_process');
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';
const enc = encodeURIComponent;
function get(u) { return execFileSync('curl', ['-s', '--max-time', '40', '-A', UA, u], { maxBuffer: 1 << 26 }).toString(); }
process.argv.slice(2).forEach(function (art) {
  let file = null;
  try {
    const j = JSON.parse(get('https://ja.wikipedia.org/w/api.php?action=query&titles=' + enc(art) +
      '&prop=pageimages&piprop=name&format=json&redirects=1'));
    const pages = (j.query && j.query.pages) || {};
    Object.keys(pages).forEach(function (k) { if (pages[k].pageimage) file = pages[k].pageimage; });
  } catch (e) { }
  console.log(art + ' -> ' + (file || 'なし'));
});
