const canvas = document.querySelector('#board');
const context = canvas.getContext('2d');
const scoreLabel = document.querySelector('#score');
const bestLabel = document.querySelector('#best');
const overlay = document.querySelector('#overlay');
const title = document.querySelector('#title');
const status = document.querySelector('#status');
const action = document.querySelector('#action');
const pause = document.querySelector('#pause');

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
  draw();
}

function draw() {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? '#293622' : '#2c3a24';
      context.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  if (food) {
    context.fillStyle = '#ff936e';
    context.beginPath();
    context.arc((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * 0.3, 0, Math.PI * 2);
    context.fill();
  }

  snake.forEach(({ x, y }, index) => {
    context.fillStyle = index === 0 ? '#d5ff85' : '#94cc54';
    context.beginPath();
    context.roundRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2, 5);
    context.fill();
  });
}

function setState(nextState, heading, message, label) {
  clearTimeout(timer);
  state = nextState;
  overlay.hidden = state === 'playing';
  pause.disabled = state !== 'playing' && state !== 'paused';
  pause.textContent = state === 'paused' ? 'Continuar' : 'Pausa';

  if (state === 'playing') {
    timer = setTimeout(tick, Math.max(65, 155 - score * 4));
  } else {
    title.textContent = heading;
    status.textContent = message;
    action.textContent = label;
  }
}

function tick() {
  direction = nextDirection ?? direction;
  nextDirection = null;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const eating = sameCell(head, food);
  const body = eating ? snake : snake.slice(0, -1);
  const wall = head.x < 0 || head.x >= size || head.y < 0 || head.y >= size;
  if (wall || body.some(segment => sameCell(head, segment))) {
    setState('finished', 'Fin de partida', `Puntos: ${score}`, 'Volver a jugar');
    return;
  }

  snake.unshift(head);
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

  draw();
  if (food) {
    timer = setTimeout(tick, Math.max(65, 155 - score * 4));
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
document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('click', () => turn(button.dataset.direction));
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
