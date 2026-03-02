import Phaser from 'phaser';

export function createCircuitBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;

  scene.add.rectangle(0, 0, width, height, 0x04080f).setOrigin(0, 0);

  const graphics = scene.add.graphics();
  graphics.lineStyle(2, 0x00c8ff, 0.3);

  const horizontalLines = 8;
  const verticalLines = 12;

  for (let i = 0; i <= horizontalLines; i += 1) {
    const y = (height / horizontalLines) * i;
    graphics.lineBetween(0, y, width, y);
  }

  for (let i = 0; i <= verticalLines; i += 1) {
    const x = (width / verticalLines) * i;
    graphics.lineBetween(x, 0, x, height);
  }

  graphics.lineStyle(3, 0x46ff9b, 0.55);
  for (let i = 0; i < 20; i += 1) {
    const startX = Phaser.Math.Between(0, width);
    const startY = Phaser.Math.Between(0, height);
    const turnX = Phaser.Math.Clamp(startX + Phaser.Math.Between(-150, 150), 0, width);
    const endY = Phaser.Math.Clamp(startY + Phaser.Math.Between(-120, 120), 0, height);
    graphics.beginPath();
    graphics.moveTo(startX, startY);
    graphics.lineTo(turnX, startY);
    graphics.lineTo(turnX, endY);
    graphics.strokePath();
    scene.add.circle(turnX, endY, 3, 0xbaffe0, 0.8);
  }

  scene.tweens.add({
    targets: graphics,
    alpha: { from: 0.65, to: 1 },
    yoyo: true,
    repeat: -1,
    duration: 1300,
    ease: 'Sine.InOut'
  });
}

export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void
): Phaser.GameObjects.Container {
  const buttonWidth = 240;
  const buttonHeight = 54;

  const box = scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x0b1220, 0.92);
  box.setStrokeStyle(2, 0x00e4ff, 0.9);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#dffaff'
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [box, text]);
  container.setSize(buttonWidth, buttonHeight);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    box.setFillStyle(0x13233d, 1);
    box.setStrokeStyle(2, 0x6bf5ff, 1);
  });

  container.on('pointerout', () => {
    box.setFillStyle(0x0b1220, 0.92);
    box.setStrokeStyle(2, 0x00e4ff, 0.9);
  });

  container.on('pointerdown', () => {
    onClick();
  });

  return container;
}