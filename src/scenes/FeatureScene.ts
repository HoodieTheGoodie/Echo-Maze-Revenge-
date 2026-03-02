import Phaser from 'phaser';
import { createCircuitBackground, createMenuButton } from '../utils/ui';

type FeatureData = {
  featureName?: string;
};

export class FeatureScene extends Phaser.Scene {
  private featureName = 'Feature';

  constructor() {
    super('FeatureScene');
  }

  init(data: FeatureData): void {
    this.featureName = data.featureName ?? 'Feature';
  }

  create(): void {
    const { width, height } = this.scale;
    createCircuitBackground(this);

    this.add
      .text(width / 2, 120, this.featureName, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '48px',
        color: '#66f3ff'
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 220, 'Placeholder screen for now', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#dbffff'
      })
      .setOrigin(0.5);

    createMenuButton(this, width / 2, height - 90, 'Back to Main Menu', () => {
      this.scene.start('MenuScene');
    });
  }
}