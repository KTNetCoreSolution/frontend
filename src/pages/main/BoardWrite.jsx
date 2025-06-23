import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import styles from './Board.module.css';
import fileUtils from '../../utils/fileUtils';

const BoardWrite = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const isEdit = !!state?.notice;
  const existingFiles = state?.files || [];

  useEffect(() => {
    fileUtils.setAccept('*');
    return () => {
      fileUtils.getAccept();
    };
  }, []);

  const initialExistingFilesState = existingFiles.map(file => ({
    ...file,
    size: file.fileSize || 0,
    isValid: fileUtils.isValidFile(file),
  }));
  const initialFileInputs = initialExistingFilesState.length >= fileUtils.getMaxFiles() ? [] : [{ id: Date.now() }];
  const [title, setTitle] = useState(state?.notice?.title || '');
  const [content, setContent] = useState(state?.notice?.content || '');
  const [fileInputs, setFileInputs] = useState(initialFileInputs);
  const [files, setFiles] = useState(new Array(initialFileInputs.length).fill(null));
  const [existingFilesState, setExistingFilesState] = useState(initialExistingFilesState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !hasPermission(user.auth, 'mainBoard')) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

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

    if (!isEdit || !state?.notice?.id) {
      errorMsgPopup("공지사항 ID가 존재하지 않습니다. 수정 모드에서만 파일 삭제가 가능합니다.");
      return;
    }

    try {
      const payload = {
        gubun: 'D',
        fileId: String(file.fileId),
        noticeId: String(state.notice.id)
      };

      const deleteResponse = await fetchData("notice/filedelete", payload);

      if (deleteResponse.errCd !== '00') {
        throw new Error(deleteResponse.errMsg || "파일 삭제 실패");
      }

      setExistingFilesState(existingFilesState.filter(f => f.fileId !== file.fileId));

      const totalFiles = existingFilesState.length - 1 + fileInputs.length;
      if (totalFiles < fileUtils.getMaxFiles() && fileInputs.length === 0) {
        setFileInputs([{ id: Date.now() }]);
        setFiles([null]);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      errorMsgPopup(error.message || "파일 삭제 중 오류가 발생했습니다.");
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
    const originalTitle = state?.notice?.title || '';
    const originalContent = state?.notice?.content || '';
    const hasTitleChanged = title !== originalTitle;
    const hasContentChanged = content !== originalContent;

    if ((!isEdit && (!title || !content)) || (isEdit && hasTitleChanged && !title) || (isEdit && hasContentChanged && !content)) {
      errorMsgPopup("제목과 내용을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const gubun = isEdit ? 'U' : 'I';
      const noticeId = isEdit ? String(state.notice.id) : '0';
      const payload = {
        gubun,
        noticeId,
        title,
        content,
      };

      const saveResponse = await fetchData("notice/save", payload);

      if (saveResponse.errCd !== '00') {
        throw new Error(saveResponse.errMsg || "공지사항 저장 실패");
      }

      const updatedNoticeId = isEdit ? noticeId : saveResponse.data?.noticeId;

      const validFiles = files.filter(file => file != null);
      if (validFiles.length > 0) {
        const formData = new FormData();
        formData.append("gubun", "I");
        formData.append("fileId", "");
        formData.append("noticeId", updatedNoticeId);

        validFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetchFileUpload("notice/filesave", formData);

        if (uploadResponse.errCd !== '00') {
          throw new Error(uploadResponse.errMsg || "파일 업로드 실패");
        }
      }

      msgPopup(isEdit ? "공지사항이 성공적으로 변경되었습니다." : "공지사항이 성공적으로 등록되었습니다.");
      navigate('/main');
    } catch (error) {
      console.error("공지사항 저장 실패:", {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        } : 'No response received'
      });

      errorMsgPopup(error.message || "공지사항 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const noticeId = String(state.notice.id);
      const payload = {
        gubun: 'D',
        noticeId,
        title: title || '',
        content: content || '',
      };

      const deleteResponse = await fetchData("notice/save", payload);
      if (deleteResponse.errCd !== '00') {
        throw new Error(deleteResponse.errMsg || "공지사항 삭제 실패");
      }

      msgPopup("공지사항이 성공적으로 삭제되었습니다.");
      navigate('/main');
    } catch (error) {
      console.error("공지사항 삭제 실패:", error);

      errorMsgPopup(error.message || "공지사항 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container bg-body">
      <h2 className={`text-primary text-dark fs-5 mb-4 pt-3 ${styles.boardTitle}`}>
        {isEdit ? '공지 변경' : '공지 등록'}
      </h2>
      <div className={styles.boardTitleLine}></div>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">제목</label>
          <input
            className={`form-control bg-light-subtle ${styles.formControl}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">내용</label>
          <textarea
            className={`form-control bg-light-subtle ${styles.formControl}`}
            rows="5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            required
          />
        </div>
        <div className="mb-4">
          <label className="form-label">
            첨부파일 <span className="text-muted">(최대 {fileUtils.getMaxFiles()}개까지만 첨부 가능하며, {fileUtils.formatFileSize(fileUtils.getMaxFileSize())}까지만 가능합니다. 문서 파일만 업로드 가능.)</span>
          </label>
          {existingFilesState.length > 0 && (
            <div className="mb-3">
              <h6>기존 첨부파일:</h6>
              {existingFilesState.map((file) => (
                <div key={file.fileId} className="d-flex align-items-center mb-2">
                  <span className="me-2">
                    {file.fileName} ({fileUtils.formatFileSize(file.size)})
                    {!file.isValid && <span className="text-danger ms-2">(문서 파일이 아님)</span>}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
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
              <div key={input.id} className="d-flex align-items-center mb-2">
                <input
                  type="file"
                  className={`form-control bg-light-subtle ${styles.formControl} me-2`}
                  onChange={(e) => handleFileChange(input.id, e)}
                  accept={fileUtils.getAccept()}
                />
                <button
                  type="button"
                  className="btn btn-outline-danger me-2"
                  onClick={() => handleRemoveFileInput(input.id)}
                >
                  -
                </button>
                {index === fileInputs.length - 1 && (
                  <button
                    type="button"
                    className="btn btn-outline-primary"
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
            <div className="mt-3">
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
        <div className="btn-group-custom d-flex justify-content-end gap-2 mb-3 mt-5">
          <button
            type="button"
            className={`btn ${styles.btnCancel}`}
            onClick={() => navigate('/main')}
          >
            취소
          </button>
          {!isEdit ? (
            <button
              type="submit"
              className={`btn ${styles.btnReg}`}
              disabled={loading}
            >
              {loading ? "저장 중..." : "등록"}
            </button>
          ) : (
            <>
              <button
                type="submit"
                className={`btn ${styles.btnMod}`}
                disabled={loading}
              >
                {loading ? "저장 중..." : "변경"}
              </button>
              <button
                type="button"
                className={`btn btn-danger ${styles.btnDel}`}
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "삭제 중..." : "삭제"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default BoardWrite;