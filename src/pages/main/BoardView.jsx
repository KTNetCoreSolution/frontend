import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchData } from '../../utils/dataUtils';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styles from './Board.module.css';
import { hasPermission } from '../../utils/authUtils';
import useStore from '../../store/store';
import ImageViewPopup from '../../components/popup/ImageViewPopup';
import TextViewPopup from '../../components/popup/TextViewPopup';
import fileUtils from '../../utils/fileUtils';

const BoardView = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const notice = state?.notice;
  const canModifyBoard = user && hasPermission(user.auth, 'mainBoard');

  const [title, setTitle] = useState(notice?.title || '');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [noticeDetails, setNoticeDetails] = useState(notice);
  const [zoomLevel, setZoomLevel] = useState(1);

  const closeImagePopup = () => {
    setSelectedImage(null);
    setZoomLevel(1);
  };

  const closeTextPopup = () => {
    setSelectedText(null);
  };

  useEffect(() => {
    const fetchNoticeDetails = async () => {
      try {
        const result = await fetchData('notice/list', {gubun: 'DETAIL', noticeId: notice.id, debug: 'F', });
        if (result.errCd === '00' && result.data.length > 0) {
          const detail = {
            id: result.data[0].NOTICEID,
            title: result.data[0].TITLE,
            date: result.data[0].REGEDT,
            regedBy: result.data[0].REGEDBY,
            content: result.data[0].CONTENTS || '',
          };
          setNoticeDetails(detail);
          setTitle(detail.title);
          setContent(detail.content);
        } else {
          console.error('Failed to fetch notice details:', result.errMsg);
          errorMsgPopup('공지사항 상세 정보를 불러오지 못했습니다.');
        }
      } catch (error) {
        console.error('Error fetching notice details:', error);
        errorMsgPopup('공지사항 상세 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };

    const fetchFiles = async () => {
      try {
        const result = await fetchData('notice/filelist', {gubun: 'LIST', noticeId: notice.id, fileId: '', debug: 'F', });
        if (result.errCd === '00') {
          const mappedFiles = result.data.map((file) => ({
            fileId: file.FILEID,
            noticeId: file.NOTICEID,
            fileName: file.FILENM,
            fileSize: file.FILESIZE || 0,
          }));
          setFiles(mappedFiles);
        } else {
          setFiles([]);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
        errorMsgPopup('파일 목록을 불러오는 중 오류가 발생했습니다.');
      }
    };

    if (notice?.id) {
      fetchNoticeDetails();
      fetchFiles();
    }
  }, [notice?.id]);

  const handleEdit = () => {
    navigate('/main/boardWrite', { state: { notice: noticeDetails, files } });
  };

  const handleFileClick = async (file) => {
    try {
      const result = await fetchData('notice/filelist', {gubun: 'DETAIL', noticeId: notice.id || '', fileId: file.fileId, debug: 'F', });
      if (result.errCd === '00' && result.data.length > 0) {
        const extension = fileUtils.getFileExtension(result.data[0].FILENM)?.toLowerCase();
        const mimeType = fileUtils.mimeTypes[extension] || 'application/octet-stream';
        const fileData = result.data[0].FILEDATA;

        if (fileUtils.isImageFile(file)) {
          const dataUrl = `data:${mimeType};base64,${fileData}`;
          setSelectedImage({ src: dataUrl, fileName: result.data[0].FILENM });
        } else if (fileUtils.isTextFile(file)) {
          const textContent = fileUtils.decodeBase64ToText(fileData);
          setSelectedText({ content: textContent, fileName: result.data[0].FILENM });
        } else {
          // Trigger download for non-image, non-text files
          const link = document.createElement('a');
          link.href = `data:${mimeType};base64,${fileData}`;
          link.download = result.data[0].FILENM;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        console.error('Failed to fetch file details:', result.errMsg);
        errorMsgPopup('파일을 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('Error fetching file details:', error);
      errorMsgPopup('파일을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleDownload = async (file) => {
    try {
      const result = await fetchData('notice/filelist', {gubun: 'DETAIL', noticeId: notice.id || '', fileId: file.fileId, debug: 'F', });
      if (result.errCd === '00' && result.data.length > 0) {
        const fileData = result.data[0].FILEDATA;
        const mimeType = fileUtils.mimeTypes[fileUtils.getFileExtension(file.fileName)] || 'application/octet-stream';
        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${fileData}`;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        errorMsgPopup('파일을 다운로드할 수 없습니다.');
      }
    } catch (error) {
      console.error('Error fetching file for download:', error);
      errorMsgPopup('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleDownloadAll = async () => {
    if (files.length === 0) {
      errorMsgPopup('다운로드할 파일이 없습니다.');
      return;
    }

    for (const file of files) {
      await handleDownload(file);
    }
  };

  const getFileIcon = (file) => {
    return <i className={`bi ${fileUtils.getFileIcon(file)} me-2`}></i>;
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.1));
  };

  return (
    <div className="container bg-body">
      <h2 className={`text-primary text-dark fs-5 mb-4 pt-3 ${styles.boardTitle}`}>
        공지사항 상세
      </h2>
      <div className="mb-3">
        <label className="form-label">작성일</label>
        <input
          className={`form-control ${styles.formControl}`}
          value={noticeDetails?.date || ''}
          readOnly
        />
      </div>
      <div className="mb-3">
        <label className="form-label">작성자</label>
        <input
          className={`form-control ${styles.formControl}`}
          value={noticeDetails?.regedBy || ''}
          readOnly
        />
      </div>
      <div className="mb-3">
        <label className="form-label">제목</label>
        <input
          className={`form-control ${styles.formControl}`}
          value={title}
          readOnly
        />
      </div>
      <div className="mb-3">
        <label className="form-label">내용</label>
        <textarea
          className={`form-control ${styles.formControl}`}
          rows="5"
          value={content}
          readOnly
        />
      </div>
      <div className="mb-4">
        <label className="form-label d-flex justify-content-between align-items-center">
          <span>첨부파일</span>
          {files.length > 0 && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={handleDownloadAll}
            >
              전체 다운로드
            </button>
          )}
        </label>
        {files?.length > 0 ? (
          files.map((file, index) => (
            <div key={index} className={`d-flex align-items-center mb-2 ${styles.fileItem}`}>
              <div className={styles.imageFile}>
                {(fileUtils.isImageFile(file) || fileUtils.isTextFile(file)) ? (
                  <span
                    onClick={() => handleFileClick(file)}
                    style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                  >
                    {getFileIcon(file)}
                    {file.fileName} ({fileUtils.formatFileSize(file.fileSize)})
                  </span>
                ) : (
                  <span>
                    {getFileIcon(file)}
                    {file.fileName} ({fileUtils.formatFileSize(file.fileSize)})
                  </span>
                )}
              </div>
              <button
                className="btn btn-sm btn-outline-secondary ms-2"
                onClick={() => handleDownload(file)}
              >
                <i className="bi bi-download"></i> 다운로드
              </button>
            </div>
          ))
        ) : (
          <div>첨부파일 없음</div>
        )}
      </div>
      <button
        className="btn btn-secondary me-2 mb-3 mt-5"
        onClick={() => navigate('/main')}
      >
        뒤로 가기
      </button>
      {canModifyBoard && (
        <button
          className="btn btn-warning me-2 mb-3 mt-5"
          onClick={handleEdit}
        >
          변경 가기
        </button>
      )}
      {selectedImage && (
        <ImageViewPopup
          imageSrc={selectedImage.src}
          fileName={selectedImage.fileName}
          onClose={closeImagePopup}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      )}
      {selectedText && (
        <TextViewPopup
          textContent={selectedText.content}
          fileName={selectedText.fileName}
          onClose={closeTextPopup}
        />
      )}
    </div>
  );
};

export default BoardView;