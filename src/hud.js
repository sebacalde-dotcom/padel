// Marcador, mensajes y pantallas de inicio, pausa y fin del partido.
const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;

export class Hud {
  constructor() {
    this.pts = [$('pts0'), $('pts1')];
    this.games = [$('games0'), $('games1')];
    this.serve = [$('serve0'), $('serve1')];
    this.screens = { select: $('selectScreen'), vs: $('vsScreen'), pause: $('pauseScreen'), end: $('endScreen') };
    this.msgTimer = null;
    document.body.classList.toggle('touch', touch);
  }

  // Nombres de las parejas en el marcador
  names(lineup) {
    const pair = (a, b) => `${a.name} · ${b.name}`.toUpperCase();
    $('team0').textContent = pair(lineup[0], lineup[1]);
    $('team1').textContent = pair(lineup[2], lineup[3]);
  }

  score(s, serveTeam) {
    for (const t of [0, 1]) {
      this.pts[t].textContent = s.label(t);
      this.games[t].textContent = s.games[t];
      this.serve[t].classList.toggle('off', serveTeam !== t);
    }
    const golden = s.golden();
    $('chip').textContent = golden ? 'PUNTO DE ORO' : 'SET 1';
    $('chip').classList.toggle('gold', golden);
  }

  message(title, sub = '', ms = 1700) {
    $('msgTitle').textContent = title;
    $('msgSub').textContent = sub;
    $('msg').classList.add('show');
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => $('msg').classList.remove('show'), ms);
  }

  hint(text) {
    $('hint').textContent = text;
    $('hint').hidden = !text;
  }

  tag(x, y, show) {
    $('tag').hidden = !show;
    $('tag').style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  orientation(portrait) { $('rotate').hidden = !(portrait && touch); }

  show(name) {
    for (const [key, el] of Object.entries(this.screens)) el.hidden = key !== name;
  }

  end(score) {
    $('endTitle').textContent = score.winner === 0 ? '¡Ganaron!' : 'Perdieron';
    $('endScore').textContent = `${score.games[0]} - ${score.games[1]}`;
    this.show('end');
  }

  on(id, fn) { $(id).addEventListener('click', fn); }
}
