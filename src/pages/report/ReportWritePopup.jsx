import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import { fetchData, fetchFileUpload } from '../../utils/dataUtils';
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import { msgPopup } from '../../utils/msgPopup';
import styles from './ReportPopup.module.css';
import fileUtils from '../../utils/fileUtils';

const ReportWritePopup = ({ show, onHide, reportTitle, reportId, report = null, files: initialFiles = [], onParentSearch }) => {
  const { user } = useStore();
  const canWriteBoard = user;// && hasPermission(user.auth, 'reportOper');
  const isEdit = !!report && !!report.REPORTNO;
  const existingFiles = initialFiles;
  const initialExistingFilesState = existingFiles.map(file => ({
    ...file,
    size: file.fileSize || 0,
    isValid: fileUtils.isValidFile(file, true),
  }));
  const initialFileInputs = initialExistingFilesState.length >= fileUtils.getMaxFiles() ? [] : [{ id: Date.now() }];
  const [title, setTitle] = useState(report?.TITLE || '');
  const [content, setContent] = useState(report?.CONTENTS || '');
  const [fileInputs, setFileInputs] = useState(initialFileInputs);
  const [files, setFiles] = useState(new Array(initialFileInputs.length).fill(null));
  const [existingFilesState, setExistingFilesState] = useState(initialExistingFilesState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fileUtils.setAccept('excel/*');
    return () => {
      fileUtils.getAccept();
    };
  }, []);

  useEffect(() => {
    if (!show) return;    
    
    //권한 확인 필요
    if (!user) {
      errorMsgPopup('권한이 없습니다.');
      onHide();
      return;
    }
    
    if(isEdit) {
      const hasReportOper = hasPermission(user.auth, 'reportOper');
      const isEditMode = !!report && !!report.REPORTNO;// 본인 등록 여부

      const regEmpNo = report?.REGEMPNO ?? report?.regempNo;
      const isOwner = isEditMode &&
                      user?.empNo &&
                      regEmpNo &&
                      String(user.empNo) === String(regEmpNo);

      // reportOper 권한이 있거나, 본인이 등록한 보고서이면 열 수 있음
      const canOpen = hasReportOper || isOwner;

      if (!canOpen) {
        errorMsgPopup(
          isEditMode
            ? '본인이 등록한 보고서만 수정할 수 있습니다.'
            : '권한이 없습니다.'
        );
        onHide();
      }
    }
  }, [show, user, onHide]);

  const handleAddFileInput = () => {
    const totalFiles = existingFilesState.length + fileInputs.length;
    if (totalFiles < fileUtils.getMaxFiles()) {
      setFileInputs([...fileInputs, { id: Date.now() }]);
      setFiles([...files, null]);
    }
  };

  const handleRemoveFileInput = (id) => {
    const index = fileInputs.findIndex(input => input.id === id);
    if (index === -1) return;

    if (fileInputs.length > 1) {
      const newFileInputs = fileInputs.filter(input => input.id !== id);
      const newFiles = files.filter((_, i) => i !== index);
      setFileInputs(newFileInputs);
      setFiles(newFiles);
      return;
    }

    setFileInputs([{ id: Date.now() + 1 }]);
    setFiles([null]);
  };

  const handleRemoveExistingFile = async (file) => {
    if (!window.confirm('파일을 삭제하시겠습니까?')) return;

    if (!isEdit || !reportId || !report?.REPORTNO) {
      errorMsgPopup('Report 정보가 존재하지 않습니다.');
      return;
    }

    try {
      const param = {
        gubun: 'D',
        fileId: String(file.fileId),
        reportId: String(reportId),
        reportNo: String(report.REPORTNO),
      };

      const deleteResponse = await fetchData('report/fileDelete', param);
      if (deleteResponse.errCd !== '00') {
        throw new Error(deleteResponse.errMsg || '파일 삭제 실패');
      }

      setExistingFilesState(existingFilesState.filter(f => f.fileId !== file.fileId));
      const totalFiles = existingFilesState.length - 1 + fileInputs.length;
      if (totalFiles < fileUtils.getMaxFiles() && fileInputs.length === 0) {
        setFileInputs([{ id: Date.now() }]);
        setFiles([null]);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      errorMsgPopup(error.message || '파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleFileChange = (id, e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > fileUtils.getMaxFileSize()) {
        errorMsgPopup(`파일 크기는 ${fileUtils.formatFileSize(fileUtils.getMaxFileSize())}를 초과할 수 없습니다.`);
        return;
      }
      if (!fileUtils.isValidFile(selectedFile, true)) {
        errorMsgPopup('엑셀 파일(xls, xlsx)만 업로드 가능합니다.');
        return;
      }
      const index = fileInputs.findIndex(input => input.id === id);
      if (index === -1) return;

      const newFiles = [...files];
      newFiles[index] = selectedFile;
      setFiles(newFiles);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const originalTitle = report?.TITLE || '';
    const originalContent = report?.CONTENS || '';
    const hasTitleChanged = title !== originalTitle;
    const hasContentChanged = content !== originalContent;
    
    if ((!isEdit && (!title || !content)) || (isEdit && hasTitleChanged && !title) || (isEdit && hasContentChanged && !content)) {
      errorMsgPopup('제목과 내용을 입력해주세요.');
      return;
    }

    if (!canWriteBoard) {
      errorMsgPopup('권한이 없습니다.');
      onHide();
      return;
    }

    setLoading(true);
    
    try {
      const gubun = isEdit ? 'U' : 'I';
      const reportNo = isEdit ? String(report.REPORTNO) : '0';
      const param = {
        gubun: gubun,
        reportId: String(reportId),
        reportNo: reportNo,
        title: title,
        content: content,
      };

      const saveResponse = await fetchData('report/reportDataTran', param);

      if (saveResponse.errCd !== '00') {
        throw new Error(saveResponse.errMsg || '저장 실패');
      }

      const updatedReportNo = isEdit ? reportNo : saveResponse.data?.reportNo;

      const validFiles = files.filter(file => file != null);

      if (validFiles.length > 0) {        
        const formData = new FormData();
        formData.append("gubun", "I");
        formData.append("fileId", "");
        formData.append("reportId", reportId);
        formData.append("reportNo", updatedReportNo);

        validFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetchFileUpload('report/fileSave', formData);
        if (uploadResponse.errCd !== '00') {
          throw new Error(uploadResponse.errMsg || '파일 업로드 실패');
        }
      } 

      msgPopup('성과 Report가 성공적으로 저장되었습니다.');
      onHide();
      onParentSearch();
    } catch (error) {
      console.error('Error saving Report:', error);
      errorMsgPopup(error.message || '성과 Report 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !reportId || !report?.REPORTNO) {
      errorMsgPopup('삭제할 성과 Report가 없습니다.');
      return;
    }

    if (!window.confirm('성과 Report를 삭제하시겠습니까?')) return;

    if (!canWriteBoard) {
      errorMsgPopup('권한이 없습니다.');
      onHide();
      return;
    }

    setLoading(true);
    try {
      const param = {
        gubun: 'D',
        reportId: String(reportId),
        reportNo: String(report.REPORTNO),
        title: title || '',
        content: content || '',
      };

      const deleteResponse = await fetchData('report/reportDataTran', param);
      if (deleteResponse.errCd !== '00') {
        throw new Error(deleteResponse.errMsg || '삭제 실패');
      }

      msgPopup('성과 Report가 성공적으로 삭제되었습니다.');
      onHide();
      onParentSearch();
    } catch (error) {
      console.error('Error deleting Report:', error);
      errorMsgPopup(error.message || '성과 Report 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          {reportTitle} {isEdit ? '변경' : '등록'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        <form onSubmit={handleSubmit}>
          <div className='boardWrap'>
            <div>
              <label className='form-label'>제목</label>
              <input
                className={`form-control bg-light-subtle ${styles.formControl}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='제목을 입력하세요'
                required
              />
            </div>
            <div>
              <label className='form-label'>내용</label>
              <textarea
                className={`form-control bg-light-subtle ${styles.formControl} ${styles.textarea}`}
                rows='8'
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder='내용을 입력하세요'
                required
              />
            </div>
            <div>
              <div className='attachLabelWrap'>
                <label className='form-label'>
                  첨부파일 <span className='text-muted'>(최대 {fileUtils.getMaxFiles()}개, {fileUtils.formatFileSize(fileUtils.getMaxFileSize())}까지, 엑셀 파일만 가능)</span>
                </label>
              </div>
              {existingFilesState.length > 0 && (
                <div className='existingAttachItem'>
                  <h6>기존 첨부파일:</h6>
                  {existingFilesState.map((file) => (
                    <div key={file.fileId} className='attachItem'>
                      <span>
                        {file.fileName} ({fileUtils.formatFileSize(file.size)})
                        {!file.isValid && <span className='text-danger ms-2'>(엑셀 파일이 아님)</span>}
                      </span>
                      <button
                        type='button'
                        className='btn btnOutlinedIcon'
                        onClick={() => handleRemoveExistingFile(file)}
                      >
                        -
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {fileInputs && fileInputs.length > 0 ? (
                fileInputs.map((input, index) => (
                  <div key={input.id} className='d-flex align-items-center mt-2'>
                    <input
                      type='file'
                      className={`form-control bg-light-subtle ${styles.formControl} me-2`}
                      onChange={(e) => handleFileChange(input.id, e)}
                      accept={fileUtils.getAccept()}
                    />
                    <button
                      type='button'
                      className='btn btnOutlinedIcon'
                      onClick={() => handleRemoveFileInput(input.id)}
                    >
                      -
                    </button>
                    {index === fileInputs.length - 1 && (
                      <button
                        type='button'
                        className='btn btnOutlinedIcon'
                        onClick={handleAddFileInput}
                        disabled={existingFilesState.length + fileInputs.length >= fileUtils.getMaxFiles()}
                      >
                        +
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div></div>
              )}
              {files.some(file => file != null) && (
                <div className='attachList'>
                  <h6>선택된 파일:</h6>
                  <ul>
                    {files.map((file, index) => (
                      file && (
                        <li key={index}>
                          {file.name} ({fileUtils.formatFileSize(file.size)})
                        </li>
                      )
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className='boardBottomBtnWrap'>
            <button
              type='button'
              className='btn btnSecondary'
              onClick={onHide}
            >
              취소
            </button>
            {canWriteBoard && (
              <>
                {!isEdit ? (
                  <button
                    type='submit'
                    className='btn btnPrimary'
                    disabled={loading}
                  >
                    {loading ? '저장 중...' : '등록'}
                  </button>
                ) : (
                  <>
                    <button
                      type='submit'
                      className='btn btnPrimary'
                      disabled={loading}
                    >
                      {loading ? '저장 중...' : '변경'}
                    </button>
                    <button
                      type='button'
                      className='btn btnPrimary'
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      {loading ? '삭제 중...' : '삭제'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default ReportWritePopup;