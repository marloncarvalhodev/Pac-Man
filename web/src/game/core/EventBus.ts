import Phaser from 'phaser';

/**
 * Barramento central de eventos para comunicação desacoplada entre Phaser e React.
 */
export const EventBus = new Phaser.Events.EventEmitter();
