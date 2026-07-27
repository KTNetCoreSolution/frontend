import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import { fetchData } from '../../utils/dataUtils';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styles from './ReportPopup.module.css';
import { hasPermission } from '../../utils/authUtils';
import useStore from '../../store/store';
import fileUtils from '../../utils/fileUtils';
import styles2 from './ReportPopup.module.css';

const ReportViewPopup = ({ show, onHide, reportTitle, report, onEdit }) => {
  const { user } = useStore();
  const hasReportOper = hasPermission(user?.auth, 'reportOper');
  const regEmpNo = report?.REGEMPNO;
  const isOwner = !!regEmpNo && !!user?.empNo && String(user.empNo) === String(regEmpNo);
  const canWriteReport = hasReportOper || isOwner;
  //const canWriteReport = user;// && hasPermission(user.auth, 'mainBoard');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [reportDetails, setReportDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReportDetails = async () => {
      if (!show || !report.REPORTID || !report.REPORTNO) return;
      setLoading(true);
      try {
        const param = {
          reportId: String(report.REPORTID),
          reportNo: String(report.REPORTNO),
          debug: 'F',
        }
        const result = await fetchData('report/detailInfo', param);
        
        if (result.errCd === '00' && result.data.length > 0) {
          const detail = {
            REPORTID: result.data[0].REPORTID,
            REPORTNO: result.data[0].REPORTNO,
            TITLE: result.data[0].TITLE,
            CONTENTS: result.data[0].CONTENTS || '',
            REGDT: result.data[0].REGDT,
            REGEMPNO: result.data[0].REGEMPNO,
            EMPNM: result.data[0].EMPNM,
          };
          setReportDetails(detail);
          setTitle(detail.TITLE);
          setContent(detail.CONTENTS);
        } else {
          errorMsgPopup('성과 Report 상세 정보를 불러오지 못했습니다.');
        }
      } catch (error) {
        console.error('Error fetching notice details:', error);
        errorMsgPopup('성과 Report 상세 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    const fetchFiles = async () => {
      if (!show || !report.REPORTID || !report.REPORTNO) return;
      try {
        const param = {
          gubun: 'LIST',
          reportId: String(report.REPORTID),
          reportNo: String(report.REPORTNO),
          fileId: '',
          debug: 'F',
        }
        const result = await fetchData('report/reportFileList', param);

        if (result.errCd === '00') {
          const mappedFiles = result.data.map((file) => ({
            fileId: file.FILEID,
            reportId: file.REPORTID,
            reportNo: file.REPORTNO,
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

    fetchReportDetails();
    fetchFiles();
  }, [show, report]);

  const handleDownload = async (file) => {
    try {
      const param = {
        gubun: 'DATA',
        reportId: String(report.REPORTID),
        reportNo: String(report.REPORTNO),
        fileId: file.fileId,
        debug: 'F',
      }

      const result = await fetchData('report/reportFileList', param);
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
  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles2.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          {reportTitle} 상세
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {loading ? (
          <div>로딩 중...</div>
        ) : (
          <div className='boardWrap'>
            <div>
              <label className='form-label'>작성일</label>
              <input
                className={`form-control ${styles.formControl}`}
                value={reportDetails?.REGDT || ''}
                readOnly
              />
            </div>
            <div>
              <label className='form-label'>작성자</label>
              <input
                className={`form-control ${styles.formControl}`}
                value={reportDetails?.EMPNM || ''}
                readOnly
              />
            </div>
            <div>
              <label className='form-label'>제목</label>
              <input
                className={`form-control ${styles.formControl}`}
                value={title}
                readOnly
              />
            </div>
            <div>
              <label className='form-label'>내용</label>
              <textarea
                className={`form-control ${styles.formControl} ${styles.textarea}`}
                rows='8'
                value={content}
                readOnly
              />
            </div>
            <div>
              <div className='attachLabelWrap'>
                <label className='form-label'>
                  <span>첨부파일</span>
                </label>
                {files.length > 0 && (
                  <button
                    className='downloadButton'
                    onClick={handleDownloadAll}
                  >
                    전체 다운로드
                  </button>
                )}
              </div>
              {files?.length > 0 ? (
                files.map((file, index) => (
                  <div key={index} className='attachItem'>
                    <div className='imageFile'>
                      {<button className='txtBtn'>
                          {getFileIcon(file)}
                          {file.fileName} ({fileUtils.formatFileSize(file.fileSize)})
                        </button>}
                    </div>
                    <button
                      className='downloadButton'
                      onClick={() => handleDownload(file)}
                    >
                      <i className='bi bi-download'></i> 다운로드
                    </button>
                  </div>
                ))
              ) : (
                <div className='noAttachItem'>첨부파일 없음</div>
              )}
            </div>
            <div className='boardBottomBtnWrap'>
              <button
                className='btn btnSecondary'
                onClick={onHide}
              >
                닫기
              </button>
              {canWriteReport && (
                <button
                  className='btn btnPrimary'
                  onClick={() => onEdit(reportDetails, files)}
                >
                  변경 가기
                </button>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ReportViewPopup;