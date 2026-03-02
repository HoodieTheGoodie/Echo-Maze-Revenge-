import Phaser from 'phaser';
import { createCircuitBackground, createMenuButton } from '../utils/ui';

type GridCell = {
  x: number;
  y: number;
};

export class LevelScene extends Phaser.Scene {
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
  };

  private player!: Phaser.GameObjects.Arc;
  private readonly playerRadius = 10;
  private readonly moveSpeed = 250;
  private readonly dashSpeed = 620;
  private readonly dashDurationMs = 140;
  private readonly dashCooldownMs = 650;
  private velocity = new Phaser.Math.Vector2();
  private lastMoveDir = new Phaser.Math.Vector2(1, 0);
  private dashDirection = new Phaser.Math.Vector2(1, 0);
  private dashTimeLeftMs = 0;
  private dashCooldownLeftMs = 0;

  private arenaBounds!: Phaser.Geom.Rectangle;
  private readonly gridCellSize = 36;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private gridCols = 0;
  private gridRows = 0;
  private blockedGrid: boolean[][] = [];
  private freeCells: GridCell[] = [];
  private wallRects: Phaser.GameObjects.Rectangle[] = [];

  private isPaused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super('LevelScene');
  }

  create(): void {
    const { width } = this.scale;
    createCircuitBackground(this);

    this.add
      .text(18, 16, 'Level 1 - Core Node', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#d7f8ff'
      })
      .setOrigin(0, 0);

    this.add
      .text(18, 44, 'WASD move • Shift dash', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#a2d5ff'
      })
      .setOrigin(0, 0);

    this.spawnRoomFrame();
    const playerSpawn = this.generateConnectedWallsAndGetPlayerSpawn();
    this.spawnPlaceholderEnemies(playerSpawn);

    this.player = this.add.circle(playerSpawn.x, playerSpawn.y, this.playerRadius, 0x33a1ff, 1);
    this.player.setStrokeStyle(3, 0xa8ddff, 1);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in this environment.');
    }

    this.keys = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      shift: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    };

    createMenuButton(this, width - 95, 38, 'Pause', () => {
      this.showPauseOverlay();
    }).setScale(0.72);
  }

  update(_: number, delta: number): void {
    if (this.isPaused) {
      return;
    }

    const dt = delta / 1000;
    let inputX = 0;
    let inputY = 0;

    if (this.keys.a.isDown) {
      inputX -= 1;
    }
    if (this.keys.d.isDown) {
      inputX += 1;
    }
    if (this.keys.w.isDown) {
      inputY -= 1;
    }
    if (this.keys.s.isDown) {
      inputY += 1;
    }

    const inputLength = Math.hypot(inputX, inputY);
    if (inputLength > 0) {
      inputX /= inputLength;
      inputY /= inputLength;
      this.lastMoveDir.set(inputX, inputY);
    }

    this.dashCooldownLeftMs = Math.max(0, this.dashCooldownLeftMs - delta);

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.shift) &&
      this.dashTimeLeftMs <= 0 &&
      this.dashCooldownLeftMs <= 0
    ) {
      if (inputLength > 0) {
        this.dashDirection.set(inputX, inputY);
      } else {
        this.dashDirection.copy(this.lastMoveDir);
      }

      this.dashTimeLeftMs = this.dashDurationMs;
      this.dashCooldownLeftMs = this.dashCooldownMs;
      this.velocity.set(this.dashDirection.x * this.dashSpeed, this.dashDirection.y * this.dashSpeed);
    }

    if (this.dashTimeLeftMs > 0) {
      this.dashTimeLeftMs = Math.max(0, this.dashTimeLeftMs - delta);
      this.velocity.set(this.dashDirection.x * this.dashSpeed, this.dashDirection.y * this.dashSpeed);
      if (this.dashTimeLeftMs === 0) {
        this.velocity.scale(0.45);
      }
    } else {
      const responsiveness = inputLength > 0 ? 12 : 16;
      const blend = 1 - Math.exp(-responsiveness * dt);
      const targetX = inputX * this.moveSpeed;
      const targetY = inputY * this.moveSpeed;
      this.velocity.x = Phaser.Math.Linear(this.velocity.x, targetX, blend);
      this.velocity.y = Phaser.Math.Linear(this.velocity.y, targetY, blend);
    }

    this.movePlayerAndResolveCollisions(this.velocity.x * dt, this.velocity.y * dt);

    this.player.x = Phaser.Math.Clamp(
      this.player.x,
      this.arenaBounds.left + this.playerRadius,
      this.arenaBounds.right - this.playerRadius
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      this.arenaBounds.top + this.playerRadius,
      this.arenaBounds.bottom - this.playerRadius
    );
  }

  private spawnRoomFrame(): void {
    const { width, height } = this.scale;
    const roomBounds = new Phaser.Geom.Rectangle(45, 70, width - 90, height - 120);
    this.arenaBounds = roomBounds;

    const room = this.add.rectangle(
      roomBounds.centerX,
      roomBounds.centerY,
      roomBounds.width,
      roomBounds.height,
      0x0b1322,
      0.3
    );
    room.setStrokeStyle(3, 0x00e1ff, 0.65);
  }

  private generateConnectedWallsAndGetPlayerSpawn(): Phaser.Math.Vector2 {
    const usableWidth = this.arenaBounds.width;
    const usableHeight = this.arenaBounds.height;

    this.gridCols = Math.floor(usableWidth / this.gridCellSize);
    this.gridRows = Math.floor(usableHeight / this.gridCellSize);

    const gridPixelWidth = this.gridCols * this.gridCellSize;
    const gridPixelHeight = this.gridRows * this.gridCellSize;

    this.gridOriginX = this.arenaBounds.x + (usableWidth - gridPixelWidth) / 2;
    this.gridOriginY = this.arenaBounds.y + (usableHeight - gridPixelHeight) / 2;

    this.arenaBounds = new Phaser.Geom.Rectangle(
      this.gridOriginX,
      this.gridOriginY,
      gridPixelWidth,
      gridPixelHeight
    );

    this.blockedGrid = Array.from({ length: this.gridRows }, () => Array.from({ length: this.gridCols }, () => false));

    const centerCell = {
      x: Math.floor(this.gridCols / 2),
      y: Math.floor(this.gridRows / 2)
    };

    const targetBlockedCells = Math.floor(this.gridCols * this.gridRows * 0.2);
    let blockedPlaced = 0;
    let attempts = 0;

    while (blockedPlaced < targetBlockedCells && attempts < 700) {
      attempts += 1;

      const horizontal = Phaser.Math.Between(0, 1) === 1;
      const length = Phaser.Math.Between(2, 5);
      const startX = Phaser.Math.Between(0, this.gridCols - 1);
      const startY = Phaser.Math.Between(0, this.gridRows - 1);

      const segmentCells: GridCell[] = [];
      let valid = true;

      for (let i = 0; i < length; i += 1) {
        const cellX = horizontal ? startX + i : startX;
        const cellY = horizontal ? startY : startY + i;

        if (cellX < 0 || cellY < 0 || cellX >= this.gridCols || cellY >= this.gridRows) {
          valid = false;
          break;
        }

        const distanceToCenter = Math.abs(cellX - centerCell.x) + Math.abs(cellY - centerCell.y);
        if (distanceToCenter <= 2 || this.blockedGrid[cellY][cellX]) {
          valid = false;
          break;
        }

        segmentCells.push({ x: cellX, y: cellY });
      }

      if (!valid || segmentCells.length === 0) {
        continue;
      }

      for (const cell of segmentCells) {
        this.blockedGrid[cell.y][cell.x] = true;
      }

      if (!this.isFreeSpaceConnected(this.blockedGrid)) {
        for (const cell of segmentCells) {
          this.blockedGrid[cell.y][cell.x] = false;
        }
        continue;
      }

      blockedPlaced += segmentCells.length;
    }

    this.wallRects.forEach((wall) => wall.destroy());
    this.wallRects = [];
    this.freeCells = [];

    for (let row = 0; row < this.gridRows; row += 1) {
      for (let col = 0; col < this.gridCols; col += 1) {
        if (this.blockedGrid[row][col]) {
          const worldX = this.gridOriginX + col * this.gridCellSize + this.gridCellSize / 2;
          const worldY = this.gridOriginY + row * this.gridCellSize + this.gridCellSize / 2;
          const wall = this.add.rectangle(worldX, worldY, this.gridCellSize, this.gridCellSize, 0x141f36, 0.95);
          wall.setStrokeStyle(2, 0x35f3ff, 0.7);
          this.wallRects.push(wall);
        } else {
          this.freeCells.push({ x: col, y: row });
        }
      }
    }

    const spawnCell = this.findClosestFreeCellToCenter(centerCell);
    return this.gridCellToWorld(spawnCell);
  }

  private findClosestFreeCellToCenter(centerCell: GridCell): GridCell {
    let bestCell = this.freeCells[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const cell of this.freeCells) {
      const distance = Math.abs(cell.x - centerCell.x) + Math.abs(cell.y - centerCell.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCell = cell;
      }
    }

    return bestCell;
  }

  private isFreeSpaceConnected(blocked: boolean[][]): boolean {
    let startCell: GridCell | null = null;
    let freeCount = 0;

    for (let row = 0; row < this.gridRows; row += 1) {
      for (let col = 0; col < this.gridCols; col += 1) {
        if (!blocked[row][col]) {
          freeCount += 1;
          if (!startCell) {
            startCell = { x: col, y: row };
          }
        }
      }
    }

    if (!startCell || freeCount === 0) {
      return false;
    }

    const visited = Array.from({ length: this.gridRows }, () => Array.from({ length: this.gridCols }, () => false));
    const queue: GridCell[] = [startCell];
    visited[startCell.y][startCell.x] = true;
    let reached = 0;

    const directions: GridCell[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      reached += 1;

      for (const direction of directions) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;

        const inBounds = nextX >= 0 && nextY >= 0 && nextX < this.gridCols && nextY < this.gridRows;
        if (!inBounds || visited[nextY][nextX] || blocked[nextY][nextX]) {
          continue;
        }

        visited[nextY][nextX] = true;
        queue.push({ x: nextX, y: nextY });
      }
    }

    return reached === freeCount;
  }

  private spawnPlaceholderEnemies(playerSpawn: Phaser.Math.Vector2): void {
    const spawnPool = this.freeCells.filter((cell) => {
      const worldPoint = this.gridCellToWorld(cell);
      return Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, playerSpawn.x, playerSpawn.y) >= 170;
    });

    const shuffledPool = Phaser.Utils.Array.Shuffle(spawnPool);
    const enemyCount = Math.min(6, shuffledPool.length);

    for (let i = 0; i < enemyCount; i += 1) {
      const worldPoint = this.gridCellToWorld(shuffledPool[i]);
      const enemy = this.add.rectangle(worldPoint.x, worldPoint.y, 22, 22, 0xff4d5a, 0.9);
      enemy.setStrokeStyle(2, 0xffb1b7, 0.95);
    }
  }

  private gridCellToWorld(cell: GridCell): Phaser.Math.Vector2 {
    const worldX = this.gridOriginX + cell.x * this.gridCellSize + this.gridCellSize / 2;
    const worldY = this.gridOriginY + cell.y * this.gridCellSize + this.gridCellSize / 2;
    return new Phaser.Math.Vector2(worldX, worldY);
  }

  private movePlayerAndResolveCollisions(deltaX: number, deltaY: number): void {
    this.player.x += deltaX;
    this.resolveWallCollisions();

    this.player.y += deltaY;
    this.resolveWallCollisions();
  }

  private resolveWallCollisions(): void {
    for (let iteration = 0; iteration < 2; iteration += 1) {
      for (const wall of this.wallRects) {
        const left = wall.x - wall.width / 2;
        const right = wall.x + wall.width / 2;
        const top = wall.y - wall.height / 2;
        const bottom = wall.y + wall.height / 2;

        const nearestX = Phaser.Math.Clamp(this.player.x, left, right);
        const nearestY = Phaser.Math.Clamp(this.player.y, top, bottom);
        const diffX = this.player.x - nearestX;
        const diffY = this.player.y - nearestY;
        const distanceSq = diffX * diffX + diffY * diffY;

        if (distanceSq >= this.playerRadius * this.playerRadius) {
          continue;
        }

        if (distanceSq > 0) {
          const distance = Math.sqrt(distanceSq);
          const pushDistance = this.playerRadius - distance;
          this.player.x += (diffX / distance) * pushDistance;
          this.player.y += (diffY / distance) * pushDistance;
          continue;
        }

        const toLeft = Math.abs(this.player.x - left);
        const toRight = Math.abs(right - this.player.x);
        const toTop = Math.abs(this.player.y - top);
        const toBottom = Math.abs(bottom - this.player.y);
        const minDistance = Math.min(toLeft, toRight, toTop, toBottom);

        if (minDistance === toLeft) {
          this.player.x = left - this.playerRadius;
        } else if (minDistance === toRight) {
          this.player.x = right + this.playerRadius;
        } else if (minDistance === toTop) {
          this.player.y = top - this.playerRadius;
        } else {
          this.player.y = bottom + this.playerRadius;
        }
      }
    }
  }

  private showPauseOverlay(): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.setVisible(true);
      this.isPaused = true;
      return;
    }

    const { width, height } = this.scale;
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    const panel = this.add.rectangle(width / 2, height / 2, 350, 220, 0x08101f, 0.96);
    panel.setStrokeStyle(2, 0x52e4ff, 0.95);

    const title = this.add
      .text(width / 2, height / 2 - 72, 'PAUSED', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '34px',
        color: '#c5f8ff'
      })
      .setOrigin(0.5);

    const resumeButton = createMenuButton(this, width / 2, height / 2 - 5, 'Resume', () => {
      this.isPaused = false;
      this.pauseOverlay?.setVisible(false);
    }).setScale(0.78);

    const exitButton = createMenuButton(this, width / 2, height / 2 + 72, 'Exit to Main Menu', () => {
      this.scene.start('MenuScene');
    }).setScale(0.78);

    this.pauseOverlay = this.add.container(0, 0, [dim, panel, title, resumeButton, exitButton]);
    this.isPaused = true;
  }
}
