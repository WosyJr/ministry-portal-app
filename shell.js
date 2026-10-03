(function () {
  var M = window.ministry;
  if (!M) return;

  var HALLS = [
    { key: 'ministries', name: 'All Ministries', path: '/', d: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
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

  var tip = id('tip');
  var tipTimer = null;

  function showTip(el, text) {
    if (!text) return;
    var r = el.getBoundingClientRect();
    tip.textContent = text;
    tip.style.top = Math.round(r.top + r.height / 2) + 'px';
    tip.classList.add('show');
  }

  function hideTip() {
    clearTimeout(tipTimer);
    tip.classList.remove('show');
  }

  function tipFor(el, text) {
    el.addEventListener('mouseenter', function () {
      clearTimeout(tipTimer);
      tipTimer = setTimeout(function () { showTip(el, text); }, 110);
    });
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('click', hideTip);
  }

  HALLS.forEach(function (h) { tipFor(buttons[h.key].el, h.name); });
  tipFor(id('settings'), 'Settings');

  id('min').addEventListener('click', function () { M.minimise(); });
  id('max').addEventListener('click', function () { M.maximise(); });
  id('close').addEventListener('click', function () { M.close(); });
  id('back').addEventListener('click', function () { M.back(); });
  id('settings').addEventListener('click', function () { M.settings(); });
  var deskOpen = false;

  function setDesk(on) {
    deskOpen = !!on;
    id('desk').classList.toggle('show', deskOpen);
    id('letters').setAttribute('aria-expanded', deskOpen ? 'true' : 'false');
    if (deskOpen) M.deskRefresh();
  }

  function drawDesk(d) {
    var body = id('deskbody');
    body.textContent = '';
    var groups = (d && d.groups) || [];

    if (!groups.length) {
      var e = document.createElement('p');
      e.className = 'dempty';
      e.textContent = d && d.none
        ? 'The desk does not open from here. Sign in at the Hall to see what wants your hand.'
        : 'Nothing wants your hand. The desk is clear.';
      body.appendChild(e);
      id('deskclear').style.display = 'none';
      return;
    }

    id('deskclear').style.display = '';

    groups.forEach(function (g) {
      var box = document.createElement('div');
      box.className = 'dgroup';

      if (g.head) {
        var h = document.createElement('div');
        h.className = 'dgh';
        h.textContent = g.head;
        box.appendChild(h);
      }

      g.items.forEach(function (i) {
        var row = document.createElement('div');
        row.className = 'drow';

        var a = document.createElement('button');
        a.type = 'button';
        a.className = 'ditem' + (i.urgent ? ' urgent' : '');

        var t = document.createElement('span');
        t.className = 'dt';
        t.textContent = i.title;
        a.appendChild(t);

        if (i.note) {
          var n = document.createElement('span');
          n.className = 'dn';
          n.textContent = i.note;
          a.appendChild(n);
        }

        a.addEventListener('click', function () {
          setDesk(false);
          if (i.link) M.go(i.link);
        });
        row.appendChild(a);

        if (i.id) {
          var tick = document.createElement('button');
          tick.type = 'button';
          tick.className = 'dtick';
          tick.title = 'I have seen this';
          tick.setAttribute('aria-label', 'I have seen this');
          tick.textContent = '✓';
          tick.addEventListener('click', function () {
            row.remove();
            M.deskSeen(i.id);
          });
          row.appendChild(tick);
        }

        box.appendChild(row);
      });

      body.appendChild(box);
    });
  }

  id('letters').addEventListener('click', function (ev) {
    ev.stopPropagation();
    setDesk(!deskOpen);
  });
  id('desk').addEventListener('click', function (ev) { ev.stopPropagation(); });
  id('deskall').addEventListener('click', function () { setDesk(false); M.go('/staff/desk'); });
  id('deskclear').addEventListener('click', function () { setDesk(false); M.deskClear(); });
  document.addEventListener('click', function () { if (deskOpen) setDesk(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && deskOpen) setDesk(false); });

  M.onDesk(drawDesk);
  id('restart').addEventListener('click', function () { M.restart(); });
  id('later').addEventListener('click', function () { id('bump').classList.remove('show'); });

  M.onWhere(function (w) {
    if (!w) return;
    if (deskOpen) setDesk(false);
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
