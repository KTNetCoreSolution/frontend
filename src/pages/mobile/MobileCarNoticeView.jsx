import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchData } from "../../utils/dataUtils.js";
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import { hasPermission } from '../../utils/authUtils';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import fileUtils from '../../utils/fileUtils';
import ImageViewPopup from '../../components/popup/ImageViewPopup';
import TextViewPopup from '../../components/popup/TextViewPopup';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import styles from './MobileCarNoticeView.module.css';
import api from '../../utils/api.js';

const MobileCarNoticeView = () => {
  const { state } = useLocation();
  const { user } = useStore();
  const { clearUser } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const noticeId = state?.noticeid;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [noticeDetails, setNoticeDetails] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleLogout = async () => {
    try {
      const response = await api.post(commonUtils.getServerUrl('auth/logout'), {});
      if (response) {
        clearUser();
        navigate('/mobile/Login');
      }
    } catch (error) {
      console.error('Logout failed:', error.message);
      clearUser();
      navigate('/mobile/Login');
    }
  };

  const closeImagePopup = () => {
    setSelectedImage(null);
    setZoomLevel(1);
  };

  const closeTextPopup = () => {
    setSelectedText(null);
  };
  
  useEffect(() => {
    const fetchNoticeDetails = async () => {
      if (!noticeId) {
        console.error('No noticeId provided');
        errorMsgPopup('공지사항 ID가 없습니다.');
        return;
      }
      try {
        const result = await fetchData('carnotice/list', { gubun: 'DETAIL', noticeId: noticeId, debug: 'F' });

        if (result.errCd === '00' && result.data.length > 0) {
          const detail = { id: result.data[0].NOTICEID, title: result.data[0].TITLE, date: result.data[0].REGEDT, regedBy: result.data[0].REGEDBY, content: result.data[0].CONTENTS || '' };
          setNoticeDetails(detail);
          setTitle(detail.title);
          setContent(detail.content);
        } else {
          console.error('Failed to fetch notice details:', result.errMsg);
          errorMsgPopup('기동장비 공지사항 상세 정보를 불러오지 못했습니다.');
        }
      } catch (error) {
        console.error('Error fetching notice details:', error);
        errorMsgPopup('기동장비 공지사항 상세 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };

    const fetchFiles = async () => {
      if (!noticeId) return;
      try {
        const result = await fetchData('carnotice/filelist', { gubun: 'LIST', noticeId: noticeId, fileId: '', debug: 'F' });

        if (result.errCd === '00') {
          const mappedFiles = result.data.map((file) => ({ fileId: file.FILEID, noticeId: file.NOTICEID, fileName: file.FILENM, fileSize: file.FILESIZE || 0 }));
          setFiles(mappedFiles);
        } else {
          setFiles([]);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
        errorMsgPopup('파일 목록을 불러오는 중 오류가 발생했습니다.');
      }
    };

    fetchNoticeDetails();
    fetchFiles();
  }, [noticeId]);

  const handleFileClick = async (file) => {
    try {
      const result = await fetchData('carnotice/filelist', { gubun: 'DETAIL', noticeId: noticeId || '', fileId: file.fileId, debug: 'F' });
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
      const result = await fetchData('carnotice/filelist', { gubun: 'DETAIL', noticeId: noticeId || '', fileId: file.fileId, debug: 'F' });
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
      <div className="container-fluid p-0">
        <header className="header">
          <h1 className="h5 mb-0">기동장비 공지사항 상세</h1>
          <button className="btn text-white" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>
        
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
          <div className='boardWrap'>
            <div>
              <label className="form-label">작성일</label>
              <input className={`form-control ${styles.formControl}`} value={noticeDetails?.date || ''} readOnly />
            </div>
            <div>
              <label className="form-label">작성자</label>
              <input className={`form-control ${styles.formControl}`} value={noticeDetails?.regedBy || ''} readOnly />
            </div>
            <div>
              <label className="form-label">제목</label>
              <input className={`form-control ${styles.formControl}`} value={title} readOnly />
            </div>
            <div>
              <label className="form-label">내용</label>
              <textarea className={`form-control ${styles.formControl} ${styles.textarea}`} rows="8" value={content} readOnly />
            </div>
            <div>
              <div className='attachLabelWrap'>
                <label className="form-label">
                  <span>첨부파일</span>
                </label>
                {files.length > 0 && (
                  <button className="downloadButton" onClick={handleDownloadAll} >
                    전체 다운로드
                  </button>
                )}
              </div>
              {files?.length > 0 ? (
                files.map((file, index) => (
                  <div key={index} className='attachItem'>
                    <div className='imageFile'>
                      {(fileUtils.isImageFile(file) || fileUtils.isTextFile(file)) ? (
                        <button onClick={() => handleFileClick(file)} className='txtBtn' >
                          {getFileIcon(file)}
                          {file.fileName} ({fileUtils.formatFileSize(file.fileSize)})
                        </button>
                      ) : (
                        <button className='txtBtn'>
                          {getFileIcon(file)}
                          {file.fileName} ({fileUtils.formatFileSize(file.fileSize)})
                        </button>
                      )}
                    </div>
                    <button className="downloadButton" onClick={() => handleDownload(file)} >
                      <i className="bi bi-download"></i> 다운로드
                    </button>
                  </div>
                ))
              ) : (
                <div className='noAttachItem'>첨부파일 없음</div>
              )}
            </div>
          </div>
          <div className='boardBottomBtnWrap'>
            <button className="btn btnSecondary" onClick={() => navigate('/mobile/MobileCarNotice')} >
              뒤로 가기
            </button>
          </div>
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
      </div>
  );
};

export default MobileCarNoticeView;