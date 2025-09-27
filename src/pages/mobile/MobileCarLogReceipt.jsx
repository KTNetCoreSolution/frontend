import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import fileUtils from '../../utils/fileUtils.js';
import JSZip from 'jszip';
import { fetchData, fetchFileUpload } from "../../utils/dataUtils.js";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import styles from './MobileCarLogReceipt.module.css';
import api from '../../utils/api.js';

const MobileCarLogReceipt = () => {
  const { state } = useLocation();
  const { user } = useStore();
  const { clearUser } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [vSaveBtnDisplay, setSaveBtnDisplay] = useState('none');
  const [imgUploadInfo, setImgUploadInfo] = useState({FILES: [] });
  const [gubun, setGubun] = useState('');
  const [receiptList, setReceiptList] = useState([]);
  const [receiptInfo, setReceiptInfo] = useState({LOGDATE: '', LOGTIME: '', CARID: '', EMPNO: ''});
  const saveBtnDisplayRef = useRef(vSaveBtnDisplay);
  const receiptInfoRef = useRef(receiptInfo);

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

  useEffect(() => {
    saveBtnDisplayRef.current = vSaveBtnDisplay;
  }, [vSaveBtnDisplay]);

  useEffect(() => {
    receiptInfoRef.current = receiptInfo;
  }, [receiptInfo]);

  const initializeComponent = () => {
    const pGubun = state?.gubun || '';
    const pLogdate = state?.logDate || '';
    const pLogtime = state?.logTime || '';
    const pCarid = state?.carId || '';
    const pEmpNo = state?.empNo || '';

    setGubun(pGubun);
    
    if(user?.empNo === pEmpNo) {
      setSaveBtnDisplay('block');
    } else {
      setSaveBtnDisplay('none');
    }

    if (pLogdate === '' || pLogtime === '' || pCarid === '') {
      errorMsgPopup("잘못된 접근입니다.");
      navigate(-1);
      return;
    }     

    setReceiptInfo({LOGDATE: pLogdate, LOGTIME: pLogtime, CARID: pCarid, EMPNO: pEmpNo});
    // Component에 들어갈 데이터 로딩
  }
    
  const getReceiptInfo = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const params = {pLOGDATE: receiptInfoRef.current.LOGDATE, pLOGSTTIME: receiptInfoRef.current.LOGTIME, pCARID: receiptInfoRef.current.CARID, pDEBUG: "F" };
      const response = await fetchData('carlog/carLogReceiptInfo', params);

      if (!response.success) {
        throw new Error(response.errMsg || '주차장 영수증 조회 중 오류가 발생했습니다.');
      } else {
        if (response.data.length > 0) {
          if (response.data[0].errCd && (response.errMsg !== '' || response.data[0].errCd !== '00')) {
            let errMsg = response.errMsg;
            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
            errorMsgPopup(errMsg);
          } else {
            const imgList = [];

            response.data.forEach((item, index) => {
              const extension = fileUtils.getFileExtension(item.IMGNM)?.toLowerCase();
              const mimeType = fileUtils.mimeTypes[extension] || 'application/octet-stream';
              const fileData = item.IMGDATA;
              const dataUrl = `data:${mimeType};base64,${fileData}`

              imgList.push({SEQ: item.SEQ, IMGNM: item.IMGNM, IMGDATA: item.IMGDATA, SRC: dataUrl});
            });

            setReceiptList(imgList);
          }
        } else {          
            setReceiptList([]);
            
            if(saveBtnDisplayRef.current === 'none' ) {
              alert('등록된 주차장 영수증이 없습니다.');
              navigate(-1);
              return;
            }
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '주차장 영수증 조회 중 오류가 발생했습니다.');
    }
  };
  
  useEffect(() => {
    initializeComponent();
    getReceiptInfo();
  }, []);
    
  const handleUpload = async () => {
    if (!receiptInfo.LOGDATE || receiptInfo.LOGDATE === '' || !receiptInfo.LOGTIME || receiptInfo.LOGTIME === '' || !receiptInfo.CARID || receiptInfo.CARID === '') {
      errorMsgPopup("잘못된 접근입니다.");
      return;
    } else if (!confirm("영수증을 등록하시겠습니까?")) {
      return;
    } else if (!imgUploadInfo.FILES.length) {
      errorMsgPopup("이미지를 선택해 주세요.");
      return;
    } 
    const formData = new FormData();
    formData.append("LOGDATE", receiptInfo.LOGDATE);
    formData.append("LOGSTTIME", receiptInfo.LOGTIME);
    formData.append("CARID", receiptInfo.CARID);
    imgUploadInfo.FILES.forEach((file) => {
      formData.append("files", file);
    });
    try {
      const result = await fetchFileUpload("carlog/carReceiptUpload", formData);
      if (result.errCd !== "00") {
        errorMsgPopup(result.errMsg || "이미지 업로드 중 오류가 발생했습니다");
      }
      
      msgPopup("이미지 업로드를 성공했습니다.");
      getReceiptInfo();

    } catch (error) {
      errorMsgPopup("이미지 업로드 중 오류가 발생했습니다: " + error.message);
    }
  };

  const handleDownload = async (item) => {
    try {
      if (item) {
        const link = document.createElement('a');
        link.href = item.SRC;
        link.download = item.IMGNM;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        errorMsgPopup('파일을 다운로드할 수 없습니다.');
        return;
      }
    } catch (error) {
      console.error('Error fetching file for download:', error);
      errorMsgPopup('파일 다운로드 중 오류가 발생했습니다.');
      return;
    }
  };

  const handleDownloadAll = async () => {
    if (receiptList.length === 0) {
      errorMsgPopup('다운로드할 파일이 없습니다.');
      return;
    }
    
    const zip = new JSZip();

    try {
      receiptList.forEach(item => {
        zip.file(item.IMGNM, item.SRC);
      });
      
      const zipFileNm = receiptInfo.LOGDATE + ' ' + receiptInfo.LOGTIME + ' ' + receiptInfo.CARID + '.zip';
      zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, zipFileNm);
    });
    } catch (error) {
      console.error('이미지 추가 중 오류:', error);
    }
  };

  const handleImgDelete = async (item) => {
    if(confirm("주차장 영수증을 삭제 하시겠습니까?")) {
      try {
        const params = {pLOGDATE: receiptInfo.LOGDATE, pLOGSTTIME: receiptInfo.LOGTIME, pCARID: receiptInfo.CARID, pSEQ: item.SEQ};

        const response = await fetchData('carlog/carLogReceiptDel', params);

        if (!response.success) {
          throw new Error(response.errMsg || '주차장 영수증 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;

            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

            errorMsgPopup(errMsg);
          } else {
            msgPopup(item.IMGNM + '이 삭제 되었습니다.');
            getReceiptInfo();
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || '주차장 영수증 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
      } 
    }
  };  

  const handleReturnPage = () => {
    if(gubun === 'U') {
      navigate(-1);
    } else {
      navigate('/mobile/MobileDrivingLog');
    }
  };

  return (
      <div className="container-fluid p-0">
        <header className="header">
          <h1 className="h5 mb-0">주차장 영수증</h1>
          <button className="btn text-white" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>        
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
          <div style={{display: 'flex', marginTop:-5 + 'px', marginBottom:10 + 'px', marginRight:4 + 'px', justifyContent: 'flex-end'}}> 
            <button className="btn btn-secondary" style={{width: '80px'}} onClick={handleReturnPage}>{state?.gubun === 'U' ? '돌아가기' : '닫기' }</button>
          </div>
          <div className="d-flex flex-column gap-3" style={{display: `${vSaveBtnDisplay}`}}>
              <input type="file" className={`form-control ${styles.formControl}`} accept="image/*" multiple
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || []);
                  setImgUploadInfo({ FILES: selectedFiles });
                }}/>
              <div>
                <button className="btn btn-primary w-100" onClick={(e) => handleUpload(e)}>영수증 등록</button>
              </div>
          <div className="d-flex justify-content-end" style={{display: receiptList.length > 0 ? 'block' : 'none'}} >
            <button className="btn btn-outline-primary w-100" onClick={handleDownloadAll}>전체 다운로드</button>
          </div>
          <div style={{display: receiptList.length > 0 ? 'block' : 'none'}} >
            {receiptList.map((item, index) => 
            <div key={`imgDiv` + index}>
              <div className="d-flex align-items-center justify-content-between">
                <span className="flex-shrink-0 formImgNm">{item.IMGNM}</span>
                <div className="btnWrap">
                  <button className="btn btn-outline-secondary gap-1" onClick={() => handleDownload(item)}>
                    <i className="bi bi-download"></i> <span>다운로드</span>
                  </button>
                  <button className="btn btn-outline-secondary" style={{display: `${vSaveBtnDisplay}`}} onClick={() => handleImgDelete(item)}>
                    <i className="bi"></i> 삭제
                  </button>
                </div>
              </div>
              <img src={item.SRC} className={styles.receiptImage} />
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileCarLogReceipt;