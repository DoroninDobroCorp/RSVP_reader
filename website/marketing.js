(() => {
  const root = document.querySelector('[data-rsvp-demo]');
  if (!root) return;
  const output = root.querySelector('[data-word]');
  const toggle = root.querySelector('[data-play]');
  const reset = root.querySelector('[data-reset]');
  const speed = root.querySelector('input');
  const paceOutput = root.querySelector('[data-pace]');
  const words = root.dataset.text.split(/\s+/u).filter(Boolean);
  let index = 0, timer = null, playing = false;
  function render() {
    const word = words[index] || words[0];
    const chars = Array.from(word);
    const focus = Math.min(chars.length - 1, Math.floor(chars.length * .35));
    output.replaceChildren(document.createTextNode(chars.slice(0, focus).join('')));
    const b = document.createElement('b'); b.textContent = chars[focus]; output.append(b, document.createTextNode(chars.slice(focus + 1).join('')));
  }
  function stop() { playing = false; clearTimeout(timer); toggle.textContent = toggle.dataset.play; toggle.setAttribute('aria-pressed','false'); }
  function tick() {
    if (!playing) return;
    render();
    if (index >= words.length - 1) { index = 0; stop(); return; }
    index++;
    timer = setTimeout(tick, 60000 / Number(speed.value));
  }
  toggle.addEventListener('click', () => { if (playing) stop(); else { playing = true; toggle.textContent = toggle.dataset.pause; toggle.setAttribute('aria-pressed','true'); tick(); } });
  reset.addEventListener('click', () => { stop(); index = 0; render(); });
  speed.addEventListener('input', () => { paceOutput.textContent = speed.value; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
