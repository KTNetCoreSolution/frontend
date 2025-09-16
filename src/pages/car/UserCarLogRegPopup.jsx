import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/store';
import commonUtils from '../../utils/common';
import fileUtils from '../../utils/fileUtils';
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import CommonPopup from '../../components/popup/CommonPopup.jsx';
import Modal from 'react-bootstrap/Modal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './UserCarLogRegPopup.Module.css'; // CSS 파일을 별도로 import

const UserCarLogRegPopup = ({ show, onHide, onParentSearch, data }) => {
  const todayDate = commonUtils.getTodayDate();
  const timeOption = (stdTime, gbn) => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (timeString >= stdTime) {
          if(gbn === 'S' && timeString >= stdTime) {
            times.push(timeString);
          }
          else if (gbn === 'E' && timeString > stdTime) {
            times.push(timeString);
          }
        }
      }
    }
    return times;
  };

  const { user } = useStore();
  const [carId, setCarId] = useState('');
  const [carList, setCarList] = useState({});
  const [carInfo, setCarInfo] = useState({CARNM: '', MANAGER_EMPNM: '', MANAGER_MOBILE: '', GARAGE_ADDR: '', STKM: 0, src: null, bookMark: false, ORGCD: ''});
  const [logInfo, setLogInfo] = useState({CARID: '', LOGDATE: todayDate, LOGSTTIME: '00:00', LOGENTIME: '00:30', SAFETYNOTE: '', STKM: 0, ENKM: 0, FUEL: 0, EMPNO: ''});
  const [lastLogInfo, setLastLogInfo] = useState({LOGDATE: '', LOGSTTIME: '', LOGENTIME: ''});
  const [vImgDisplay, setImgDisplay] = useState('none');
  const [vDisplay, setDisplay] = useState('false');
  const [vSaveBtnDisplay, setSaveBtnDisplay] = useState('block');
  const [vDelBtnDisplay, setDelBtnDisplay] = useState('none');
  const [vRejectBtnDisplay, setRejectBtnDisplay] = useState('none');
  const [isFilled, setIsFilled] = useState(false);
  const [isDamage, setIsDamage] = useState(true);
  const [isOilLeak, setIsOilLeak] = useState(true);
  const [isTire, setIsTire] = useState(true);
  const [isLuggage, setIsLuggage] = useState(true);
  const [isEtc1, setIsEtc1] = useState(true);
  const [isEtc2, setIsEtc2] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [imgUploadInfo, setImgUploadInfo] = useState({FILES: [] });
  const [receiptList, setReceiptList] = useState([]);
  const [stTime , setStTime] = useState([]);
  const [enTime , setEnTime] = useState([]);
  const logDateRef = useRef(null);
  
  const initializeComponent = async () => {
    // Component에 들어갈 데이터 로딩
    try {
      const params = { pEMPNO: user?.empNo, pDEBUG: "F" };
      const response = await fetchData('carlog/userCarList', params);

      if (!response.success) {
        throw new Error(response.errMsg || '차량목록 조회 중 오류가 발생했습니다.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;
          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          errorMsgPopup(errMsg);
        } else {
          setCarList(response.data);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량목록 조회 중 오류가 발생했습니다.');
    }
  };
  
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    initializeComponent();
    //return () => {
    //};
  }, []);
  

  const getCarLogInfo = async () => {
    setCarId(data.CARID);

    try {
      const params = { pLOGDATE: data.LOGDATE, pLOGSTTIME: data.LOGSTTIME, pCARID: data.CARID, pEMPNO: user?.empNo, pDEBUG: "F" };
      const response = await fetchData('carlog/logDetail', params);

      if (!response.success) {
        throw new Error(response.errMsg || '운행일지 상세정보 중 오류가 발생했습니다.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;
          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          errorMsgPopup(errMsg);
        } else {
          const extension = fileUtils.getFileExtension(response.data[0].IMGNM)?.toLowerCase();
          const mimeType = fileUtils.mimeTypes[extension] || 'application/octet-stream';
          const fileData = response.data[0].IMGDATA;

          const dataUrl = `data:${mimeType};base64,${fileData}`;
          const logEnTime = response.data[0].LOGENTIME;
          const carNm = response.data[0].CARNM;
          const managerEmpNm = response.data[0].PRIMARY_MANAGER_EMPNM;
          const managerMobile = response.data[0].PRIMARY_MANAGER_MOBILE;
          const garageAddr = response.data[0].PRIMARY_GARAGE_ADDR;
          const safetyNote = response.data[0].SAFETYNOTE;
          const stKm = response.data[0].STKM;
          const enKm = response.data[0].ENKM;
          const fuel = response.data[0].FUEL;
          const note = response.data[0].NOTE;
          const empNo = response.data[0].EMPNO;
          const orgCd = response.data[0].ORGCD;
          
          const bBookMark = response.data[0].BOOKMARK === 'Y' ? true : false;
          const bDamage = response.data[0].DAMAGE === 'Y' ? true : false;
          const bOilLeak = response.data[0].OILLEAK === 'Y' ? true : false;
          const bTire = response.data[0].TIRE === 'Y' ? true : false;
          const bLuggage = response.data[0].LUGGAGE === 'Y' ? true : false;
          const bEtc1 = response.data[0].ETC1 === 'Y' ? true : false;
          const bEtc2 = response.data[0].ETC2 === 'Y' ? true : false;
          const saveBtnDisplay = empNo === user?.empNo ? 'block' : 'none';
          const delBtnDisplay = (response.data[0].DELYN === 'Y' && empNo === user?.empNo) ? 'block' : 'none';
          const reJectBtnDisplay = (response.data[0].LOGSTAT === 'R' && orgCd === user?.orgCd && '41' === user?.levelCd) ? 'block' : 'none';
          
          setStTime(timeOption(data.LOGSTTIME, 'S'));
          setEnTime(timeOption(data.LOGSTTIME, 'E'));
          setCarInfo({CARNM: carNm, MANAGER_EMPNM: managerEmpNm, MANAGER_MOBILE: managerMobile, GARAGE_ADDR: garageAddr, STKM: 0, src: dataUrl, bookMark: bBookMark, ORGCD: orgCd});
          setLogInfo({GUBUN:'U', CARID: data.CARID, LOGDATE: data.LOGDATE, LOGSTTIME: data.LOGSTTIME, LOGENTIME: logEnTime, SAFETYNOTE: safetyNote, STKM: stKm, ENKM: enKm, FUEL: fuel, NOTE: note, EMPNO: empNo});
          setIsDamage(bDamage);
          setIsOilLeak(bOilLeak);
          setIsTire(bTire);
          setIsLuggage(bLuggage);
          setIsEtc1(bEtc1);
          setIsEtc2(bEtc2);
          setIsFilled(bBookMark);
          setImgDisplay('flex');
          setSaveBtnDisplay(saveBtnDisplay);
          setDelBtnDisplay(delBtnDisplay);
          setRejectBtnDisplay(reJectBtnDisplay);
        }
      }
    } catch (error) {
      setCarId('');
      initializing();
      setImgDisplay('none');
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 상세정보 중 오류가 발생했습니다.');
    }
  };
    
  useEffect(() => {
    setCarId('');
    initializing();
    setImgDisplay('none');

    if(show) {
      initializeComponent();

      if (data.CARID && data.CARID !== '') {
        getCarLogInfo();
      } else {
        setStTime(timeOption('09:00', 'S'));
        setEnTime(timeOption('09:00', 'E'));
      }
    }
  }, [show]);

  const initializing = () => {
    setCarInfo({CARNM: '', MANAGER_EMPNM: '', MANAGER_MOBILE: '', GARAGE_ADDR: '', STKM: 0, src: null, bookMark: false, ORGCD: ''});
    setLogInfo({GUBUN:'I', CARID: '', LOGDATE: todayDate, LOGSTTIME: '00:00', LOGENTIME: '00:30', SAFETYNOTE: '', STKM: 0, ENKM: 0, FUEL: 0, NOTE: '', EMPNO: ''});
    setLastLogInfo({LOGDATE: '', LOGSTTIME: '', LOGENTIME: ''});
    setIsFilled(false);
    setIsDamage(true);
    setIsOilLeak(true);
    setIsTire(true);
    setIsLuggage(true);
    setIsEtc1(true);
    setIsEtc2(true);
    setDisplay(false);
    setImgDisplay('none');
    setImgUploadInfo({ FILES: [] });
    setReceiptList([]);
    setSaveBtnDisplay('block');
    setDelBtnDisplay('none');
    setRejectBtnDisplay('none');
  };
  
  const searchCarInfo = async (e) => {
    e.preventDefault();  

    try {
      setCarId(e.target.value);
      initializing();
      
      if (e.target.value !== '') {
        const params = { pEMPNO: user?.empNo, pCARID: e.target.value, pDEBUG: "F" };
        const response = await fetchData('carlog/carInfo', params);

        if (!response.success) {
          throw new Error(response.errMsg || '차량 조회 중 오류가 발생했습니다.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;
            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
            errorMsgPopup(errMsg);
          } else {
            const extension = fileUtils.getFileExtension(response.data[0].IMGNM)?.toLowerCase();
            const mimeType = fileUtils.mimeTypes[extension] || 'application/octet-stream';
            const fileData = response.data[0].IMGDATA;
            const logDate = response.data[0].LOGDATE <= todayDate ? todayDate : response.data[0].LOGDATE;            
            const logStTime = response.data[0].LOGDATE === todayDate ? response.data[0].LOGENTIME : '09:00';
            setStTime(timeOption(logStTime, 'S'));

            const carNm = response.data[0].CARNM;
            const managerEmpNm = response.data[0].PRIMARY_MANAGER_EMPNM;
            const managerMobile = response.data[0].PRIMARY_MANAGER_MOBILE;
            const garageAddr = response.data[0].PRIMARY_GARAGE_ADDR;
            const stKm = response.data[0].STKM;
            const orgCd = response.data[0].ORGCD;

            const dataUrl = `data:${mimeType};base64,${fileData}`;
            const bBookMark = response.data[0].BOOKMARK === 'Y' ? true : false;
            setEnTime(timeOption(logStTime, 'E'));

            let logEnTime = '09:00';
            timeOption(logInfo.LOGSTTIME, 'E').some(time => {
              if (time > logStTime) {
                logEnTime = time; 
                return true;
              }
            });

            setCarInfo({CARNM: carNm, MANAGER_EMPNM: managerEmpNm, MANAGER_MOBILE: managerMobile, GARAGE_ADDR: garageAddr, STKM: stKm, src: dataUrl, bookMark: bBookMark, DELYN: 'N', LOGSTAT: '', ORGCD: orgCd});
            setLogInfo({GUBUN:'I', CARID: e.target.value, LOGDATE: logDate, LOGSTTIME: logStTime, LOGENTIME: logEnTime, SAFETYNOTE: '', STKM: stKm, ENKM: 0, FUEL: 0, NOTE: '', EMPNO: ''});
            setLastLogInfo({LOGDATE: response.data[0].LOGDATE, LOGSTTIME: response.data[0].LOGDATE, LOGENTIME: response.data[0].LOGENTIME});

            setIsDamage(true);
            setIsOilLeak(true);
            setIsTire(true);
            setIsLuggage(true);
            setIsEtc1(true);
            setIsEtc2(true);
            setIsFilled(bBookMark);
            setImgDisplay('flex');
            setSaveBtnDisplay('block');
            setDelBtnDisplay('none');
            setRejectBtnDisplay('none');
          }
        }
      }
    } catch (error) {
      setCarId('');
      initializing();
      setImgDisplay('none');
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량 조회 중 오류가 발생했습니다.');
    }
  };
  
  const handleBookMark = async (e) => {
    e.preventDefault();  

    try{
      const gubun = !isFilled ? 'I' : 'D';
      const params = {pGUBUN: gubun, pEMPNO: user?.empNo, pCARID: carId};
      
      const response = await fetchData('carlog/carBookMarkTransaction', params);

      if (!response.success) {
        throw new Error(response.errMsg || '차량 즐겨찾기 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          setIsFilled(!isFilled);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량 즐겨찾기 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleSafetyCheck = (target, bResult) => {    
    
    if (logInfo.GUBUN === 'I') {
      if (target === 'Damage') {
        setIsDamage(bResult);
      } else if (target === 'OilLeak') {
        setIsOilLeak(bResult);
      } else if (target === 'Tire') {
        setIsTire(bResult);
      } else if (target === 'Luggage') {
        setIsLuggage(bResult);
      } else if (target === 'Etc1') {
        setIsEtc1(bResult);
      } else if (target === 'Etc2') {
        setIsEtc2(bResult);
      }
    }
  };

  const handleLogDate = (e) => {
    let logStTime = '09:00';
    
    if(e.target.value < lastLogInfo.LOGDATE) {
      logDateRef.current.value = lastLogInfo.LOGDATE;
      setLogInfo({ ...logInfo, LOGDATE: lastLogInfo.LOGDATE });
      logStTime = lastLogInfo.LOGENTIME;
    }
    else {
      setLogInfo({ ...logInfo, LOGDATE: e.target.value });      
      logStTime = lastLogInfo.LOGDATE >= e.target.value ? lastLogInfo.LOGENTIME : '09:00';
    }

    setStTime(timeOption(logStTime, 'S'));   
    setEnTime(timeOption(logStTime, 'E'));

    let logEnTime = '09:00';
    timeOption(logInfo.LOGSTTIME, 'E').some(time => {
      if (time > logStTime) {
        logEnTime = time; 
        return true;
      }
    });
  };
    
  const validateForm = () => {
    if (!logInfo.CARID || logInfo.CARID === '') {
      return "잘못된 접근입니다.";
    }

    if(!logInfo.LOGDATE || logInfo.LOGDATE === '') {
      return "운행일를 선택해주세요.";
    }

    if(logInfo.LOGENTIME <= logInfo.LOGSTTIME) {
      return "운행종료 시간이 운행시작 시간보다 커야 합니다.";
    }
  
    if (!isDamage || !isOilLeak || !isTire || !isLuggage || !isEtc1 || !isEtc2) {
      if (!logInfo.SAFETYNOTE || logInfo.SAFETYNOTE === '') {
        return "차량 불량사항이 있는 경우 점검 특이사항을 입력해주세요.";
      }
    }

    if(!logInfo.ENKM || logInfo.ENKM === 0) {
      return "종료km를 입력해주세요.";
    }

    if(logInfo.ENKM <= logInfo.STKM) {
      return "종료km는 시작km보다 커야 합니다.";
    }

    const noticeValidation = commonUtils.validateVarcharLength(logInfo.SAFETYNOTE, 1500, '점검특이사항');
    if (!noticeValidation.valid) return noticeValidation.error;

    const notice2Validation = commonUtils.validateVarcharLength(logInfo.NOTE, 1000, '비고');
    if (!notice2Validation.valid) return notice2Validation.error;

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {    
      const validationError = validateForm();
  
      if (validationError) {
        errorMsgPopup(validationError);
        return;
      }

      const Damage = isDamage ? 'Y' : 'N';
      const OilLeak = isOilLeak ? 'Y' : 'N';
      const Tire = isTire ? 'Y' : 'N';
      const Luggage = isLuggage ? 'Y' : 'N';
      const Etc1 = isEtc1 ? 'Y' : 'N';
      const Etc2 = isEtc2 ? 'Y' : 'N';

      const params = {pCARID: logInfo.CARID, pEMPNO: user?.empNo, pLOGDATE: logInfo.LOGDATE, pLOGSTTIME: logInfo.LOGSTTIME, pLOGENTIME: logInfo.LOGENTIME, pSTKM: logInfo.STKM, pENKM: logInfo.ENKM, pFUEL: logInfo.FUEL, pNOTE: logInfo.NOTE
                    , pDAMAGE: Damage, pOILLEAK: OilLeak, pTIRE: Tire, pLUGGAGE: Luggage, pETC1: Etc1, pETC2: Etc2, pSAFETYNOTE: logInfo.SAFETYNOTE};

      const response = await fetchData('carlog/carLogTransaction', params);

      if (!response.success) {
        throw new Error(response.errMsg || '운행일지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("운행일지가 저장되었습니다.");
          onHide();
          onParentSearch();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } 
  };

  const handleReject = async (e) => {
    e.preventDefault();

    if(!confirm('운행일지를 반려 하시겠습니까?')) {
      return;
    }
    try {    
      const params = { pLOGDATE: logInfo.LOGDATE, pLOGSTTIME: logInfo.LOGSTTIME, pCARID: logInfo.CARID, pLOGSTAT: 'N', pTRTEMPNO: user?.empNo };

      const response = await fetchData("carlog/logConfirmTransaction", params );

      if (!response.success) {
        throw new Error(response.errMsg || '운행일지 반려 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("운행일지가 반려되었습니다.");
          onHide();
          onParentSearch();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 반려 중 오류가 발생했습니다. 다시 시도해주세요.');
    } 
  };

  const handleDelete = async(e) => {
    e.preventDefault();

    if(confirm("운행일지를 삭제하시겠습니까?")) {
      try {
        const params = {pLOGDATE: logInfo.LOGDATE, pLOGSTTIME: logInfo.LOGSTTIME, pCARID: logInfo.CARID};

        const response = await fetchData('carlog/carLogDel', params);

        if (!response.success) {
          throw new Error(response.errMsg || '운행일지 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;

            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

            errorMsgPopup(errMsg);
          } else {
            msgPopup('운행일지가 삭제 되었습니다.');
            onHide();
            onParentSearch();
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || '운행일지 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
      } 
    }
  };

  const handleMaxLength = (e, maxlength) => {
    const value = e.target.value;    
    e.target.value = value.substring(0, maxlength);
  }
    
  const handleUpload = async () => {
    if (!logInfo.LOGDATE || logInfo.LOGDATE === '' || !logInfo.LOGSTTIME || logInfo.LOGSTTIME === '' || !logInfo.CARID || logInfo.CARID === '') {
      return "잘못된 접근입니다.";
    }
    else if (!imgUploadInfo.FILES.length) {
      return { error: "이미지를 선택해 주세요." };
    }
    const formData = new FormData();
    formData.append("LOGDATE", logInfo.LOGDATE);
    formData.append("LOGSTTIME", logInfo.LOGSTTIME);
    formData.append("CARID", logInfo.CARID);
    imgUploadInfo.FILES.forEach((file) => {
      formData.append("files", file);
    });
    try {
      const result = await fetchFileUpload("carlog/carReceiptUpload", formData);
      if (result.errCd !== "00") {
        return { error: result.errMsg || "이미지 업로드 실패" };
      }
      setShowAddPopup(false);
      setImgUploadInfo({ FILES: [] });
      msgPopup("이미지 업로드를 성공했습니다.");
      await handleSearch();

      return { success: "이미지 업로드를 성공했습니다." };
    } catch (error) {
      return { error: "이미지 업로드 중 오류가 발생했습니다: " + error.message };
    }
  };
    
  const handleUploadCancel = () => {
    setShowAddPopup(false);
    setImgUploadInfo({ FILES: [] });
  };

  const carLogReceiptPopup = () => {
    setShowAddPopup(true);
    handleReceiptSearch();
  };

  const handleReceiptSearch = async () => {
    if (!logInfo.LOGDATE || logInfo.LOGDATE === '' || !logInfo.LOGSTTIME || logInfo.LOGSTTIME === '' || !logInfo.CARID || logInfo.CARID === '') {
      return "잘못된 접근입니다.";
    }

    try {
      const params = {pLOGDATE: logInfo.LOGDATE, pLOGSTTIME: logInfo.LOGSTTIME, pCARID: logInfo.CARID, pDEBUG: "F" };
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
            if(vSaveBtnDisplay === 'none' ) {
              msgPopup('등록된 주차장 영수증이 없습니다.');
              handleUploadCancel();       
            }
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '주차장 영수증 조회 중 오류가 발생했습니다.');
    }
  }

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
      }
    } catch (error) {
      console.error('Error fetching file for download:', error);
      errorMsgPopup('파일 다운로드 중 오류가 발생했습니다.');
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
      
      const zipFileNm = logInfo.LOGDATE + ' ' + logInfo.LOGSTTIME + ' ' + logInfo.EMPNO + '.zip';
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
        const params = {pLOGDATE: logInfo.LOGDATE, pLOGSTTIME: logInfo.LOGSTTIME, pCARID: logInfo.CARID, pSEQ: item.SEQ};

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
            handleReceiptSearch();
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || '주차장 영수증 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
      } 
    }
  };  

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} onParentSearch={onParentSearch} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>운행일지 관리</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className='flex-column justify-content-start gap-2' style={{display: `${vDisplay ? 'none' : 'flex'}`}}>
          <div className='d-flex align-items-center'>
            <label className="form-label flex-shrink-0" htmlFor="carId" style={{width:'63px'}}>차량</label>
            <select id="carId" className={`form-select ${styles.formSelect}`} defaultValue={data.CARID} style={{width:200 +'px'}} disabled={logInfo.GUBUN === 'I' ? '' : 'disabled'} onChange={(e) => {searchCarInfo(e)}}>
              <option value="">선택하세요</option>
              {carList.map((item) => <option key={item.CARID} value={item.CARID}>{item.CARNO}</option>)}
            </select>
            <button className={`btn btn-sm btn-danger flex-shrink-0 ms-auto`} style={{width:60 +'px', display:`${vDelBtnDisplay}`}} onClick={handleDelete}>삭제</button>
          </div>
          <div className='my-3' style={{minHeight: '245px'}}>
            <div className='d-flex flex-column gap-2'>
              <div className='d-flex justify-content-center gap-2'>
                <label>{carInfo.CARNM}</label>
                <div className={`${styles.starBorder}`} style={{display: `${vImgDisplay}`}}>
                  <button onClick={(e) => {handleBookMark(e)}} className={`${styles.star} ${isFilled ? styles.filled : ''}`}  />
                </div>
              </div>
              <img src={carInfo.src} className={styles.carImage} />
            </div>
          </div>
          <div className='d-flex'>
            <label className='form-label' style={{width:'63px'}}>차고지</label>
            <div>{carInfo.GARAGE_ADDR}</div>
          </div>
          <div className='d-flex'>
            <label className='form-label' style={{width:'63px'}}>운전자(정)</label>
            <div>{carInfo.MANAGER_EMPNM}</div>
          </div>
          <div className='d-flex'>
            <label className='form-label' style={{width:'63px'}}>연락처</label>
            <div>{carInfo.MANAGER_MOBILE}</div>
          </div>
          <div className='d-flex'>
            <label className='form-label' style={{width:'63px'}}>운행일시</label>
            <div className='d-flex gap-1'>
              <input type="date" ref={logDateRef} id="logDate" className={`form-control ${styles.formControl}`} value={logInfo.LOGDATE} disabled={logInfo.GUBUN === 'I' ? '' : 'disabled'} style={{width:120 +'px', marginRight:5 + 'px'}} onChange={(e) => {handleLogDate(e)}} />
              <select id="stTime" className={`form-select ${styles.formSelect}`} style={{width: 80 +'px'}} defaultValue={logInfo.LOGSTTIME} disabled={logInfo.GUBUN === 'I' ? '' : 'disabled'} onChange={(e) => {setLogInfo({ ...logInfo, LOGSTTIME: e.target.value })}}>
                {stTime.map((time, index) => <option key={index} value={time}>{time}</option>)}
              </select>
              <label> ~ </label>
              <select id="enTime" className={`form-select ${styles.formSelect}`} style={{width: 80 +'px'}} defaultValue={logInfo.LOGENTIME}  disabled={logInfo.GUBUN === 'I' ? '' : 'disabled'} onChange={(e) => {setLogInfo({ ...logInfo, LOGENTIME: e.target.value })}}>
                {enTime.map((time, index) => <option key={index} value={time}>{time}</option>)}
              </select>
            </div>
          </div>
          <div className='mt-3'>
              <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{ backgroundColor:vImgDisplay === 'flex' ? '#00c4b4' : '#909090'}} disabled={vImgDisplay === 'flex' ? '' : 'disabled'} onClick={(e) => setDisplay(!vDisplay)}>차량점검 및 {logInfo.GUBUN === 'I' ? '일지작성' : '운행결과'}</button>
          </div>
        </div>
        <div className='flex-column gap-2' style={{display: `${vDisplay ? 'flex' : 'none'}`}}>
          <div className="mb-2 d-flex">
            <label className="form-label" style={{fontWeight:'bold'}}>점검항목</label>
            <button className={`btn ${styles.btnCheck} ${styles.btn} ${styles.btnReturn}`} onClick={(e) => setDisplay(!vDisplay)}>이전</button>
          </div>
          <div className="row">
            <div className="col d-flex">
              <label className='form-label' style={{width:'100px'}}>차량파손</label>
              <div className='d-flex'>
                <label className={`${styles.safetyLabel} ${isDamage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Damage', !isDamage)}>{isDamage ? '양호' : '불량'}</label>
                <div className={`${styles.safetyBox} ${isDamage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Damage', !isDamage)}>
                    <div className={`${styles.safetyCheck} ${isDamage ? '' : styles.bad}`}></div>
                </div>
              </div>
            </div>
            <div className="col d-flex">
              <label className='form-label' style={{width:'100px'}}>오일누수</label>
              <div className='d-flex'>
                <label className={`${styles.safetyLabel} ${isOilLeak ? '' : styles.bad}`} onClick={() => handleSafetyCheck('OilLeak', !isOilLeak)}>{isOilLeak ? '양호' : '불량'}</label>
                <div className={`${styles.safetyBox} ${isOilLeak ? '' : styles.bad}`} onClick={() => handleSafetyCheck('OilLeak', !isOilLeak)}>
                    <div className={`${styles.safetyCheck} ${isOilLeak ? '' : styles.bad}`}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col d-flex">
              <label className='form-label' style={{width:'100px'}}>타이어</label>
              <div className='d-flex'>
                <label className={`${styles.safetyLabel} ${isTire ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Tire', !isTire)}>{isTire ? '양호' : '불량'}</label>
                <div className={`${styles.safetyBox} ${isTire ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Tire', !isTire)}>
                    <div className={`${styles.safetyCheck} ${isTire ? '' : styles.bad}`}></div>
                </div>
              </div>
            </div>
            <div className="col d-flex">
              <label className='form-label' style={{width:'100px'}}>적재물안전</label>
              <div className='d-flex'>
                <label className={`${styles.safetyLabel} ${isLuggage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Luggage', !isLuggage)}>{isLuggage ? '양호' : '불량'}</label>
                <div className={`${styles.safetyBox} ${isLuggage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Luggage', !isLuggage)}>
                    <div className={`${styles.safetyCheck} ${isLuggage ? '' : styles.bad}`}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col d-flex">
              <label className='form-label' style={{width:'100px'}}>기타(직접기재)</label>
                <div className='d-flex'>
                  <label className={`${styles.safetyLabel} ${isEtc1 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc1', !isEtc1)}>{isEtc1 ? '양호' : '불량'}</label>
                  <div className={`${styles.safetyBox} ${isEtc1 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc1', !isEtc1)}>
                      <div className={`${styles.safetyCheck} ${isEtc1 ? '' : styles.bad}`}></div>
                  </div>
              </div>
            </div>
            <div className="col d-flex">
              <label className='form-label' style={{width:'100px'}}>특이사항(직전)</label>
              <div className='d-flex'>
                <label className={`${styles.safetyLabel} ${isEtc2 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc2', !isEtc2)}>{isEtc2 ? '양호' : '불량'}</label>
                <div className={`${styles.safetyBox} ${isEtc2 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc2', !isEtc2)}>
                    <div className={`${styles.safetyCheck} ${isEtc2 ? '' : styles.bad}`}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-2">
            <textarea className={`${styles.formTextArea}`} rows="5" value={logInfo.SAFETYNOTE} maxLength={1500} placeholder="점검특이사항(차량불량사항이 있는 경우/특수문자 입력불가)" disabled={logInfo.GUBUN === 'I' ? '' : 'disabled'} onChange={(e) => {setLogInfo({ ...logInfo, SAFETYNOTE: e.target.value })}}  />
          </div>
        </div>
        <div className='flex-column gap-2' style={{display: `${vDisplay ? 'flex' : 'none'}`}}>
          <div className="d-flex">
            <label className='form-label' style={{width:'100px'}}>운행일시</label>
            <div className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`}>{logInfo.LOGDATE + ' ' + logInfo.LOGSTTIME + ' ~ ' + logInfo.LOGENTIME}</div>
          </div>
          <div className="d-flex">
            <label className='form-label' style={{width:'100px'}}>운행자</label>
            <div className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`}>{user?.empNm + ' (' + user?.empNo + ')'}</div>
          </div>
          <div className="d-flex">
            <label className='form-label' style={{width:'100px'}}>시작km</label>
            <input type="number" id="stKm" className={`form-control ${styles.formControl2}`} value={logInfo.STKM} disabled={logInfo.GUBUN === 'I' ? carInfo.STKM === 0 ? '' : 'disabled' : 'disabled'} style={{width:100 +'px'}} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, STKM: e.target.value })}} />
          </div>
          <div className="d-flex">
            <label className='form-label' style={{width:'100px'}}>종료km</label>
            <input type="number" id="stKm" className={`form-control ${styles.formControl2}`} disabled={logInfo.GUBUN === 'I' ? '' : 'disabled'} value={logInfo.ENKM} style={{width:100 +'px'}} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, ENKM: e.target.value })}} />
          </div>
          <div className="d-flex">
            <label className='form-label' style={{width:'100px'}}>주행거리</label>
            <div className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`}>{logInfo.ENKM - logInfo.STKM}</div>
          </div>
          <div className="d-flex">
            <label className='form-label' style={{width:'100px'}}>주유(ℓ)</label>
            <input type="number" id="stKm" className={`form-control ${styles.formControl2}`} value={logInfo.FUEL} style={{width:100 +'px'}} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, FUEL: e.target.value })}} />
          </div>
          <div className="d-flex">
            <label className='form-label' style={{width:'100px'}}>비고</label>
            <input type="text" id="notice" className={`form-control ${styles.formControl2}`} value={logInfo.NOTE} onInput={(e) => {handleMaxLength(e, 1000)}} onChange={(e) => {setLogInfo({ ...logInfo, NOTE: e.target.value })}} />
          </div>
          <div className="mb-2">
            <button className={`btn ${styles.btnCheck} ${styles.btn}`} onClick={(e) => carLogReceiptPopup()}>주차장 영수증첨부</button>
              <CommonPopup
                show={showAddPopup}
                onHide={handleUploadCancel}
                title="주차장 영수증"
                requiresConfirm={true} // Enable confirmation for "템플릿추가"
                confirmMessage="주차장 영수증을 추가하시겠습니까?" // Custom confirmation message                
                buttons={vSaveBtnDisplay === 'block' ? 
                  [ { label: "닫기", className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`, action: handleUploadCancel },
                    {
                      label: "영수증 추가",
                      className: `${styles.btn} ${styles.btnPrimary} btn text-bg-success`,
                      action: () => handleUpload().then((result) => ({ result, onSuccess: handleReceiptSearch })),
                    }
                  ] :
                  [ { label: "닫기", className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`, action: handleUploadCancel }]}
              >
                <div className="row" style={{display: `${vSaveBtnDisplay}`, width:450 + 'px'}}>
                  <div className="mb-3">
                    <label className="form-label">이미지</label>
                    <input
                      type="file"
                      className={`form-control ${styles.formControl}`}
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        setImgUploadInfo({ FILES: selectedFiles });
                      }}
                    />
                  </div>
                </div>
                <div className="row" style={{display: receiptList.length > 0 ? 'block' : 'none', width:450 + 'px'}} >
                  <button className="btn btn-sm btn-outline-primary" style={{marginBottom:10 + 'px', width:100 + 'px', marginRight:12 + 'px', float:'right'}} onClick={handleDownloadAll}>전체 다운로드</button>
                </div>
                <div className="row" style={{display: receiptList.length > 0 ? 'block' : 'none', width:450 + 'px'}} >
                  <div style={{padding: 20 + 'px', maxHeight:500 + 'px', overflowX:'hidden', overflowY:'auto'}}>
                    {receiptList.map((item, index) => 
                    <div key={`imgDiv` + index} className="mb-3">
                      <div className="d-flex">
                        <label className={`flex-shrink-0 me-2 ${styles.formImgNm}`}>{item.IMGNM}</label>
                        <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => handleDownload(item)}>
                          <i className="bi bi-download"></i> 다운로드
                        </button>
                        <button className="btn btn-sm btn-outline-secondary ms-2" style={{display: `${vSaveBtnDisplay}`}} onClick={() => handleImgDelete(item)}>
                          <i className="bi"></i> 삭제
                        </button>
                      </div>
                      <img src={item.SRC} className={styles.carImage} />
                    </div>
                    )}
                  </div>
                </div>
              </CommonPopup>
          </div>
        </div>
        <div className='justify-content-center' style={{display: `${vDisplay ? 'flex' : 'none'}`}}>
          <button className={`btn btn-secondary ${styles.btn}`} style={{ width:40 + 'px'}} onClick={onHide}>취소</button>
          <button className={`btn btn-primary ${styles.btn}`} style={{ width:40 + 'px', display: `${vSaveBtnDisplay}`}} onClick={handleSubmit}>저장</button>
          <button className={`btn btn-danger ${styles.btn}`} style={{ width:40 + 'px', display: `${vRejectBtnDisplay}`}} onClick={handleReject}>반려</button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default UserCarLogRegPopup;