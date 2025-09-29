import React from "react";
import styles from "./MsgPopup.module.css";
import common from "../../utils/common";

const MsgPopup = ({ show, onHide, message }) => {
  if (!show) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div className='overlay' onClick={onHide} style={{zIndex: 1051}}></div>

      {/* 모달 */}
      <div className='modal show d-block' tabIndex="-1" style={{zIndex: 1052}}>
        <div className='modalDialog modal-dialog-centered'>
          <div className='modalContent'>
            <div className='modalHeader modal-header'>
              <h5 className='modalTitle modal-title'>
                {/* <i className="bi bi-bell me-2"></i>  */}
                알림
              </h5>
              <button type="button" className='btnClose btn-close' onClick={onHide}></button>
            </div>
            <div className='modalBody modal-body'>
              <div className='modalBodyMsg' dangerouslySetInnerHTML={{ __html: common.formatMessageWithLineBreaks(message) }}></div>
            </div>
            <div className='modalFooter modal-footer'>
              <button type="button" className='btn btn-secondary btnSecondaryCustom' onClick={onHide}>
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MsgPopup;