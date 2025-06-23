import React, { createContext, useEffect, useState } from 'react';
import ErrorMsgPopup from '../ErrorMsgPopup';
import { popupEmitter } from '../../../utils/eventEmitter';

const ErrorMsgPopupContext = createContext();

export const ErrorMsgPopupProvider = ({ children }) => {
  const [popup, setPopup] = useState({ show: false, message: '' });

  useEffect(() => {
    const handleShowPopup = (message) => {
      setPopup({ show: true, message });
    };

    const handleHidePopup = () => {
      setPopup({ show: false, message: '' });
    };

    popupEmitter.on('showErrorMsgPopup', handleShowPopup);
    popupEmitter.on('hideErrorMsgPopup', handleHidePopup);

    return () => {
      // Cleanup: Remove event listeners when component unmounts
      popupEmitter.listeners['showErrorMsgPopup'] = popupEmitter.listeners['showErrorMsgPopup']?.filter(
        (cb) => cb !== handleShowPopup
      );
      popupEmitter.listeners['hideErrorMsgPopup'] = popupEmitter.listeners['hideErrorMsgPopup']?.filter(
        (cb) => cb !== handleHidePopup
      );
    };
  }, []);

  return (
    <ErrorMsgPopupContext.Provider value={{}}>
      {children}
      <ErrorMsgPopup show={popup.show} onHide={() => popupEmitter.emit('hideErrorMsgPopup')} message={popup.message} />
    </ErrorMsgPopupContext.Provider>
  );
};