import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import { fetchData, fetchFileUpload } from '../../../utils/dataUtils';
import useStore from '../../../store/store';
import { hasPermission } from '../../../utils/authUtils';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import { msgPopup } from '../../../utils/msgPopup';
import styles from './BoardPopup.module.css';
import fileUtils from '../../../utils/fileUtils';

const BoardWritePopup = ({ show, onHide, notice = null, files: initialFiles = [], type = 'notice' }) => {
  const { user } = useStore();
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');
  const isEdit = !!notice && !!notice.id;
  const existingFiles = initialFiles;
  const initialExistingFilesState = existingFiles.map(file => ({
    ...file,
    size: file.fileSize || 0,
    isValid: fileUtils.isValidFile(file),
  }));
  const initialFileInputs = initialExistingFilesState.length >= fileUtils.getMaxFiles() ? [] : [{ id: Date.now() }];
  const [title, setTitle] = useState(notice?.title || '');
  const [content, setContent] = useState(notice?.content || '');
  const [fileInputs, setFileInputs] = useState(initialFileInputs);
  const [files, setFiles] = useState(new Array(initialFileInputs.length).fill(null));
  const [existingFilesState, setExistingFilesState] = useState(initialExistingFilesState);
  const [loading, setLoading] = useState(false);

  const textMap = {
    notice: '표준활동 공지사항',
    notice2: '표준활동 패치내역',
    carnotice: '차량 공지사항',
    carnotice2: '차량 과태료',
  };

  const apiEndpoints = {
    save: {
      notice: 'notice/save',
      notice2: 'notice2/save',
      carnotice: 'carnotice/save',
      carnotice2: 'carnotice2/save',
    },
    filedelete: {
      notice: 'notice/filedelete',
      notice2: 'notice2/filedelete',
      carnotice: 'carnotice/filedelete',
      carnotice2: 'carnotice2/filedelete',
    },
    filesave: {
      notice: 'notice/filesave',
      notice2: 'notice2/filesave',
      carnotice: 'carnotice/filesave',
      carnotice2: 'carnotice2/filesave',
    }
  };

  useEffect(() => {
    fileUtils.setAccept('*');
    return () => {
      fileUtils.getAccept();
    };
  }, []);

  useEffect(() => {
    if (!show) return;
    if (!user || !hasPermission(user.auth, 'mainBoard')) {
      errorMsgPopup('권한이 없습니다.');
      onHide();
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

    if (!isEdit || !notice?.id) {
      errorMsgPopup('공지사항 ID가 존재하지 않습니다.');
      return;
    }

    try {
      const apiEndpoint = apiEndpoints.filedelete[type] || 'notice/filedelete';
      const payload = {
        gubun: 'D',
        fileId: String(file.fileId),
        noticeId: String(notice.id),
      };

      const deleteResponse = await fetchData(apiEndpoint, payload);
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
      if (!fileUtils.isValidFile(selectedFile)) {
        errorMsgPopup('문서 파일(pdf, doc, docx, xls, xlsx, ppt, pptx)만 업로드 가능합니다.');
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
    const originalTitle = notice?.title || '';
    const originalContent = notice?.content || '';
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
      const apiEndpoint = apiEndpoints.save[type] || 'notice/save';
      const gubun = isEdit ? 'U' : 'I';
      const noticeId = isEdit ? String(notice.id) : '0';
      const payload = {
        gubun,
        noticeId,
        title,
        content,
      };

      const saveResponse = await fetchData(apiEndpoint, payload);
      if (saveResponse.errCd !== '00') {
        throw new Error(saveResponse.errMsg || '저장 실패');
      }

      const updatedNoticeId = isEdit ? noticeId : saveResponse.data?.noticeId;

      const validFiles = files.filter(file => file != null);
      if (validFiles.length > 0) {
        const uploadEndpoint = apiEndpoints.filesave[type] || 'notice/filesave';
        const formData = new FormData();
        formData.append("gubun", "I");
        formData.append("fileId", "");
        formData.append("noticeId", updatedNoticeId);

        validFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetchFileUpload(uploadEndpoint, formData);
        if (uploadResponse.errCd !== '00') {
          throw new Error(uploadResponse.errMsg || '파일 업로드 실패');
        }
      } 

      msgPopup('공지사항이 성공적으로 저장되었습니다.');
      onHide();
      window.location.reload(); // 페이지 새로고침
    } catch (error) {
      console.error('Error saving notice:', error);
      errorMsgPopup(error.message || '공지사항 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !notice?.id) {
      errorMsgPopup('삭제할 공지사항이 없습니다.');
      return;
    }

    if (!window.confirm('공지사항을 삭제하시겠습니까?')) return;

    if (!canWriteBoard) {
      errorMsgPopup('권한이 없습니다.');
      onHide();
      return;
    }

    setLoading(true);
    try {
      const apiEndpoint = apiEndpoints.save[type] || 'notice/save';
      const payload = {
        gubun: 'D',
        noticeId: String(notice.id),
        title: title || '',
        content: content || '',
      };

      const deleteResponse = await fetchData(apiEndpoint, payload);
      if (deleteResponse.errCd !== '00') {
        throw new Error(deleteResponse.errMsg || '삭제 실패');
      }

      msgPopup('공지사항이 성공적으로 삭제되었습니다.');
      onHide();
      window.location.reload(); // 페이지 새로고침
    } catch (error) {
      console.error('Error deleting notice:', error);
      errorMsgPopup(error.message || '공지사항 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          {textMap[type] || ''} {isEdit ? '변경' : '등록'}
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
                  첨부파일 <span className='text-muted'>(최대 {fileUtils.getMaxFiles()}개, {fileUtils.formatFileSize(fileUtils.getMaxFileSize())}까지, 문서 파일만 가능)</span>
                </label>
              </div>
              {existingFilesState.length > 0 && (
                <div className='existingAttachItem'>
                  <h6>기존 첨부파일:</h6>
                  {existingFilesState.map((file) => (
                    <div key={file.fileId} className='attachItem'>
                      <span>
                        {file.fileName} ({fileUtils.formatFileSize(file.size)})
                        {!file.isValid && <span className='text-danger ms-2'>(문서 파일이 아님)</span>}
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

export default BoardWritePopup;