import { NextResponse } from "next/server"

export const runtime = "nodejs"

function buildSrcDoc() {
  const css = `
    html, body {
      height: 100%;
      margin: 0;
    }
    body {
      background: radial-gradient(1200px 600px at 20% 10%, rgba(88,86,214,0.22), transparent 55%),
                  radial-gradient(1000px 520px at 85% 15%, rgba(167,107,207,0.18), transparent 60%),
                  radial-gradient(1000px 520px at 50% 85%, rgba(34,197,94,0.12), transparent 60%),
                  #070a12;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      color: rgba(255,255,255,0.92);
    }
    .wrap {
      display: grid;
      place-items: center;
      gap: 12px;
      padding: 18px;
      width: min(520px, 100%);
    }
    .hud {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 13px;
      opacity: 0.9;
    }
    canvas {
      width: min(400px, 92vw);
      height: min(400px, 92vw);
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 14px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.35);
      image-rendering: pixelated;
    }
    kbd {
      padding: 2px 6px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.06);
      font-size: 12px;
    }
  `.trim()

  const js = `
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d');

    const grid = 16;
    let count = 0;
    const scoreNode = document.getElementById('score');

    const snake = {
      x: 160,
      y: 160,
      dx: grid,
      dy: 0,
      cells: [],
      maxCells: 4
    };

    const apple = {
      x: 320,
      y: 320
    };

    let score = 0;

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function reset() {
      snake.x = 160;
      snake.y = 160;
      snake.dx = grid;
      snake.dy = 0;
      snake.cells = [];
      snake.maxCells = 4;
      apple.x = getRandomInt(0, 25) * grid;
      apple.y = getRandomInt(0, 25) * grid;
      score = 0;
      scoreNode.textContent = String(score);
    }

    function loop() {
      requestAnimationFrame(loop);

      if (++count < 4) return;
      count = 0;

      context.clearRect(0, 0, canvas.width, canvas.height);

      snake.x += snake.dx;
      snake.y += snake.dy;

      if (snake.x < 0) snake.x = canvas.width - grid;
      else if (snake.x >= canvas.width) snake.x = 0;

      if (snake.y < 0) snake.y = canvas.height - grid;
      else if (snake.y >= canvas.height) snake.y = 0;

      snake.cells.unshift({ x: snake.x, y: snake.y });
      if (snake.cells.length > snake.maxCells) snake.cells.pop();

      context.fillStyle = 'rgba(34,197,94,0.95)';
      context.fillRect(apple.x, apple.y, grid - 1, grid - 1);

      context.fillStyle = 'rgba(255,255,255,0.92)';
      snake.cells.forEach((cell, index) => {
        context.fillRect(cell.x, cell.y, grid - 1, grid - 1);

        if (cell.x === apple.x && cell.y === apple.y) {
          snake.maxCells++;
          score += 1;
          scoreNode.textContent = String(score);

          apple.x = getRandomInt(0, 25) * grid;
          apple.y = getRandomInt(0, 25) * grid;
        }

        for (let i = index + 1; i < snake.cells.length; i++) {
          if (cell.x === snake.cells[i].x && cell.y === snake.cells[i].y) {
            reset();
          }
        }
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.which === 37 && snake.dx === 0) { snake.dx = -grid; snake.dy = 0; }
      else if (e.which === 38 && snake.dy === 0) { snake.dy = -grid; snake.dx = 0; }
      else if (e.which === 39 && snake.dx === 0) { snake.dx = grid; snake.dy = 0; }
      else if (e.which === 40 && snake.dy === 0) { snake.dy = grid; snake.dx = 0; }
      else if (e.which === 82) { reset(); }
    });

    reset();
    requestAnimationFrame(loop);
  `.trim()

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Snake</title>
      <style>${css}</style>
    </head>
    <body>
      <div class="wrap">
        <div class="hud">
          <div>Score: <span id="score">0</span></div>
          <div><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> move • <kbd>R</kbd> reset</div>
        </div>
        <canvas width="400" height="400" id="game"></canvas>
      </div>
      <script>${js}</script>
    </body>
  </html>`
}

export async function GET() {
  try {
    const srcDoc = buildSrcDoc()
    return new NextResponse(srcDoc, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to load game" }, { status: 500 })
  }
}
