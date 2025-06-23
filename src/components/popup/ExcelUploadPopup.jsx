import React, { useState, useEffect, useRef } from "react";
import { fetchFileUpload, fetchData } from '../../utils/dataUtils';
import fileUtils from '../../utils/fileUtils';
import styles from "./ExcelUploadPopup.module.css";

const ExcelUploadPopup = ({ show, onHide, title, rptCd, templateParams }) => {
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [files, setFiles] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fileUtils.setAccept('excel');
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage("");
        if (fileInputRef.current) {
          fileInputRef.current.value = null;
        }
        setFiles(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleDownload = async () => {
    try {
      const result = await fetchData("excelupload/template/filelist", templateParams);
      if (result.errCd === '00' && result.data && result.data[0].FILEDATA.length > 0) {
        const fileData = result.data[0].FILEDATA;
        const fileName = result.data[0].FILENM || 'template.xlsx';
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${fileData}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        //setToastMessage(result.errMsg || "템플릿 파일을 다운로드할 수 없습니다.");
        setToastMessage("템플릿 파일을 다운로드할 수 없습니다.");
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage("템플릿 다운로드 중 오류가 발생했습니다: " + error.message);
      setShowToast(true);
    }
  };

  const handleSave = async (file) => {
    if (!file) {
      setToastMessage("파일을 선택해 주세요.");
      setShowToast(true);
      return;
    }
    try {
      const formData = new FormData();
      formData.append("rptCd", rptCd);
      formData.append("file", file);
      const result = await fetchFileUpload("excelupload/save", formData);
      if (result.errCd !== '00') {
        setToastMessage(result.errMsg || "엑셀 업로드 실패");
        setShowToast(true);
      } else {
        setToastMessage("파일이 정상적으로 등록되었습니다.<br>자료에 따라 등록이 지연될 수 있습니다.<br>자료 등록 확인은 수분 뒤에 하시기 바랍니다.");
        setShowToast(true);
        // Delay closing the popup to allow the toast message to be displayed
        setTimeout(() => {
          onHide();
        }, 3000); // Match the toast message duration
      }
    } catch (error) {
      setToastMessage("엑셀 업로드 중 오류가 발생했습니다: " + error.message);
      setShowToast(true);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onHide}></div>
      <div className={`${styles.modal} show d-block`} tabIndex="-1">
        <div className={`${styles.modalDialog} modal-dialog-centered`}>
          <div className={`${styles.modalContent} modal-content`}>
            <div className={`${styles.modalHeader} modal-header`}>
              <h5 className={`${styles.modalTitle} modal-title`}>{title}</h5>
              <button type="button" className={`${styles.btnClose} btn-close`} onClick={onHide}></button>
            </div>
            <div className={`${styles.modalBody} modal-body`}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>파일</label>
                <div className="input-group">
                  <input
                    type="file"
                    className="form-control"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const selectedFile = e.target.files[0];
                      if (selectedFile) {
                        if (selectedFile.size > fileUtils.getMaxFileSize()) {
                          setToastMessage(`파일 크기는 ${fileUtils.formatFileSize(fileUtils.getMaxFileSize())}를 초과할 수 없습니다.`);
                          setShowToast(true);
                          e.target.value = null;
                          setFiles(null);
                          return;
                        }
                        if (!fileUtils.isValidFile(selectedFile, true)) {
                          setToastMessage('엑셀 파일(xls, xlsx)만 업로드 가능합니다.');
                          setShowToast(true);
                          e.target.value = null;
                          setFiles(null);
                          return;
                        }
                        setFiles(selectedFile);
                      } else {
                        setFiles(null);
                      }
                    }}
                    accept={fileUtils.getAccept()}
                    aria-label="Upload"
                  />
                  <span className="input-group-text">
                    <i className="bi bi-upload"></i>
                  </span>
                </div>
              </div>
              <div className={styles.buttonGroup}>
                <button type="button" className={`${styles.btn} ${styles.btnDownload} btn`} onClick={handleDownload}>
                  양식다운로드
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSave} btn text-bg-success`}
                  onClick={() => handleSave(files)}
                >
                  자료등록
                </button>
              </div>
            </div>
            <div>
              {showToast && (
                <div className={`${styles.toast} alert alert-info`} role="alert" dangerouslySetInnerHTML={{ __html: toastMessage }}></div>
              )}
            </div>
            <div className={`${styles.modalFooter} modal-footer`}>
              <button type="button" className={`${styles.margin1} ${styles.btn} ${styles.btnSecondary} btn btn-secondary`} onClick={onHide}>
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExcelUploadPopup;