/* MEDORA — логика приложения (без сборки и зависимостей) */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('ru-RU');
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const store = {
    get(key, def) { try { const v = localStorage.getItem('medora.' + key); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(key, val) { try { localStorage.setItem('medora.' + key, JSON.stringify(val)); } catch (e) { /* хранилище недоступно */ } },
  };

  // ---------- Нумерация ----------
  function universal(num) {
    const q = Math.floor(num / 10), p = num % 10;
    switch (q) {
      case 1: return String(9 - p);
      case 2: return String(8 + p);
      case 3: return String(25 - p);
      case 4: return String(24 + p);
      case 5: return 'ABCDE'[5 - p];
      case 6: return 'FGHIJ'[p - 1];
      case 7: return 'KLMNO'[5 - p];
      case 8: return 'PQRST'[p - 1];
    }
    return '';
  }
  function palmer(num) {
    const q = Math.floor(num / 10), p = num % 10;
    const mark = q >= 5 ? 'ABCDE'[p - 1] : String(p);
    const side = { 1: 'ur', 2: 'ul', 3: 'll', 4: 'lr', 5: 'ur', 6: 'ul', 7: 'll', 8: 'lr' }[q];
    return { ur: mark + '┘', ul: '└' + mark, lr: mark + '┐', ll: '┌' + mark }[side];
  }

  // ---------- Рисование зубов ----------
  const SHAPES = {
    'Резцы': 'M11 2 Q15 0 19 2 L21 22 Q25 26 25 34 Q25 42 15 42 Q5 42 5 34 Q5 26 9 22 Z',
    'Клыки': 'M12 1 Q15 -1 18 1 L21 21 Q26 27 24 34 L15 43 L6 34 Q4 27 9 21 Z',
    'Премоляры': 'M8 4 Q11 1 14 4 L15 16 L16 4 Q19 1 22 4 L23 21 Q28 26 27 33 Q26 42 15 42 Q4 42 3 33 Q2 26 7 21 Z',
    'Моляры': 'M3 6 Q6 2 9 6 L12 17 L14 4 Q16 1 18 4 L18 17 L21 6 Q24 2 27 6 L27 21 Q30 27 29 34 Q28 42 15 42 Q2 42 1 34 Q0 27 3 21 Z',
  };
  function shapeSVG(num) {
    const t = toothInfo(num);
    const d = SHAPES[t.group] || SHAPES['Моляры'];
    const flip = t.jaw === 'lower' ? ' transform="translate(0 44) scale(1 -1)"' : '';
    return `<svg class="shape" viewBox="-1 -2 32 47" aria-hidden="true"><path d="${d}"${flip}/></svg>`;
  }

  function jawHTML(dentition, toothFn) {
    const rows = ROWS[dentition];
    const half = rows.upper.length / 2;
    const row = (arr, cls) => {
      const left = arr.slice(0, half).map(toothFn).join('');
      const right = arr.slice(half).map(toothFn).join('');
      return `<div class="jaw-row ${cls}">${left}<div class="jaw-mid"></div>${right}</div>`;
    };
    return `<div class="jaw-wrap"><div class="jaw">${row(rows.upper, 'upper')}<div class="jaw-sep"></div>${row(rows.lower, 'lower')}</div></div>`;
  }

  // ---------- Роутер ----------
  const routes = { '': home, odontogram, indices, atlas, trainer };
  function route() {
    const [path, arg] = location.hash.replace(/^#\/?/, '').split('/');
    const view = routes[path] || home;
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#/' + path));
    app.innerHTML = '';
    view(arg);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ================= ГЛАВНАЯ =================
  function home() {
    app.innerHTML = `
      <section class="hero">
        <div>
          <span class="pill">Пилот для студентов-стоматологов</span>
          <h1 style="margin-top:12px">MEDORA — рабочее место будущего стоматолога</h1>
          <p class="lead">Интерактивная зубная формула, калькуляторы стоматологических индексов и тренажёры — в одном месте, с телефона, прямо на практическом занятии.</p>
          <div class="row" style="margin-top:18px">
            <a class="btn primary" href="#/odontogram">Открыть одонтограмму</a>
            <a class="btn" href="#/trainer">Проверить себя</a>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">${jawHTML('permanent', (n) => {
          const demo = { 16: 'hl', 36: 'hl', 21: 'ok', 46: 'wrong' }[n] || '';
          return `<div class="tooth small-t ${demo}">${shapeSVG(n)}<span class="num">${n}</span></div>`;
        })}</div>
      </section>

      <section class="grid modules">
        ${moduleCard('#/odontogram', 'ЗФ', 'Одонтограмма', 'Отмечайте кариес, пломбы, коронки по поверхностям — индекс КПУ считается сам.')}
        ${moduleCard('#/indices', 'Σ', 'Индексы', 'OHI-S, Фёдорова–Володкиной, PHP, API, PMA, CPITN и КПУ с интерпретацией.')}
        ${moduleCard('#/atlas', 'Ат', 'Атлас зубов', 'Каждый зуб: латынь, корни, каналы, сроки прорезывания, клинические особенности.')}
        ${moduleCard('#/trainer', 'FDI', 'Тренажёр нумерации', 'Найди зуб по номеру, назови номер, вспомни латынь — с подсчётом серии.')}
      </section>

      <section class="grid why">
        <div class="card"><h3>Под практические занятия</h3><p>Инструменты повторяют то, что студент делает на занятиях: зубная формула, гигиенические и пародонтальные индексы.</p></div>
        <div class="card"><h3>Без регистрации</h3><p>Открыл ссылку — работаешь. Данные хранятся только в вашем браузере.</p></div>
        <div class="card"><h3>Растёт вместе с курсом</h3><p>Следующие модули: рентген-тренажёр, клинические кейсы, кабинет преподавателя.</p></div>
      </section>`;
  }
  const moduleCard = (href, ic, title, text) => `<a class="card module" href="${href}"><div class="ic">${ic}</div><h3>${title}</h3><p>${text}</p></a>`;

  // ================= ОДОНТОГРАММА =================
  const condBy = Object.fromEntries(CONDITIONS.map((c) => [c.code, c]));
  let odo = store.get('odo', { dentition: 'permanent', teeth: {} });
  let odoSel = null;
  let kpuAge = store.get('kpuAge', '35');
  const saveOdo = () => store.set('odo', odo);

  function surfaceMap(num) {
    const t = toothInfo(num);
    const patientRight = [1, 4, 5, 8].includes(t.q); // на схеме — слева
    return {
      top: t.jaw === 'upper' ? 'V' : 'L',
      bottom: t.jaw === 'upper' ? 'L' : 'V',
      left: patientRight ? 'D' : 'M',
      right: patientRight ? 'M' : 'D',
      center: 'O',
    };
  }

  function odoToothSVG(num) {
    const rec = odo.teeth[num];
    const c = rec && condBy[rec.c];
    const map = surfaceMap(num);
    const fillFor = (sid) => {
      if (!c || !c.color) return '';
      if (['К', 'И'].includes(c.code)) return c.color;
      if (c.code === 'О') return '';
      const s = rec.s && rec.s.length ? rec.s : ['O'];
      if (c.surface) return s.includes(sid) ? c.color : '';
      return sid === 'O' ? c.color : '';
    };
    const poly = (pts, sid) => { const f = fillFor(sid); return `<polygon class="s" points="${pts}"${f ? ` style="fill:${f}"` : ''}/>`; };
    const cross = c && c.code === 'О' ? '<line class="x" x1="4" y1="4" x2="36" y2="36"/><line class="x" x1="36" y1="4" x2="4" y2="36"/>' : '';
    return `<svg class="sq" viewBox="-1 -1 42 42" aria-hidden="true">
      ${poly('0,0 40,0 28,12 12,12', map.top)}
      ${poly('12,28 28,28 40,40 0,40', map.bottom)}
      ${poly('0,0 12,12 12,28 0,40', map.left)}
      ${poly('40,0 28,12 28,28 40,40', map.right)}
      ${poly('12,12 28,12 28,28 12,28', map.center)}
      ${cross}</svg>`;
  }

  function odoTooth(num) {
    const rec = odo.teeth[num];
    const c = rec && condBy[rec.c];
    const label = c && c.code ? `<span class="code" style="background:${c.color}">${esc(c.code)}</span>` : '<span class="code"></span>';
    const upper = toothInfo(num).jaw === 'upper';
    const title = `${num} — ${toothInfo(num).ru}${c && c.code ? ': ' + c.label : ''}`;
    const inner = upper
      ? `<span class="num">${num}</span>${label}${odoToothSVG(num)}`
      : `${odoToothSVG(num)}${label}<span class="num">${num}</span>`;
    return `<button class="tooth ${odoSel === num ? 'sel' : ''} ${c && c.code === 'О' ? 'gone' : ''}" data-tooth="${num}" title="${esc(title)}" aria-label="${esc(title)}">${inner}</button>`;
  }

  function surfCount(num) { return num % 10 >= 4 ? 5 : 4; }
  function calcKPU() {
    const list = ROWS[odo.dentition].upper.concat(ROWS[odo.dentition].lower);
    const primary = odo.dentition === 'primary';
    const r = { К: 0, П: 0, У: 0, sК: 0, sП: 0, sУ: 0 };
    list.forEach((n) => {
      const rec = odo.teeth[n];
      if (!rec) return;
      const c = condBy[rec.c];
      if (!c || !c.kpu) return;
      if (primary && c.kpu === 'У') return; // в кп временных зубов удалённые не учитываются
      r[c.kpu]++;
      const full = ['К', 'И', 'О', 'R'].includes(c.code);
      r['s' + c.kpu] += full ? surfCount(n) : Math.max(1, (rec.s || []).length);
    });
    r.total = r.К + r.П + (primary ? 0 : r.У);
    r.stotal = r.sК + r.sП + (primary ? 0 : r.sУ);
    return r;
  }
  function levelOf(val, levels) { for (const [max, name] of levels) if (val <= max) return name; return levels[levels.length - 1][1]; }

  function odontogram(arg) {
    if (arg && toothInfo(+arg)) {
      const n = +arg;
      odo.dentition = n >= 50 ? 'primary' : 'permanent';
      odoSel = n;
    }
    app.innerHTML = `
      <div class="page-head">
        <h1>Интерактивная одонтограмма</h1>
        <p>Нажмите на зуб, выберите состояние и поражённые поверхности. Индекс КПУ (кп для временных зубов) пересчитывается автоматически. Учебный режим — не вводите данные реальных пациентов.</p>
      </div>
      <div class="odo-layout">
        <div class="card">
          <div class="row no-print" style="justify-content:space-between;margin-bottom:14px">
            <div class="seg" id="dent">
              <button data-d="permanent" class="${odo.dentition === 'permanent' ? 'on' : ''}">Постоянные</button>
              <button data-d="primary" class="${odo.dentition === 'primary' ? 'on' : ''}">Временные</button>
            </div>
            <div class="row">
              <button class="btn" id="demo">Пример</button>
              <button class="btn" id="copy">Копировать</button>
              <button class="btn" id="print">Печать</button>
              <button class="btn" id="clear">Очистить</button>
            </div>
          </div>
          <div id="jaw"></div>
          <div class="legend">${CONDITIONS.filter((c) => c.code).map((c) => `<span><i style="background:${c.color}"></i>${esc(c.code)} — ${c.label}</span>`).join('')}</div>
          <h3 style="margin-top:20px">Зубная формула</h3>
          <ul class="record-list" id="records"></ul>
        </div>
        <div class="side">
          <div class="card" id="panel"></div>
          <div class="card" id="kpu"></div>
        </div>
      </div>`;

    const jaw = app.querySelector('#jaw');
    const panel = app.querySelector('#panel');
    const kpuEl = app.querySelector('#kpu');
    const records = app.querySelector('#records');

    function renderJaw() { jaw.innerHTML = jawHTML(odo.dentition, odoTooth); }
    function renderPanel() {
      if (!odoSel) {
        panel.innerHTML = `<h3>Выберите зуб</h3><p class="muted">Нажмите на любой зуб на схеме, чтобы отметить его состояние.</p>
          <p class="muted small">Схема ориентирована так, как врач видит пациента: правая сторона пациента — слева.</p>`;
        return;
      }
      const t = toothInfo(odoSel);
      const rec = odo.teeth[odoSel] || { c: '', s: [], n: '' };
      const c = condBy[rec.c];
      panel.innerHTML = `
        <div class="panel-title"><h3>Зуб ${t.num}</h3><a class="small" href="#/atlas/${t.num}">в атласе →</a></div>
        <p class="muted small" style="margin:0">${t.ru}${t.primary ? ' (временный)' : ''}, ${t.quadrant} сегмент</p>
        <div class="cond-list">${CONDITIONS.map((x) => `
          <button class="cond ${rec.c === x.code ? 'on' : ''}" data-cond="${esc(x.code)}">
            <i style="background:${x.color || 'var(--c-healthy)'};${x.color ? '' : 'color:var(--muted)'}">${esc(x.code) || '✓'}</i>${x.label}</button>`).join('')}
        </div>
        ${c && c.surface ? `<div class="small muted">Поверхности:</div><div class="surf-list">${SURFACES.map((s) => `
          <label><input type="checkbox" data-surf="${s.id}" ${(rec.s || []).includes(s.id) ? 'checked' : ''}> ${s.ru}</label>`).join('')}</div>` : ''}
        <textarea id="note" placeholder="Комментарий (например: глубокая кариозная полость, II класс по Блэку)">${esc(rec.n || '')}</textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn" id="prev">←</button>
          <button class="btn" id="next">→</button>
          <span class="muted small">или стрелки на клавиатуре</span>
        </div>`;
    }
    function renderKPU() {
      const r = calcKPU();
      const primary = odo.dentition === 'primary';
      if (primary) {
        kpuEl.innerHTML = `<h3>Индекс кп (временные зубы)</h3>
          <div class="kpu-box" style="grid-template-columns:repeat(3,1fr)">
            <div><b>${r.К}</b><span>к — кариес</span></div><div><b>${r.П}</b><span>п — пломба</span></div>
            <div class="total"><b>${r.total}</b><span>кп(з)</span></div></div>
          <p class="small muted">кп(п) по поверхностям: <b>${r.stotal}</b>. Удалённые временные зубы в кп не учитываются.</p>`;
        return;
      }
      const L = KPU_LEVELS[kpuAge];
      kpuEl.innerHTML = `<h3>Индекс КПУ</h3>
        <div class="kpu-box">
          <div><b>${r.К}</b><span>К</span></div><div><b>${r.П}</b><span>П</span></div><div><b>${r.У}</b><span>У</span></div>
          <div class="total"><b>${r.total}</b><span>КПУз</span></div></div>
        <p class="small" style="margin-bottom:6px">КПУп (по поверхностям): <b>${r.stotal}</b></p>
        <div class="form-row"><span class="small muted">Оценка по ВОЗ для группы:</span>
          <select id="age">${Object.entries(KPU_LEVELS).map(([k, v]) => `<option value="${k}" ${k === kpuAge ? 'selected' : ''}>${v.title}</option>`).join('')}</select></div>
        <p style="margin:0">Интенсивность кариеса: <b>${levelOf(r.total, L.levels)}</b></p>
        <p class="small muted" style="margin-top:8px">К — кариес и его осложнения (С, Р, Pt, R), П — пломбы и коронки, У — удалённые зубы.</p>`;
    }
    function renderRecords() {
      const nums = ROWS[odo.dentition].upper.concat(ROWS[odo.dentition].lower).filter((n) => odo.teeth[n] && odo.teeth[n].c);
      nums.sort((a, b) => a - b);
      records.innerHTML = nums.length ? nums.map((n) => `<li>${recordText(n)}</li>`).join('') : '<li class="muted">Пока нет отметок — все зубы здоровы.</li>';
    }
    function recordText(n) {
      const rec = odo.teeth[n];
      const c = condBy[rec.c];
      const s = c.surface && rec.s && rec.s.length ? ' (' + rec.s.map((id) => SURFACES.find((x) => x.id === id).ru).join(', ') + ')' : '';
      return `<b>${n}</b> — ${c.label}${s}${rec.n ? ' — ' + esc(rec.n) : ''}`;
    }
    function renderAll() { renderJaw(); renderPanel(); renderKPU(); renderRecords(); }
    function update(fn) {
      const rec = odo.teeth[odoSel] || { c: '', s: [], n: '' };
      fn(rec);
      if (!rec.c && !rec.n) delete odo.teeth[odoSel]; else odo.teeth[odoSel] = rec;
      saveOdo();
    }
    function move(dir) {
      const order = ROWS[odo.dentition].upper.concat(ROWS[odo.dentition].lower.slice().reverse());
      const i = order.indexOf(odoSel);
      odoSel = order[(i + dir + order.length) % order.length];
      renderJaw(); renderPanel();
    }

    app.querySelector('#dent').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      odo.dentition = b.dataset.d; odoSel = null; saveOdo();
      app.querySelectorAll('#dent button').forEach((x) => x.classList.toggle('on', x === b));
      renderAll();
    });
    jaw.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tooth]'); if (!b) return;
      odoSel = +b.dataset.tooth; renderJaw(); renderPanel();
    });
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cond]');
      if (b) {
        update((rec) => { rec.c = b.dataset.cond; if (!condBy[rec.c].surface) rec.s = []; });
        renderAll();
      }
      if (e.target.id === 'prev') move(-1);
      if (e.target.id === 'next') move(1);
    });
    panel.addEventListener('change', (e) => {
      if (e.target.dataset.surf) {
        update((rec) => {
          const set = new Set(rec.s || []);
          e.target.checked ? set.add(e.target.dataset.surf) : set.delete(e.target.dataset.surf);
          rec.s = SURFACES.map((s) => s.id).filter((id) => set.has(id));
        });
        renderJaw(); renderKPU(); renderRecords();
      }
    });
    panel.addEventListener('input', (e) => {
      if (e.target.id === 'note') { update((rec) => { rec.n = e.target.value; }); renderRecords(); }
    });
    kpuEl.addEventListener('change', (e) => {
      if (e.target.id === 'age') { kpuAge = e.target.value; store.set('kpuAge', kpuAge); renderKPU(); }
    });
    app.querySelector('#clear').onclick = () => {
      if (!confirm('Очистить все отметки на одонтограмме?')) return;
      odo.teeth = {}; odoSel = null; saveOdo(); renderAll();
    };
    app.querySelector('#demo').onclick = () => {
      odo.dentition = 'permanent';
      odo.teeth = {
        16: { c: 'С', s: ['O'], n: 'кариес дентина' }, 17: { c: 'П', s: ['O', 'M'], n: '' }, 26: { c: 'К', s: [], n: '' },
        21: { c: 'П', s: ['M'], n: 'композит' }, 36: { c: 'О', s: [], n: '' }, 37: { c: 'Р', s: [], n: '' },
        46: { c: 'Pt', s: [], n: '' }, 47: { c: 'Г', s: [], n: '' }, 45: { c: 'С', s: ['D'], n: '' }, 18: { c: 'О', s: [], n: '' },
      };
      odoSel = 16; saveOdo();
      app.querySelectorAll('#dent button').forEach((x) => x.classList.toggle('on', x.dataset.d === 'permanent'));
      renderAll();
    };
    app.querySelector('#print').onclick = () => window.print();
    app.querySelector('#copy').onclick = (e) => {
      const nums = Object.keys(odo.teeth).map(Number).filter((n) => odo.teeth[n].c && (odo.dentition === 'primary') === (n >= 50)).sort((a, b) => a - b);
      const r = calcKPU();
      const lines = nums.map((n) => recordText(n).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
      lines.push(odo.dentition === 'primary' ? `кп(з) = ${r.total}` : `КПУз = ${r.К}+${r.П}+${r.У} = ${r.total}; КПУп = ${r.stotal}`);
      const btn = e.currentTarget;
      const done = () => { btn.textContent = 'Скопировано'; setTimeout(() => { btn.textContent = 'Копировать'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(lines.join('\n')).then(done, () => alert(lines.join('\n')));
      else alert(lines.join('\n'));
    };
    document.onkeydown = (e) => {
      if (!location.hash.startsWith('#/odontogram') || !odoSel || /TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') { move(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { move(-1); e.preventDefault(); }
    };
    renderAll();
  }

  // ================= ИНДЕКСЫ =================
  const INDICES = [
    {
      id: 'ohis', name: 'OHI-S', sub: 'Грин–Вермиллион',
      render() {
        const teeth = [[16, 'вестибулярная'], [11, 'вестибулярная'], [26, 'вестибулярная'], [31, 'вестибулярная'], [36, 'язычная'], [46, 'язычная']];
        return `<h2>Упрощённый индекс гигиены OHI-S</h2>
          <p class="muted">Green J.C., Vermillion J.R., 1964. Налёт и камень оцениваются на шести зубах по шкале 0–3.</p>
          <div class="table-wrap"><table class="t"><tr><th>Зуб</th><th>Поверхность</th><th>Налёт (DI)</th><th>Камень (CI)</th></tr>
          ${teeth.map(([n, s]) => `<tr><td><b>${n}</b></td><td>${s}</td><td>${sel('di' + n, 0, 3)}</td><td>${sel('ci' + n, 0, 3)}</td></tr>`).join('')}
          </table></div>
          <div class="result" id="res"></div>
          <details class="how"><summary>Критерии оценки</summary><ul>
            <li><b>0</b> — налёт (камень) отсутствует;</li>
            <li><b>1</b> — покрывает не более 1/3 поверхности;</li>
            <li><b>2</b> — от 1/3 до 2/3 поверхности (для камня — или отдельные участки поддесневого камня);</li>
            <li><b>3</b> — более 2/3 поверхности (для камня — или поддесневой камень вокруг шейки зуба).</li>
          </ul><p class="small">OHI-S = DI-S + CI-S, где DI-S и CI-S — суммы баллов, делённые на 6.</p></details>`;
      },
      calc(v) {
        const ns = [16, 11, 26, 31, 36, 46];
        const di = ns.reduce((a, n) => a + v['di' + n], 0) / 6;
        const ci = ns.reduce((a, n) => a + v['ci' + n], 0) / 6;
        const total = di + ci;
        return { val: fmt(total), extra: `DI-S = ${fmt(di)}, CI-S = ${fmt(ci)}`, x: total,
          scale: [[0.6, 'хороший', 'good'], [1.6, 'удовлетворительный', 'warn'], [2.5, 'неудовлетворительный', 'bad'], [6, 'плохой', 'bad']],
          scaleText: ['0–0,6 хороший', '0,7–1,6 удовл.', '1,7–2,5 неудовл.', '> 2,6 плохой'] };
      },
    },
    {
      id: 'fv', name: 'Фёдорова–Володкиной', sub: 'гигиенический индекс',
      render() {
        const teeth = [43, 42, 41, 31, 32, 33];
        return `<h2>Индекс гигиены Фёдорова–Володкиной</h2>
          <p class="muted">1971. Вестибулярные поверхности шести нижних фронтальных зубов окрашивают йодсодержащим раствором (Шиллера–Писарева) и оценивают по шкале 1–5.</p>
          <div class="table-wrap"><table class="t"><tr><th>Зуб</th><th>Оценка</th></tr>
          ${teeth.map((n) => `<tr><td><b>${n}</b></td><td>${sel('fv' + n, 1, 5)}</td></tr>`).join('')}</table></div>
          <div class="result" id="res"></div>
          <details class="how"><summary>Критерии оценки</summary><ul>
            <li><b>1</b> — окрашивания нет;</li><li><b>2</b> — окрашена 1/4 поверхности коронки;</li>
            <li><b>3</b> — 1/2 поверхности;</li><li><b>4</b> — 3/4 поверхности;</li><li><b>5</b> — вся поверхность.</li>
          </ul><p class="small">Индекс = сумма баллов / 6.</p></details>`;
      },
      calc(v) {
        const x = [43, 42, 41, 31, 32, 33].reduce((a, n) => a + v['fv' + n], 0) / 6;
        return { val: fmt(x), x,
          scale: [[1.5, 'хороший', 'good'], [2.0, 'удовлетворительный', 'warn'], [2.5, 'неудовлетворительный', 'bad'], [3.4, 'плохой', 'bad'], [5, 'очень плохой', 'bad']],
          scaleText: ['1,1–1,5 хороший', '1,6–2,0 удовл.', '2,1–2,5 неудовл.', '2,6–3,4 плохой', '3,5–5,0 очень плохой'] };
      },
    },
    {
      id: 'php', name: 'PHP', sub: 'Подшадли–Хейли',
      render() {
        const teeth = [[16, 'вестибулярная'], [26, 'вестибулярная'], [11, 'вестибулярная'], [31, 'вестибулярная'], [36, 'язычная'], [46, 'язычная']];
        return `<h2>Индекс эффективности гигиены PHP</h2>
          <p class="muted">Podshadley A.G., Haley J.V., 1968. После окрашивания поверхность каждого зуба делят на 5 участков; за каждый окрашенный участок — 1 балл (0–5 на зуб).</p>
          <div class="table-wrap"><table class="t"><tr><th>Зуб</th><th>Поверхность</th><th>Окрашенных участков</th></tr>
          ${teeth.map(([n, s]) => `<tr><td><b>${n}</b></td><td>${s}</td><td>${sel('php' + n, 0, 5)}</td></tr>`).join('')}</table></div>
          <div class="result" id="res"></div>
          <details class="how"><summary>Участки поверхности</summary><ul>
            <li>медиальный, дистальный, средне-окклюзионный, центральный, средне-пришеечный.</li>
          </ul><p class="small">PHP = сумма баллов / число обследованных зубов (6).</p></details>`;
      },
      calc(v) {
        const x = [16, 26, 11, 31, 36, 46].reduce((a, n) => a + v['php' + n], 0) / 6;
        return { val: fmt(x), x,
          scale: [[0, 'отличный', 'good'], [0.6, 'хороший', 'good'], [1.6, 'удовлетворительный', 'warn'], [5, 'неудовлетворительный', 'bad']],
          scaleText: ['0 отличный', '0,1–0,6 хороший', '0,7–1,6 удовл.', '≥ 1,7 неудовл.'] };
      },
    },
    {
      id: 'api', name: 'API', sub: 'апроксимальный индекс Ланге',
      render() {
        return `<h2>Апроксимальный индекс налёта API</h2>
          <p class="muted">Lange D.E., 1977. Наличие налёта на контактных поверхностях оценивается ответом «да/нет»: в 1-м и 3-м квадрантах — с оральной стороны, во 2-м и 4-м — с вестибулярной.</p>
          <div class="form-row"><label for="apiN">Обследовано межзубных промежутков</label>${num('apiN', 1, 30, 24)}</div>
          <div class="form-row"><label for="apiP">Из них с налётом</label>${num('apiP', 0, 30, 8)}</div>
          <div class="result" id="res"></div>
          <details class="how"><summary>Формула</summary><p class="small">API = (число промежутков с налётом / число обследованных промежутков) × 100%.</p></details>`;
      },
      calc(v) {
        if (!v.apiN || v.apiP > v.apiN) return { error: 'Число промежутков с налётом не может превышать число обследованных.' };
        const x = v.apiP / v.apiN * 100;
        return { val: fmt(x, 1) + '%', x,
          scale: [[24.999, 'оптимальная гигиена', 'good'], [39.999, 'хорошая гигиена', 'good'], [69.999, 'удовлетворительная гигиена', 'warn'], [100, 'неудовлетворительная гигиена', 'bad']],
          scaleText: ['< 25% оптимальная', '25–39% хорошая', '40–69% удовл.', '70–100% неудовл.'] };
      },
    },
    {
      id: 'pma', name: 'PMA', sub: 'папиллярно-маргинально-альвеолярный',
      render() {
        return `<h2>Индекс PMA (в модификации Parma)</h2>
          <p class="muted">Оценка воспаления десны после окрашивания раствором Шиллера–Писарева. У каждого зуба учитывается наиболее выраженная степень воспаления.</p>
          <div class="form-row"><label for="pmaN">Число зубов (возраст)</label>
            <select id="pmaN"><option value="24">24 — 6–11 лет</option><option value="28">28 — 12–14 лет</option><option value="30" selected>30 — 15 лет и старше</option></select></div>
          <div class="form-row"><label for="pma1">Зубов с воспалением сосочка (P = 1)</label>${num('pma1', 0, 32, 4)}</div>
          <div class="form-row"><label for="pma2">Зубов с воспалением маргинальной десны (M = 2)</label>${num('pma2', 0, 32, 2)}</div>
          <div class="form-row"><label for="pma3">Зубов с воспалением альвеолярной десны (A = 3)</label>${num('pma3', 0, 32, 0)}</div>
          <div class="result" id="res"></div>
          <details class="how"><summary>Формула</summary><p class="small">PMA = (сумма баллов / (3 × число зубов)) × 100%. Число зубов при сохранённых зубных рядах: 6–11 лет — 24, 12–14 лет — 28, 15 лет и старше — 30.</p></details>`;
      },
      calc(v) {
        const teeth = v.pma1 + v.pma2 + v.pma3;
        if (teeth > v.pmaN) return { error: `Сумма зубов (${teeth}) больше числа зубов в группе (${v.pmaN}).` };
        const sum = v.pma1 + 2 * v.pma2 + 3 * v.pma3;
        const x = sum / (3 * v.pmaN) * 100;
        return { val: fmt(x, 1) + '%', extra: `Сумма баллов: ${sum}`, x,
          scale: [[0, 'воспаления нет', 'good'], [30, 'лёгкая степень гингивита', 'warn'], [60, 'средняя степень гингивита', 'bad'], [100, 'тяжёлая степень гингивита', 'bad']],
          scaleText: ['0%', 'до 30% лёгкая', '31–60% средняя', '≥ 61% тяжёлая'] };
      },
    },
    {
      id: 'cpitn', name: 'CPITN', sub: 'нуждаемость в лечении пародонта',
      render() {
        const sx = [['17–14', '17, 16'], ['13–23', '11'], ['24–27', '26, 27'], ['47–44', '47, 46'], ['43–33', '31'], ['34–37', '36, 37']];
        const opts = '<option value="0">0 — здоров</option><option value="1">1 — кровоточивость</option><option value="2">2 — зубной камень</option><option value="3">3 — карман 4–5 мм</option><option value="4">4 — карман ≥ 6 мм</option><option value="X">X — исключён</option>';
        return `<h2>Индекс CPITN</h2>
          <p class="muted">ВОЗ, 1982. Пародонт обследуется пуговчатым зондом по секстантам; у взрослых (20 лет и старше) — по индексным зубам. В секстант записывается наихудший код.</p>
          <div class="table-wrap"><table class="t"><tr><th>Секстант</th><th>Индексные зубы</th><th>Код</th></tr>
          ${sx.map(([s, t], i) => `<tr><td><b>${s}</b></td><td>${t}</td><td><select id="cp${i}">${opts}</select></td></tr>`).join('')}</table></div>
          <div class="result" id="res"></div>
          <details class="how"><summary>Нуждаемость в лечении</summary><ul>
            <li><b>0</b> — лечение не требуется;</li><li><b>1</b> — обучение гигиене полости рта (TN I);</li>
            <li><b>2–3</b> — гигиена + профессиональное удаление зубных отложений (TN II);</li>
            <li><b>4</b> — комплексное лечение (TN III).</li></ul></details>`;
      },
      raw: true,
      calc() {
        const codes = [0, 1, 2, 3, 4, 5].map((i) => app.querySelector('#cp' + i).value);
        const valid = codes.filter((c) => c !== 'X').map(Number);
        if (!valid.length) return { error: 'Все секстанты исключены.' };
        const max = Math.max(...valid);
        const need = ['лечение не требуется (TN 0)', 'обучение гигиене полости рта (TN I)', 'гигиена + удаление зубных отложений (TN II)', 'гигиена + удаление зубных отложений (TN II)', 'комплексное лечение (TN III)'][max];
        const dist = [0, 1, 2, 3, 4].map((k) => `код ${k}: ${valid.filter((c) => c === k).length}`).join(' · ');
        return { val: 'max ' + max, extra: dist + ` · исключено: ${6 - valid.length}`, level: need, cls: max === 0 ? 'good' : max <= 2 ? 'warn' : 'bad' };
      },
    },
    {
      id: 'kpu', name: 'КПУ', sub: 'интенсивность кариеса',
      render() {
        return `<h2>Индекс КПУ</h2>
          <p class="muted">Сумма кариозных (К), пломбированных (П) и удалённых (У) зубов у одного человека. Удобнее всего считать прямо в <a href="#/odontogram">одонтограмме</a>.</p>
          <div class="form-row"><label for="kK">К — кариес и его осложнения</label>${num('kK', 0, 32, 3)}</div>
          <div class="form-row"><label for="kP">П — пломбы (коронки)</label>${num('kP', 0, 32, 4)}</div>
          <div class="form-row"><label for="kU">У — удалённые</label>${num('kU', 0, 32, 1)}</div>
          <div class="form-row"><label for="kAge">Возрастная группа ВОЗ</label>
            <select id="kAge">${Object.entries(KPU_LEVELS).map(([k, v]) => `<option value="${k}" ${k === '35' ? 'selected' : ''}>${v.title}</option>`).join('')}</select></div>
          <div class="result" id="res"></div>`;
      },
      raw: true,
      calc() {
        const g = (id) => Math.max(0, +app.querySelector('#' + id).value || 0);
        const K = g('kK'), P = g('kP'), U = g('kU');
        const total = K + P + U;
        if (total > 32) return { error: 'Сумма К+П+У не может быть больше 32.' };
        const L = KPU_LEVELS[app.querySelector('#kAge').value].levels;
        const lvl = levelOf(total, L);
        return { val: total, extra: `К ${K} + П ${P} + У ${U}`, level: 'интенсивность кариеса: ' + lvl,
          cls: /низкий/.test(lvl) ? 'good' : lvl === 'умеренный' ? 'warn' : 'bad' };
      },
    },
  ];
  function sel(id, min, max) {
    let o = '';
    for (let i = min; i <= max; i++) o += `<option value="${i}">${i}</option>`;
    return `<select id="${id}" data-v>${o}</select>`;
  }
  function num(id, min, max, val) { return `<input type="number" id="${id}" data-v min="${min}" max="${max}" value="${val}" inputmode="numeric">`; }

  function indices(arg) {
    const cur = INDICES.find((i) => i.id === arg) || INDICES[0];
    app.innerHTML = `
      <div class="page-head"><h1>Стоматологические индексы</h1>
        <p>Введите оценки — результат и интерпретация считаются сразу. Под каждым калькулятором есть критерии оценки.</p></div>
      <div class="idx-layout">
        <div class="idx-menu">${INDICES.map((i) => `<button data-id="${i.id}" class="${i === cur ? 'on' : ''}">${i.name}<small>${i.sub}</small></button>`).join('')}</div>
        <div class="card" id="idx">${cur.render()}</div>
      </div>`;
    app.querySelector('.idx-menu').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (b) location.hash = '#/indices/' + b.dataset.id;
    });
    const card = app.querySelector('#idx');
    const recalc = () => {
      const v = {};
      card.querySelectorAll('[data-v], select').forEach((el) => { v[el.id] = Math.max(0, +el.value || 0); });
      const r = cur.calc(v);
      const res = card.querySelector('#res');
      if (r.error) { res.innerHTML = `<div class="lvl bad">${r.error}</div>`; return; }
      let level = r.level, cls = r.cls, scaleHTML = '';
      if (r.scale) {
        const idx = r.scale.findIndex(([max]) => r.x <= max + 1e-9);
        const i = idx === -1 ? r.scale.length - 1 : idx;
        level = r.scale[i][1]; cls = r.scale[i][2];
        scaleHTML = `<div class="scale">${r.scaleText.map((t, k) => `<div class="${k === i ? 'on' : ''}">${t}</div>`).join('')}</div>`;
      }
      res.innerHTML = `<div class="muted small">Результат</div><div class="val">${r.val}</div>
        ${r.extra ? `<div class="small muted">${r.extra}</div>` : ''}<div class="lvl ${cls}">${level}</div>${scaleHTML}`;
    };
    card.addEventListener('input', recalc);
    card.addEventListener('change', recalc);
    recalc();
  }

  // ================= АТЛАС =================
  let atlasDent = 'permanent';
  function atlas(arg) {
    let sel = arg && toothInfo(+arg) ? +arg : null;
    if (sel) atlasDent = sel >= 50 ? 'primary' : 'permanent';
    app.innerHTML = `
      <div class="page-head"><h1>Атлас зубов</h1>
        <p>Нажмите на зуб — откроется карточка: номер в трёх системах, латинское название, корни, каналы, сроки прорезывания и клинические особенности.</p></div>
      <div class="card">
        <div class="seg" id="adent" style="margin-bottom:14px">
          <button data-d="permanent">Постоянные</button><button data-d="primary">Временные</button></div>
        <div id="ajaw"></div>
      </div>
      <div class="card atlas-card" id="acard" style="margin-top:16px"></div>`;
    const jawEl = app.querySelector('#ajaw'), cardEl = app.querySelector('#acard');
    const draw = () => {
      app.querySelectorAll('#adent button').forEach((b) => b.classList.toggle('on', b.dataset.d === atlasDent));
      jawEl.innerHTML = jawHTML(atlasDent, (n) => {
        const up = toothInfo(n).jaw === 'upper';
        const inner = up ? `<span class="num">${n}</span>${shapeSVG(n)}` : `${shapeSVG(n)}<span class="num">${n}</span>`;
        return `<button class="tooth ${sel === n ? 'sel hl' : ''}" data-tooth="${n}" aria-label="Зуб ${n}">${inner}</button>`;
      });
      if (!sel) { cardEl.innerHTML = '<p class="muted" style="margin:0">Выберите зуб на схеме.</p>'; return; }
      const t = toothInfo(sel);
      cardEl.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div><h2 style="margin:0">${t.num} — ${t.ru}${t.primary ? ' (временный)' : ''}</h2>
          <div class="muted"><i>${t.la}</i></div></div>
          <a class="btn" href="#/odontogram/${t.num}">Отметить в одонтограмме</a>
        </div>
        <div class="codes"><span>FDI: <b>${t.num}</b></span><span>Universal: <b>${universal(t.num)}</b></span><span>Palmer: <b>${palmer(t.num)}</b></span></div>
        <dl>
          <dt>Сегмент</dt><dd>${t.quadrant}${t.primary ? ' (временный прикус)' : ''}</dd>
          <dt>Группа</dt><dd>${t.group}</dd>
          <dt>Корни</dt><dd>${t.roots}</dd>
          ${t.canals ? `<dt>Каналы (типично)</dt><dd>${t.canals}</dd>` : ''}
          <dt>Прорезывание</dt><dd>${t.erupt}</dd>
          ${t.crown ? `<dt>Коронка</dt><dd>${t.crown}</dd>` : ''}
          ${t.notes ? `<dt>Особенности</dt><dd>${t.notes}</dd>` : ''}
          ${t.path ? `<dt>Клиника</dt><dd>${t.path}</dd>` : ''}
        </dl>
        <p class="small muted" style="margin:12px 0 0">Число корней и каналов — типичный вариант; анатомическая вариабельность встречается часто.</p>`;
    };
    app.querySelector('#adent').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      atlasDent = b.dataset.d; sel = null; draw();
    });
    jawEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tooth]'); if (!b) return;
      sel = +b.dataset.tooth; draw();
      if (window.innerWidth < 1000) cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    draw();
  }

  // ================= ТРЕНАЖЁР =================
  const QUIZ_MODES = {
    find: 'Найди зуб',
    name: 'Назови номер',
    latin: 'Латынь',
    universal: 'FDI → Universal',
  };
  function trainer() {
    const st = { mode: 'find', dent: 'permanent', right: 0, total: 0, streak: 0, best: store.get('best', 0), q: null, locked: false };
    app.innerHTML = `
      <div class="page-head"><h1>Тренажёр нумерации зубов</h1>
        <p>Международная система FDI (ВОЗ): первая цифра — сегмент (1–4 постоянные, 5–8 временные), вторая — зуб от центра к краю.</p></div>
      <div class="card">
        <div class="quiz-top">
          <div class="row">
            <div class="seg" id="qmode">${Object.entries(QUIZ_MODES).map(([k, v]) => `<button data-m="${k}">${v}</button>`).join('')}</div>
            <div class="seg" id="qdent"><button data-d="permanent">Постоянные</button><button data-d="primary">Временные</button></div>
          </div>
          <div class="score" id="score"></div>
        </div>
        <div class="quiz-q" id="q"></div>
        <div id="qjaw"></div>
        <div class="opts" id="opts"></div>
        <div class="feedback" id="fb"></div>
        <div class="row" style="margin-top:10px"><button class="btn primary" id="nextq" hidden>Следующий вопрос →</button></div>
      </div>`;
    const qEl = app.querySelector('#q'), jawEl = app.querySelector('#qjaw'), optsEl = app.querySelector('#opts'),
      fbEl = app.querySelector('#fb'), scoreEl = app.querySelector('#score'), nextBtn = app.querySelector('#nextq');

    const all = () => ROWS[st.dent].upper.concat(ROWS[st.dent].lower);
    const marks = {};
    function drawJaw() {
      jawEl.innerHTML = jawHTML(st.dent, (n) => {
        const up = toothInfo(n).jaw === 'upper';
        // номера скрыты: их нужно знать, а не читать
        const inner = up ? `<span class="num">&nbsp;</span>${shapeSVG(n)}` : `${shapeSVG(n)}<span class="num">&nbsp;</span>`;
        return `<button class="tooth ${marks[n] || ''}" data-tooth="${n}" aria-label="Зуб">${inner}</button>`;
      });
    }
    function drawScore() {
      scoreEl.innerHTML = `<div><span>Верно</span> ${st.right}/${st.total}</div><div><span>Серия</span> ${st.streak}</div><div><span>Рекорд</span> ${st.best}</div>`;
    }
    function options(correct, gen) {
      const set = new Set([correct]);
      const pool = shuffle(all().map(gen).filter((x) => x !== correct));
      for (const x of pool) { if (set.size >= 4) break; set.add(x); }
      return shuffle([...set]);
    }
    function ask() {
      st.locked = false; nextBtn.hidden = true; fbEl.textContent = ''; fbEl.className = 'feedback';
      Object.keys(marks).forEach((k) => delete marks[k]);
      const n = all()[Math.floor(Math.random() * all().length)];
      const t = toothInfo(n);
      st.q = n;
      optsEl.innerHTML = '';
      if (st.mode === 'find') {
        qEl.innerHTML = `Найдите зуб <b>${n}</b>`;
      } else {
        marks[n] = 'hl';
        if (st.mode === 'name') {
          qEl.innerHTML = 'Какой номер у выделенного зуба?';
          optsEl.innerHTML = options(String(n), String).map((o) => `<button class="btn" data-a="${o}">${o}</button>`).join('');
        } else if (st.mode === 'latin') {
          qEl.innerHTML = 'Как называется выделенный зуб по-латыни?';
          optsEl.innerHTML = options(t.la, (x) => toothInfo(x).la).map((o) => `<button class="btn" data-a="${esc(o)}">${esc(o)}</button>`).join('');
        } else {
          qEl.innerHTML = `Зуб <b>${n}</b> по FDI — какой номер в системе Universal?`;
          optsEl.innerHTML = options(universal(n), universal).map((o) => `<button class="btn" data-a="${o}">${o}</button>`).join('');
        }
      }
      drawJaw(); drawScore();
    }
    function answer(ok, chosenEl) {
      st.locked = true; st.total++;
      if (ok) { st.right++; st.streak++; if (st.streak > st.best) { st.best = st.streak; store.set('best', st.best); } }
      else st.streak = 0;
      const t = toothInfo(st.q);
      fbEl.className = 'feedback ' + (ok ? 'ok' : 'wrong');
      fbEl.textContent = (ok ? 'Верно! ' : 'Неверно. ') + `${t.num} — ${t.ru.toLowerCase()}, ${t.quadrant} сегмент${t.primary ? ' (временный)' : ''}.`;
      marks[st.q] = 'ok';
      drawJaw(); drawScore();
      if (chosenEl) {
        optsEl.querySelectorAll('[data-a]').forEach((b) => {
          const correct = st.mode === 'name' ? String(st.q) : st.mode === 'latin' ? t.la : universal(st.q);
          if (b.dataset.a === correct) b.classList.add('ok');
          else if (b === chosenEl) b.classList.add('wrong');
          b.disabled = true;
        });
      }
      nextBtn.hidden = false; nextBtn.focus();
    }
    jawEl.addEventListener('click', (e) => {
      if (st.mode !== 'find' || st.locked) return;
      const b = e.target.closest('[data-tooth]'); if (!b) return;
      const n = +b.dataset.tooth;
      if (n !== st.q) marks[n] = 'wrong';
      answer(n === st.q);
    });
    optsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b || st.locked) return;
      const t = toothInfo(st.q);
      const correct = st.mode === 'name' ? String(st.q) : st.mode === 'latin' ? t.la : universal(st.q);
      answer(b.dataset.a === correct, b);
    });
    nextBtn.onclick = ask;
    const syncSeg = () => {
      app.querySelectorAll('#qmode button').forEach((b) => b.classList.toggle('on', b.dataset.m === st.mode));
      app.querySelectorAll('#qdent button').forEach((b) => b.classList.toggle('on', b.dataset.d === st.dent));
    };
    app.querySelector('#qmode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.mode = b.dataset.m; syncSeg(); ask(); });
    app.querySelector('#qdent').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.dent = b.dataset.d; syncSeg(); ask(); });
    syncSeg(); ask();
  }

  route();
})();
