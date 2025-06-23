import { popupEmitter } from './eventEmitter';

export const msgPopup = (message) => {
  popupEmitter.emit('showMsgPopup', message);
};