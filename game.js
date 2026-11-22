const canvas = document.querySelector('#board');
const context = canvas.getContext('2d');
const scoreLabel = document.querySelector('#score');
const bestLabel = document.querySelector('#best');
const overlay = document.querySelector('#overlay');
const title = document.querySelector('#title');
const statusLabel = document.querySelector('#status');
const action = document.querySelector('#action');
const pause = document.querySelector('#pause');
const directionButtons = new Map(Array.from(document.querySelectorAll('[data-direction]'),
  button => [button.dataset.direction, button]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const size = 20;
const cell = canvas.width / size;
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const keyDirections = new Map([
  ['ArrowUp', 'up'], ['ArrowDown', 'down'],
  ['ArrowLeft', 'left'], ['ArrowRight', 'right'],
  ['w', 'up'], ['s', 'down'], ['a', 'left'], ['d', 'right'],
]);

let snake;
let direction;
let nextDirection;
let food;
let score;
let best = readBest();
let state = 'ready';
let timer;
let frame;
let activeButton;
let swipe;

function readBest() {
  try {
    const saved = Number(localStorage.getItem('serpiente-record'));
    return Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
  } catch {
    return 0;
  }
}

function updateScores() {
  scoreLabel.textContent = String(score).padStart(2, '0');
  bestLabel.textContent = String(best).padStart(2, '0');
}

function sameCell(first, second) {
  return first.x === second.x && first.y === second.y;
}

function placeFood() {
  const occupied = new Set(snake.map(({ x, y }) => y * size + x));
  const free = [];
  for (let index = 0; index < size * size; index += 1) {
    if (!occupied.has(index)) free.push(index);
  }
  if (free.length === 0) return null;
  const index = free[Math.floor(Math.random() * free.length)];
  return { x: index % size, y: Math.floor(index / size) };
}

function reset() {
  snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
  direction = directions.right;
  nextDirection = null;
  score = 0;
  food = placeFood();
  updateScores();
  cancelAnimationFrame(frame);
  draw();
}

function draw(segments = snake) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (food) {
    const x = (food.x + .5) * cell;
    const y = (food.y + .5) * cell;
    context.fillStyle = '#ffaeab';
    context.beginPath();
    context.arc(x, y, cell * .29, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffe4d8';
    context.beginPath();
    context.arc(x - 3, y - 3, cell * .075, 0, Math.PI * 2);
    context.fill();
  }

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const { x, y } = segments[index];
    context.fillStyle = index === 0 ? '#d0ffb4' : '#74dfaa';
    context.beginPath();
    context.roundRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4, 9);
    context.fill();
  }

  const head = segments[0];
  const eyeX = (head.x + .5) * cell + direction.x * 5;
  const eyeY = (head.y + .5) * cell + direction.y * 5;
  context.fillStyle = '#1b654c';
  for (const side of [-1, 1]) {
    context.beginPath();
    context.arc(eyeX - direction.y * side * 5, eyeY + direction.x * side * 5, 2, 0, Math.PI * 2);
    context.fill();
  }
}

function stepDelay() {
  return Math.max(65, 155 - score * 4);
}

function animateStep(previous) {
  cancelAnimationFrame(frame);
  if (reducedMotion.matches) {
    draw();
    return;
  }

  const start = performance.now();
  const duration = stepDelay() * .8;
  function renderStep(now) {
    const progress = Math.min(1, Math.max(0, (now - start) / duration));
    draw(snake.map(({ x, y }, index) => {
      const from = previous[index] ?? previous.at(-1);
      return { x: from.x + (x - from.x) * progress, y: from.y + (y - from.y) * progress };
    }));
    if (progress < 1) frame = requestAnimationFrame(renderStep);
  }
  frame = requestAnimationFrame(renderStep);
}

function clearDirectionFeedback() {
  activeButton?.removeAttribute('data-active');
  activeButton = null;
}

function setState(nextState, heading, message, label) {
  clearTimeout(timer);
  state = nextState;
  overlay.hidden = state === 'playing';
  pause.disabled = state !== 'playing' && state !== 'paused';
  pause.textContent = state === 'paused' ? 'Continuar' : 'Pausa';

  if (state === 'playing') {
    timer = setTimeout(tick, stepDelay());
  } else {
    clearDirectionFeedback();
    title.textContent = heading;
    statusLabel.textContent = message;
    action.textContent = label;
  }
}

function tick() {
  direction = nextDirection ?? direction;
  nextDirection = null;
  clearDirectionFeedback();
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const eating = sameCell(head, food);
  const body = eating ? snake : snake.slice(0, -1);
  const wall = head.x < 0 || head.x >= size || head.y < 0 || head.y >= size;
  if (wall || body.some(segment => sameCell(head, segment))) {
    setState('finished', 'Fin de partida', `Puntos: ${score}`, 'Volver a jugar');
    return;
  }

  const previous = snake;
  snake = [head, ...previous];
  if (eating) {
    score += 1;
    if (score > best) {
      best = score;
      try {
        localStorage.setItem('serpiente-record', String(best));
      } catch {
        // The current session can still keep the best score.
      }
    }
    updateScores();
    food = placeFood();
  } else {
    snake.pop();
  }

  animateStep(previous);
  if (food) {
    timer = setTimeout(tick, stepDelay());
  } else {
    setState('finished', '¡Tablero completo!', `Puntos: ${score}`, 'Volver a jugar');
  }
}

function turn(name) {
  if (state !== 'playing' || nextDirection) return;
  const candidate = directions[name];
  if (candidate === direction) return;
  if (candidate.x + direction.x === 0 && candidate.y + direction.y === 0) return;
  nextDirection = candidate;
  activeButton = directionButtons.get(name);
  activeButton.setAttribute('data-active', '');
}

function activate() {
  if (state === 'playing') {
    setState('paused', 'En pausa', 'Continúa cuando quieras.', 'Continuar');
    return;
  }
  if (state !== 'paused') reset();
  setState('playing');
}

action.addEventListener('click', activate);
pause.addEventListener('click', activate);
for (const [name, button] of directionButtons) {
  button.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.button === 0) turn(name);
  });
  button.addEventListener('click', event => {
    if (event.detail === 0) turn(name);
  });
}

canvas.addEventListener('pointerdown', event => {
  if (state !== 'playing' || !event.isPrimary || event.pointerType === 'mouse') return;
  swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', event => {
  if (state !== 'playing' || swipe?.id !== event.pointerId) return;
  const x = event.clientX - swipe.x;
  const y = event.clientY - swipe.y;
  if (Math.max(Math.abs(x), Math.abs(y)) < 12) return;

  if (Math.abs(x) > Math.abs(y)) {
    turn(x > 0 ? 'right' : 'left');
  } else {
    turn(y > 0 ? 'down' : 'up');
  }

  swipe.x = event.clientX;
  swipe.y = event.clientY;
});

canvas.addEventListener('lostpointercapture', event => {
  if (swipe?.id === event.pointerId) swipe = null;
});

reducedMotion.addEventListener('change', () => {
  cancelAnimationFrame(frame);
  draw();
});

document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  const movement = keyDirections.get(event.key) ?? keyDirections.get(key);
  if (movement && state === 'playing') {
    event.preventDefault();
    turn(movement);
  }
  if (key === ' ' && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
    if (!event.repeat) activate();
  }
});

reset();
