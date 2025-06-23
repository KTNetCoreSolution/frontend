import React, { createContext, useEffect, useState } from 'react';
import MsgPopup from '../MsgPopup';
import { popupEmitter } from '../../../utils/eventEmitter';

const MsgPopupContext = createContext();

export const MsgPopupProvider = ({ children }) => {
  const [popup, setPopup] = useState({ show: false, message: '' });

  useEffect(() => {
    const handleShowPopup = (message) => {
      setPopup({ show: true, message });
    };

    const handleHidePopup = () => {
      setPopup({ show: false, message: '' });
    };

    popupEmitter.on('showMsgPopup', handleShowPopup);
    popupEmitter.on('hideMsgPopup', handleHidePopup);

    return () => {
      // Cleanup: Remove event listeners when component unmounts
      popupEmitter.listeners['showMsgPopup'] = popupEmitter.listeners['showMsgPopup']?.filter(
        (cb) => cb !== handleShowPopup
      );
      popupEmitter.listeners['hideMsgPopup'] = popupEmitter.listeners['hideMsgPopup']?.filter(
        (cb) => cb !== handleHidePopup
      );
    };
  }, []);

  return (
    <MsgPopupContext.Provider value={{}}>
      {children}
      <MsgPopup show={popup.show} onHide={() => popupEmitter.emit('hideMsgPopup')} message={popup.message} />
    </MsgPopupContext.Provider>
  );
};