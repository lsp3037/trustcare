/**
 * Utilidade leve e autossuficiente para disparar confetes usando HTML5 Canvas.
 * Evita o peso de pacotes externos e garante excelente desempenho na renderização de animações.
 */
export function triggerConfetti() {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };

  window.addEventListener('resize', handleResize);

  // Paleta de cores moderna (Esmeralda, Teal, Dourado, Azul e Rosa)
  const colors = [
    '#10b981', // Emerald 500
    '#059669', // Emerald 600
    '#34d399', // Emerald 400
    '#0d9488', // Teal 600
    '#fbbf24', // Amber 400
    '#3b82f6', // Blue 500
    '#ec4899', // Pink 500
  ];

  const particleCount = 180;
  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * -height - 20,
    size: Math.random() * 8 + 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedX: Math.random() * 4 - 2,
    speedY: Math.random() * 6 + 4,
    rotation: Math.random() * 360,
    rotationSpeed: Math.random() * 6 - 3,
  }));

  let animationFrameId: number;
  const startTime = Date.now();

  function update() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let hasActiveParticles = false;
    const elapsed = Date.now() - startTime;

    particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.y / 30) * 0.5; // Efeito leve de oscilação pelo vento
      p.rotation += p.rotationSpeed;

      if (p.y < height + 20) {
        hasActiveParticles = true;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      // Desenha formas retangulares simulando confetes de papel
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    // Mantém a animação por no máximo 5 segundos ou até todos os confetes sumirem
    if (hasActiveParticles && elapsed < 5000) {
      animationFrameId = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.remove();
    }
  }

  update();
}
