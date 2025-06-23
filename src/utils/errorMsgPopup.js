import { popupEmitter } from './eventEmitter';

export const errorMsgPopup = (message) => {
  popupEmitter.emit('showErrorMsgPopup', message);
};