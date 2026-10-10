const TARGET_URL = '/login';
const stage = document.getElementById('stage');
const aurora = document.getElementById('aurora');
const taskInput = document.getElementById('taskInput');
const goButton = document.getElementById('goButton');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
let animationId = null;

function animateBackground() {
  currentX += (targetX - currentX) * 0.075;
  currentY += (targetY - currentY) * 0.075;
  aurora.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
  animationId = requestAnimationFrame(animateBackground);
}

function updatePointer(event) {
  if (event.target.closest('.composer')) {
    targetX = 0;
    targetY = 0;
    return;
  }
  const rect = stage.getBoundingClientRect();
  const normalizedX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const normalizedY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  targetX = normalizedX * 125;
  targetY = normalizedY * 95;
}

function configureMotion() {
  if (reducedMotion.matches) {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    aurora.style.transform = 'translate3d(0,0,0)';
    return;
  }
  if (animationId === null) animationId = requestAnimationFrame(animateBackground);
}

stage.addEventListener('pointermove', updatePointer, { passive: true });
stage.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
reducedMotion.addEventListener('change', configureMotion);
configureMotion();

function continueToApp() {
  window.location.assign(TARGET_URL);
}
goButton.addEventListener('click', continueToApp);
taskInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    continueToApp();
  }
});
