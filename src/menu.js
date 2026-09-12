// Pantallas de elegir jugador y de presentación de las parejas ("VS").
const $ = id => document.getElementById(id);
const hex = n => `#${n.toString(16).padStart(6, '0')}`;

export class Menu {
  // onChoose(id) se llama al tocar una tarjeta
  constructor(roster, portraits, onChoose) {
    for (const p of roster) {
      const card = document.createElement('button');
      card.className = 'player';
      card.style.setProperty('--accent', hex(p.accent));
      card.innerHTML = `<img alt="" src="${portraits[p.id]}"><b>${p.name}</b>`;
      card.addEventListener('click', () => onChoose(p.id));
      $('roster').append(card);
    }
  }

  // lineup: [vos, compañero, rival, rival]
  vs(lineup, portraits) {
    const card = (p, me) =>
      `<figure class="mini${me ? ' me' : ''}" style="--accent:${hex(p.accent)}">` +
      `<img alt="" src="${portraits[p.id]}"><figcaption>${me ? 'Vos · ' : ''}${p.name}</figcaption></figure>`;
    $('pair0').innerHTML = card(lineup[0], true) + card(lineup[1]);
    $('pair1').innerHTML = card(lineup[2]) + card(lineup[3]);
  }
}
