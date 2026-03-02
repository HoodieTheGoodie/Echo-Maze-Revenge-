import Phaser from 'phaser';
import { createCircuitBackground, createMenuButton } from '../utils/ui';
export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }
    create() {
        const { width, height } = this.scale;
        createCircuitBackground(this);
        this.add
            .text(width / 2, 90, 'ECHO MAZE: REVENGE', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '52px',
            color: '#66f3ff'
        })
            .setOrigin(0.5)
            .setShadow(0, 0, '#2fe8ff', 12, true, true);
        this.add
            .text(width / 2, 135, 'Inside the Core Grid', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ccfaff'
        })
            .setOrigin(0.5);
        const centerX = width / 2;
        const firstY = 230;
        const gap = 72;
        createMenuButton(this, centerX, firstY, 'Play', () => {
            this.scene.start('LevelScene');
        });
        createMenuButton(this, centerX, firstY + gap, 'Settings', () => {
            this.scene.start('FeatureScene', { featureName: 'Settings' });
        });
        createMenuButton(this, centerX, firstY + gap * 2, 'Equipment', () => {
            this.scene.start('FeatureScene', { featureName: 'Equipment' });
        });
        createMenuButton(this, centerX, firstY + gap * 3, 'Skill Spin', () => {
            this.scene.start('FeatureScene', { featureName: 'Skill Spin' });
        });
    }
}
