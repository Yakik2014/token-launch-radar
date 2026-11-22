// トークン・ローンチ・レーダー v3 のダッシュボード。window.RADAR（main.ts が dashboard/ の隣に書く
// data.js）だけを読み、ランキング表・絞り込み・詳細（ファーム計画つき）・モデル説明を描く。
// ネットワークは一切使わない。表示する数値はすべて data.js の中にある。
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', seg: 'all', sort: 'implied' };

  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(d) {
    if (d === null || d === undefined) return '不明';
    if (d >= 365) return (d / 365).toFixed(1) + '年';
    return d + '日';
  }
  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) node.appendChild(x); });
      else node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }
  function bySlug(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return D.rows[i];
    return null;
  }

  function header() {
    return el('header', null,
      el('h1', { text: 'トークン・ローンチ・レーダー' }),
      el('p', { class: 'lede', text: 'DefiLlama スナップショット（基準日 ' + D.as_of + '）の中で、まだトークンを発行していないプロトコルを「もし今ローンチしたらいくらか」でランキングしたボードです。ウォッチリスト（TVL ' + fmtUsd(D.floor_usd) + ' 以上）は全件収録し、その下からも有望な未発行組をアーリーとして拾っています。行をクリックすると根拠とファーム計画が見られます。' }),
      el('div', { class: 'stats' },
        el('span', { class: 'chip' }, 'ボード ', el('b', { text: String(D.board_size) }), ' 件'),
        el('span', { class: 'chip' }, 'ウォッチリスト ', el('b', { text: String(D.watchlist_size) }), ' 件'),
        el('span', { class: 'chip' }, 'アーリー ', el('b', { text: String(D.early_size) }), ' 件'),
        el('span', { class: 'chip' }, 'ピア（発行済み）', el('b', { text: String(D.peer_count) }), ' 件'),
        el('span', { class: 'chip' }, '全体中央値倍率 ', el('b', { text: '×' + D.peer_global_median.toFixed(3) })),
        el('span', { class: 'chip' }, 'モデル ', el('b', { text: D.model_version }))));
  }

  function modelPanel() {
    var m = D.model;
    var rows = D.peer_categories.filter(function (c) { return c.peers > 0; }).map(function (c) {
      return el('tr', null,
        el('td', { text: c.category === null ? '（カテゴリなし）' : c.category }),
        el('td', { class: 'num', text: String(c.peers) }),
        el('td', { class: 'num', text: c.median === null ? '—' : '×' + c.median.toFixed(3) }),
        el('td', { class: 'num', text: '×' + c.effective.toFixed(3) }));
    });
    return el('section', { class: 'panel' },
      el('h2', { text: '評価モデル（' + D.model_version + '）' }),
      el('p', { text: '推定価値はスナップショット自身の数字だけで決まります。発行済みプロトコル（ピア）の時価総額÷TVL の中央値をカテゴリごとに取り、それを未発行プロトコルのTVLに掛けます。ピアが ' + m.peer_min + ' 件未満のカテゴリは、サンプル数に応じて全体中央値へ縮小（シュリンケージ）し、倍率は ×' + m.multiple_min + '〜×' + m.multiple_max + ' にクランプします。そこへ7日変化（' + m.growth_floor + '%〜+' + m.growth_cap + '% にクランプ、重み ' + m.growth_weight + '）と、追跡開始からの年数による成熟度（' + m.maturity_floor + '〜' + (m.maturity_floor + m.maturity_range) + '）を掛けます。名前による特別扱いは一切しません。' }),
      el('div', { class: 'formula', text: '推定価値 = TVL × カテゴリ倍率（中央値, 縮小・クランプ済み） × 成長倍率 × 成熟度倍率' }),
      el('div', { class: 'scroll' },
        el('table', { class: 'mini' },
          el('thead', null, el('tr', null,
            el('th', { text: 'カテゴリ' }), el('th', { class: 'num', text: 'ピア数' }),
            el('th', { class: 'num', text: '中央値倍率' }), el('th', { class: 'num', text: '採用倍率' }))),
          el('tbody', null, rows))));
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var out = D.rows.filter(function (r) {
      if (state.seg === 'wl' && !r.watchlist) return false;
      if (state.seg === 'early' && r.watchlist) return false;
      if (state.category !== 'all' && (r.category || '') !== state.category) return false;
      if (state.chain !== 'all' && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = {
      implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      change: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); }
    }[state.sort];
    return out.sort(key);
  }

  function boardView() {
    var cats = {}, chains = {};
    D.rows.forEach(function (r) {
      if (r.category) cats[r.category] = 1;
      r.chains.forEach(function (c) { chains[c] = 1; });
    });
    var catSel = el('select', { 'aria-label': 'カテゴリ', onchange: function () { state.category = catSel.value; render(); } },
      el('option', { value: 'all', text: 'カテゴリ：すべて' }),
      Object.keys(cats).sort().map(function (c) { return el('option', { value: c, text: c }); }));
    catSel.value = state.category;
    var chainSel = el('select', { 'aria-label': 'チェーン', onchange: function () { state.chain = chainSel.value; render(); } },
      el('option', { value: 'all', text: 'チェーン：すべて' }),
      Object.keys(chains).sort().map(function (c) { return el('option', { value: c, text: c }); }));
    chainSel.value = state.chain;
    var sortSel = el('select', { 'aria-label': '並び順', onchange: function () { state.sort = sortSel.value; render(); } },
      el('option', { value: 'implied', text: '推定価値順' }), el('option', { value: 'tvl', text: 'TVL順' }),
      el('option', { value: 'change', text: '7日変化順' }), el('option', { value: 'age', text: '古い順' }));
    sortSel.value = state.sort;
    var seg = el('div', { class: 'seg' }, ['all', 'wl', 'early'].map(function (s) {
      var label = s === 'all' ? 'すべて' : s === 'wl' ? 'ウォッチリスト' : 'アーリー';
      return el('button', { class: state.seg === s ? 'on' : '', text: label, onclick: function () { state.seg = s; render(); } });
    }));
    var list = filtered();
    var body = list.map(function (r) {
      return el('tr', { onclick: function () { location.hash = '#/p/' + r.slug; } },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('span', { class: 'name', text: r.name }), el('br'), el('span', { class: 'slug', text: r.slug })),
        el('td', { class: 'hideS', text: r.category || '—' }),
        el('td', { class: 'hideS', text: r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') }),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num hideS', text: '×' + r.peer_multiple.toFixed(2) }),
        el('td', { class: 'num', text: fmtUsd(r.implied_value_usd) }),
        el('td', null, el('span', { class: 'badge ' + (r.watchlist ? 'wl' : 'early'), text: r.watchlist ? 'ウォッチリスト' : 'アーリー' })));
    });
    var liveBody = D.live.map(function (r) {
      return el('tr', null,
        el('td', { text: r.name }), el('td', { class: 'hideS', text: r.category || '—' }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }), el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }));
    });
    return el('div', { class: 'shell' }, header(),
      el('div', { class: 'controls' },
        el('input', { type: 'search', placeholder: '名前・slugで検索', value: state.q, oninput: function (e) { state.q = e.target.value; refreshTable(); } }),
        catSel, chainSel, sortSel, seg,
        el('span', { class: 'count', id: 'count', text: list.length + ' 件表示' })),
      el('div', { class: 'scroll' },
        el('table', { id: 'boardTable' },
          el('thead', null, el('tr', null,
            el('th', { class: 'num', text: '#' }), el('th', { text: 'プロトコル' }),
            el('th', { class: 'hideS', text: 'カテゴリ' }), el('th', { class: 'hideS', text: 'チェーン' }),
            el('th', { class: 'num', text: 'TVL' }), el('th', { class: 'num', text: '7日' }),
            el('th', { class: 'num hideS', text: '倍率' }), el('th', { class: 'num', text: '推定価値' }),
            el('th', { text: '区分' }))),
          el('tbody', { id: 'boardBody' }, body))),
      modelPanel(),
      el('section', { class: 'panel' },
        el('h2', { text: '参考：すでに取引されているトークン（上位' + D.live.length + '件）' }),
        el('p', { text: 'こちらはモデルの推定ではなく市場の実勢価格です。倍率の物差し（ピア）がどんな顔ぶれかを確認するための表で、ランキングには混ぜていません。' }),
        el('div', { class: 'scroll' }, el('table', { class: 'mini' },
          el('thead', null, el('tr', null, el('th', { text: 'プロトコル' }), el('th', { class: 'hideS', text: 'カテゴリ' }), el('th', { class: 'num', text: '時価総額' }), el('th', { class: 'num', text: 'TVL' }))),
          el('tbody', null, liveBody)))),
      el('footer', { text: '出典：' + D.source + ' ／ このページはオフラインで動作し、外部リソースを読み込みません。' }));

    function refreshTable() {
      // 検索入力中はフォーカスを保つため、表の本体だけ差し替える。
      var fresh = boardView();
      var oldTable = document.getElementById('boardTable');
      var newTable = fresh.querySelector('#boardTable');
      var oldCount = document.getElementById('count');
      var newCount = fresh.querySelector('#count');
      if (oldTable && newTable) oldTable.replaceWith(newTable);
      if (oldCount && newCount) oldCount.textContent = newCount.textContent;
    }
  }

  function detailView(r) {
    var kv = [
      ['カテゴリ', r.category || '—'], ['チェーン', r.chains.join(', ') || '—'],
      ['TVL', fmtUsd(r.tvl_usd)], ['7日変化', fmtPct(r.change_7d)],
      ['追跡開始', r.listed_at || '不明'], ['経過', fmtAge(r.age_days)],
      ['カテゴリ倍率', '×' + r.peer_multiple.toFixed(3) + '（ピア ' + r.peer_count + ' 件）'],
      ['推定価値', fmtUsd(r.implied_value_usd)]
    ].map(function (pair) { return el('div', null, el('dt', { text: pair[0] }), el('dd', { text: pair[1] })); });
    return el('div', { class: 'shell' },
      el('div', { class: 'detail-head' },
        el('h1', { text: '#' + r.rank + ' ' + r.name }),
        el('button', { class: 'back', text: '← ボードに戻る', onclick: function () { location.hash = ''; } })),
      el('p', { class: 'lede' }, el('span', { class: 'slug', text: r.slug }), ' ／ ',
        el('span', { class: 'badge ' + (r.watchlist ? 'wl' : 'early'), text: r.watchlist ? 'ウォッチリスト' : 'アーリー（フロア未満）' })),
      el('dl', { class: 'kv' }, kv),
      el('section', { class: 'panel' },
        el('h2', { text: '推定価値の内訳' }),
        el('div', { class: 'formula', text: fmtUsd(r.tvl_usd) + '（TVL） × ' + r.peer_multiple.toFixed(3) + '（倍率） × ' + r.growth_multiplier.toFixed(3) + '（成長） × ' + r.maturity_multiplier.toFixed(3) + '（成熟度） = ' + fmtUsd(r.implied_value_usd) })),
      el('section', { class: 'panel' },
        el('h2', { text: 'ファーム計画' }),
        el('p', { text: 'このプロトコルのカテゴリ・チェーン・規模・年齢から機械的に組んだ手順です。実行前に公式ページでポイント制度の有無を必ず確認してください。' }),
        el('ol', { class: 'steps' }, r.farm_steps.map(function (s) { return el('li', { text: s }); }))),
      el('footer', { text: '出典：' + D.source }));
  }

  function render() {
    var m = location.hash.match(/^#\/p\/(.+)$/);
    var row = m ? bySlug(decodeURIComponent(m[1])) : null;
    app.textContent = '';
    app.appendChild(row ? detailView(row) : boardView());
    app.removeAttribute('aria-busy');
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  render();
})();
