import Phaser from 'phaser';
import { FeatureScene } from './scenes/FeatureScene';
import { LevelScene } from './scenes/LevelScene';
import { MenuScene } from './scenes/MenuScene';
const config = {
    type: Phaser.AUTO,
    parent: 'app',
    width: 960,
    height: 540,
    backgroundColor: '#04080f',
    scene: [MenuScene, FeatureScene, LevelScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
new Phaser.Game(config);
