// Build: the game code and CSS go inline into index.html. Sounds, images and videos are written to assets/ next to it
// (so index.html stays small enough to upload to GitHub, which rejects single files over 25 MB).
import * as esbuild from 'esbuild';
import fs from 'fs';

await esbuild.build({
  entryPoints: ['main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  loader: { '.png': 'file', '.mp3': 'file', '.mp4': 'file' },
  outdir: '.',
  entryNames: '_game',
  assetNames: 'assets/[name]',
  write: true,
  target: 'es2020',
  logLevel: 'warning'
});
const js = fs.readFileSync('_game.js', 'utf8').replace(/<\/script>/g, '<\\/script>');
fs.unlinkSync('_game.js');
const css = fs.readFileSync('style.css', 'utf8');
let html = fs.readFileSync('template.html', 'utf8');
html = html.replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
fs.writeFileSync('index.html', html);
console.log('Built index.html (' + (html.length / 1024 / 1024).toFixed(2) + ' MB) + assets/ (' + fs.readdirSync('assets').length + ' files)');
