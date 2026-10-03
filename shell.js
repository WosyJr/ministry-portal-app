(function () {
  var M = window.ministry;
  if (!M) return;

  var HALLS = [
    { key: 'hall', name: 'The Hall', path: '/hall', d: 'M3 11l9-7 9 7M5 10v10h14V10' },
    { key: 'desk', name: 'My Desk', path: '/staff/desk', d: 'M3 7h18v12H3zM3 11h18' },
    { key: 'docket', name: 'The Docket', path: '/records', d: 'M6 3h9l4 4v14H6zM15 3v5h4M9 12h7M9 16h7' },
    { key: 'justice', name: 'Ministry of Justice', path: '/justice', d: 'M12 3v18M6 7h12M7 7l-3 6h6zM17 7l-3 6h6z' },
    { key: 'finance', name: 'Ministry of Finance', path: '/finance', d: 'M12 2v20M8 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6' },
    { key: 'war', name: 'Imperial War Office', path: '/war-office', d: 'M5 19 19 5M14 5h5v5M5 10l5 5' },
    { key: 'staffroom', name: 'The Staff Room', path: '/province/staff', d: 'M12 3l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4' }
  ];

  var SVGNS = 'http://www.w3.org/2000/svg';
  var holder = document.getElementById('railbtns');
  var buttons = {};

  HALLS.forEach(function (h) {
    var b = document.createElement('button');
    b.className = 'railbtn';
    b.title = h.name;
    b.setAttribute('aria-label', h.name);

    var mark = document.createElement('span');
    mark.className = 'mark';
    b.appendChild(mark);

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', h.d);
    svg.appendChild(p);
    b.appendChild(svg);

    var pip = document.createElement('span');
    pip.className = 'pip';
    b.appendChild(pip);

    b.addEventListener('click', function () { M.go(h.path); });
    holder.appendChild(b);
    buttons[h.key] = { el: b, pip: pip };
  });

  function id(x) { return document.getElementById(x); }

  id('min').addEventListener('click', function () { M.minimise(); });
  id('max').addEventListener('click', function () { M.maximise(); });
  id('close').addEventListener('click', function () { M.close(); });
  id('back').addEventListener('click', function () { M.back(); });
  id('settings').addEventListener('click', function () { M.settings(); });
  id('letters').addEventListener('click', function () { M.go('/staff/letters'); });
  id('restart').addEventListener('click', function () { M.restart(); });
  id('later').addEventListener('click', function () { id('bump').classList.remove('show'); });

  M.onWhere(function (w) {
    if (!w) return;
    id('hall').textContent = w.line1 || '';
    id('sub').textContent = w.line2 || '';
    Object.keys(buttons).forEach(function (k) {
      buttons[k].el.classList.toggle('on', k === w.rail);
    });
  });

  M.onWho(function (who) {
    var box = id('who');
    if (!who || who.out) { box.style.display = 'none'; return; }
    box.style.display = 'flex';
    id('whoname').textContent = who.name || '';
    id('whorank').textContent = who.rank || '';
    var parts = String(who.name || '').trim().split(/\s+/);
    var ini = (parts[0] || ' ').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '');
    id('initials').textContent = ini.toUpperCase();
  });

  M.onBadge(function (n) {
    var count = Number(n) || 0;
    var pip = id('letterpip');
    pip.textContent = count;
    pip.classList.toggle('show', count > 0);
    var desk = buttons.desk;
    if (desk) {
      desk.pip.textContent = count;
      desk.pip.classList.toggle('show', count > 0);
    }
  });

  M.onArchives(function (a) {
    if (!a) return;
    var chip = id('archives');
    chip.className = 'chip ' + (a.state === 'ok' ? 'ok' : a.state === 'held' ? 'held' : 'down');
    id('archtext').textContent = a.text || '';
  });

  M.onBusy(function (on) { id('load').classList.toggle('on', !!on); });
  M.onMaximised(function (on) { id('max').innerHTML = on ? '&#10066;' : '&#9633;'; });

  M.onUpdate(function (u) {
    id('bumptext').textContent = 'Version ' + ((u && u.version) || '') +
      ' is downloaded. It will be in place the next time you open the Ministry.';
    id('bump').classList.add('show');
  });

  M.prefs().then(function (p) {
    id('site').textContent = 'Connected to ' + String(p.site || '').replace(/^https?:\/\//, '');
    id('status').textContent = (p.presence ? 'Discord presence on' : 'Discord presence off') +
      '   ·   Version ' + p.version;
  });
})();
