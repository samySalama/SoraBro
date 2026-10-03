/* ================= صورة برو — كل المعالجة تتم محلياً في المتصفح ================= */

// ---------- Dark mode ----------
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.dataset.theme = savedTheme;
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ---------- Mobile menu ----------
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// ---------- Footer year ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Animated counters ----------
const counters = document.querySelectorAll('[data-count]');
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 60));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      el.textContent = cur.toLocaleString('ar-EG') + '+';
    }, 25);
    counterObs.unobserve(el);
  });
}, { threshold: .5 });
counters.forEach(c => counterObs.observe(c));

// ---------- Tools tabs ----------
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tool-' + tab.dataset.tool).classList.add('active');
  });
});

// ---------- Helpers ----------
function readImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
function setupDrop(zone, input, onFiles) {
  ['dragover', 'dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => {
    e.preventDefault();
    zone.classList.toggle('drag', ev.type === 'dragover');
    if (ev.type === 'drop') onFiles([...e.dataTransfer.files]);
  }));
  input.addEventListener('change', () => onFiles([...input.files]));
}
const fmtSize = b => (b / 1024 / 1024).toFixed(2) + ' MB';

/* ================= أداة 1: صور → PDF ================= */
const pdfFiles = [];
const pdfThumbs = document.getElementById('pdfThumbs');
const makePdfBtn = document.getElementById('makePdf');
const pdfInput = document.getElementById('pdfInput');

setupDrop(document.getElementById('pdfDrop'), pdfInput, files => {
  files.filter(f => f.type.startsWith('image/')).forEach(f => {
    if (pdfFiles.length < 30) pdfFiles.push(f);
  });
  renderThumbs();
});

function renderThumbs() {
  pdfThumbs.innerHTML = '';
  pdfFiles.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">
      <span class="num">${i + 1}</span>
      <button class="del" title="حذف">✕</button>`;
    div.querySelector('.del').onclick = () => { pdfFiles.splice(i, 1); renderThumbs(); };
    pdfThumbs.appendChild(div);
  });
  makePdfBtn.disabled = pdfFiles.length === 0;
}

document.getElementById('clearPdf').addEventListener('click', () => {
  pdfFiles.length = 0; pdfInput.value = ''; renderThumbs();
});

makePdfBtn.addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const progress = document.getElementById('pdfProgress');
  const bar = progress.querySelector('.bar');
  progress.style.display = 'block';
  makePdfBtn.disabled = true;

  const PW = 210, PH = 297, M = 8; // A4 mm + margin
  for (let i = 0; i < pdfFiles.length; i++) {
    const img = await readImage(pdfFiles[i]);
    const maxW = PW - M * 2, maxH = PH - M * 2;
    let w = maxW, h = img.height * (maxW / img.width);
    if (h > maxH) { h = maxH; w = img.width * (maxH / img.height); }
    if (i > 0) pdf.addPage();
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (PW - w) / 2, (PH - h) / 2, w, h);
    bar.style.width = ((i + 1) / pdfFiles.length * 100) + '%';
  }
  pdf.save('مستند_صورة_برو.pdf');
  progress.style.display = 'none'; bar.style.width = '0';
  makePdfBtn.disabled = false;
});

/* ================= أداة 2: تحسين الصور ================= */
let enhImg = null;
const enhCanvas = document.getElementById('enhCanvas');
const brightness = document.getElementById('brightness');
const contrast = document.getElementById('contrast');
const grayscale = document.getElementById('grayscale');

setupDrop(document.getElementById('enhDrop'), document.getElementById('enhInput'), async files => {
  if (!files[0]) return;
  enhImg = await readImage(files[0]);
  document.getElementById('enhEditor').hidden = false;
  applyEnhance();
});

function applyEnhance() {
  if (!enhImg) return;
  enhCanvas.width = enhImg.width; enhCanvas.height = enhImg.height;
  const ctx = enhCanvas.getContext('2d');
  ctx.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%)` +
    (grayscale.checked ? ' grayscale(100%)' : '');
  ctx.drawImage(enhImg, 0, 0);
}
[brightness, contrast, grayscale].forEach(el => el.addEventListener('input', applyEnhance));

document.getElementById('resetEnh').addEventListener('click', () => {
  brightness.value = 110; contrast.value = 130; grayscale.checked = true; applyEnhance();
});
document.getElementById('downloadEnh').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'صورة_محسنة.png';
  a.href = enhCanvas.toDataURL('image/png');
  a.click();
});

/* ================= أداة 3: ضغط الصور ================= */
let cmpImg = null, cmpBlob = null, cmpOriginal = 0;
const quality = document.getElementById('quality');

setupDrop(document.getElementById('cmpDrop'), document.getElementById('cmpInput'), async files => {
  if (!files[0]) return;
  cmpOriginal = files[0].size;
  cmpImg = await readImage(files[0]);
  document.getElementById('cmpEditor').hidden = false;
  runCompress();
});

quality.addEventListener('input', () => {
  document.getElementById('qualityVal').textContent = quality.value + '%';
  runCompress();
});

function runCompress() {
  if (!cmpImg) return;
  const canvas = document.createElement('canvas');
  const maxDim = 2000;
  let { width: w, height: h } = cmpImg;
  if (Math.max(w, h) > maxDim) {
    const r = maxDim / Math.max(w, h);
    w = Math.round(w * r); h = Math.round(h * r);
  }
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(cmpImg, 0, 0, w, h);
  canvas.toBlob(blob => {
    cmpBlob = blob;
    const saved = Math.max(0, 100 - (blob.size / cmpOriginal * 100));
    document.getElementById('cmpResult').innerHTML =
      `الحجم الأصلي: ${fmtSize(cmpOriginal)} ← الحجم الجديد: ${fmtSize(blob.size)}
       <span class="saved">(وفّرت ${saved.toFixed(0)}% 🎉)</span>`;
  }, 'image/jpeg', quality.value / 100);
}

document.getElementById('downloadCmp').addEventListener('click', () => {
  if (!cmpBlob) return;
  const a = document.createElement('a');
  a.download = 'صورة_مضغوطة.jpg';
  a.href = URL.createObjectURL(cmpBlob);
  a.click();
});
