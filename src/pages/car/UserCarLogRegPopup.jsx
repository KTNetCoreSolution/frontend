import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/store';
import commonUtils from '../../utils/common.js';
import fileUtils from '../../utils/fileUtils';
import { fetchData } from '../../utils/dataUtils.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import Modal from 'react-bootstrap/Modal';
import styles from './UserCarLogRegPopup.Module.css'; // CSS 파일을 별도로 import

const UserCarLogRegPopup = ({ show, onHide, onParentSearch }) => {
  const today = new Date();
  const todayDate = today.toISOString().split('T')[0];
  const timeOption = (stdTime) => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (timeString > stdTime) {
          times.push(timeString);
        }
      }
    }
    return times;
  };

  const { user } = useStore();
  const [carId, setCarId] = useState('');
  const [carList, setCarList] = useState({});
  const [carInfo, setCarInfo] = useState({CARNM: '', MANAGER_EMPNM: '', MANAGER_MOBILE: '', GARAGE_ADDR: '', STKM: 0, src: null, bookMark: false});
  const [logInfo, setLogInfo] = useState({CARID: '', LOGDATE: todayDate, LOGSTTIME: '00:00', LOGENTIME: '00:30', SAFETYNOTE: '', STKM: 0, ENKM: 0, FUEL: 0, NOTE: ''});
  const [vImgDisplay, setImgDisplay] = useState('none');
  const [vDisplay, setDisplay] = useState(false);
  const [isFilled, setIsFilled] = useState(false);
  const [isDamage, setIsDamage] = useState(true);
  const [isOilLeak, setIsOilLeak] = useState(true);
  const [isTire, setIsTire] = useState(true);
  const [isLuggage, setIsLuggage] = useState(true);
  const [isEtc1, setIsEtc1] = useState(true);
  const [isEtc2, setIsEtc2] = useState(true);
  
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기

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

    initializeComponent();

    //return () => {
    //};
  }, []);
    
  useEffect(() => {
    setCarId('');
    setImgDisplay('none');
  }, [show]);


  const initializing = () => {
    setCarInfo({CARNM: '', MANAGER_EMPNM: '', MANAGER_MOBILE: '', GARAGE_ADDR: '', STKM: 0, src: null, bookMark: false});
    setLogInfo({CARID: '', LOGDATE: todayDate, LOGSTTIME: '00:00', LOGENTIME: '00:30', SAFETYNOTE: '', STKM: 0, ENKM: 0, FUEL: 0, NOTE: ''});
    setIsFilled(false);
    setIsDamage(true);
    setIsOilLeak(true);
    setIsTire(true);
    setIsLuggage(true);
    setIsEtc1(true);
    setIsEtc2(true);
    setDisplay(false);
    setImgDisplay('none');
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

            const dataUrl = `data:${mimeType};base64,${fileData}`;
            const bBookMark = response.data[0].BOOKMARK === 'Y' ? true : false;
            
            setCarInfo({CARNM: response.data[0].CARNM, MANAGER_EMPNM: response.data[0].PRIMARY_MANAGER_EMPNM, MANAGER_MOBILE: response.data[0].PRIMARY_MANAGER_MOBILE, GARAGE_ADDR: response.data[0].PRIMARY_GARAGE_ADDR, STKM: 0, src: dataUrl, bookMark: bBookMark});
            setLogInfo({CARID: e.target.value, LOGDATE: todayDate, LOGSTTIME: '00:00', LOGENTIME: '00:30', SAFETYNOTE: '', STKM: 0, ENKM: 0, FUEL: 0, NOTE: ''});
            setIsDamage(true);
            setIsOilLeak(true);
            setIsTire(true);
            setIsLuggage(true);
            setIsEtc1(true);
            setIsEtc2(true);
            setIsFilled(bBookMark);
            setImgDisplay('flex');
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
  };
    
  const validateForm = () => {
    if (!logInfo.CARID || logInfo.CARID === '') {
      return "잘못된 접근입니다.";
    }

    if(!logInfo.LOGDATE || logInfo.LOGDATE === '') {
      return "운행일를 선택해주세요.";
    }

    if(logInfo.LOGSTTIME <= logInfo.LOGENTIME) {
      return "운행종료 시간이 운행시작 시간보다 커야 합니다.";
    }
  
    if (!isDamage || isOilLeak || isTire|| isLuggage || isEtc1 || isEtc2) {
      if (!logInfo.SAFETYNOTE || logInfo.SAFETYNOTE === '') {
        return "차량 불량사항이 있는 경우 점검 특이사항을 입력해주세요.";
      }
    }

    if(!logInfo.STKM) {
      return "시작km를 입력해주세요.";
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
      const Damage = isDamage ? 'Y' : 'N';
      const OilLeak = isOilLeak ? 'Y' : 'N';
      const Tire = isTire ? 'Y' : 'N';
      const Luggage = isLuggage ? 'Y' : 'N';
      const Etc1 = isEtc1 ? 'Y' : 'N';
      const Etc2 = isEtc2 ? 'Y' : 'N';

      const params = {pCARID: logInfo.CARID, pEMPNO: user?.empNo, pLOGDATE: logInfo.LOGDATE, pLOGSTTIME: logInfo.LOGSTTIME, pLOGENTIME: logInfo.LOGENTIME, pSTKM: logInfo.STKM, pENKM: logInfo.ENKM, pFUEL: logInfo.FUEL, pNOTE: logInfo.NOTE
                    , pDAMAGE: Damage, pOILLEAK: OilLeak, pTIRE: Tire, pLUGGAGE: Luggage, pETC1: Etc1, pETC2: Etc2, pSAFETYNOTE: logInfo.SAFETYNOTE};
      /*              
      const response = await fetchData('carlog/CarLogTransaction', params);

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
      }*/
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } 
  };

  const handleMaxLength = (e, maxlength) => {
    const value = e.target.value;
    
    e.target.value = value.substring(0, maxlength);
  }

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} onParentSearch={onParentSearch} centered>
      <Modal.Header closeButton>
        <Modal.Title>운행일지 관리</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={`mb-2 ${styles.formDiv}`} style={{display: vDisplay ? 'none' : 'block'}}>
          <div className="mb-2 d-flex">
            <label className="form-label flex-shrink-0 me-2" htmlFor="carId" style={{width:63 +'px', paddingTop:6 + 'px'}}>차량</label>
            <select id="carId" className={`form-select ${styles.formSelect}`} style={{width:200 +'px'}} onChange={(e) => {searchCarInfo(e)}}>
              <option value="">선택하세요</option>
              {carList.map((item) => <option key={item.CARID} value={item.CARID}>{item.CARNO}</option>)}
            </select>
          </div>
          <div className="mb-2" style={{minHeight: 245 + 'px'}}>
            <div className={styles.container}>
              <label className={`flex-shrink-0 me-2 ${styles.formCarNm}`}>{carInfo.CARNM}</label>
              <div className={`${styles.starBorder}`} style={{ position: 'absolute', top: '20px', left: '4px', zIndex: 1, display: `${vImgDisplay}`  }}>
                <button onClick={(e) => {handleBookMark(e)}} className={`${styles.star} ${isFilled ? styles.filled : ''}`}  />
              </div>
              <img src={carInfo.src} className={styles.carImage} />
            </div>
          </div>
          <div className="mb-2">
            <div className={`${styles.formDivBox}`} style={{height: 58 + 'px'}} >
              <div className={styles.container}>
                <label className={`flex-shrink-0 me-2 ${styles.formCarNm}`} style={{color:'#00c4b4', height:20 + 'px'}}>차고지</label>
                <label className={`flex-shrink-0 me-2 ${styles.formCarNm}`} style={{color:'#525252', height:20 + 'px'}}>{carInfo.GARAGE_ADDR}</label>
              </div>
            </div>
          </div>
          <div className="mb-2">
            <div className={`${styles.formDivBox}`} style={{height: 45 + 'px'}} >
              <div className={`d-flex ${styles.container}`} >
                <label className={`flex-shrink-0 me-2 ${styles.formManager}`} style={{color:'#525252', width: 100 + 'px'}}>운전자(정)</label>
                <label className={`flex-shrink-0 me-2 ${styles.formManager}`} style={{color:'#1a1a1a'}}>{carInfo.MANAGER_EMPNM}</label>
              </div>
              <div className={`d-flex ${styles.container}`}>
                <label className={`flex-shrink-0 me-2 ${styles.formManager}`} style={{color:'#525252', width: 100 + 'px'}}>연락처</label>
                <label className={`flex-shrink-0 me-2 ${styles.formManager}`} style={{color:'#1a1a1a'}}>{carInfo.MANAGER_MOBILE}</label>
              </div>
            </div>
          </div>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formTitleLabel}`} htmlFor="logDate" style={{width:63 +'px'}}>운행일시</label>
              <input type="date" id="logDate" className={`form-control ${styles.formControl}`} value={logInfo.LOGDATE} style={{width:120 +'px', marginRight:5 + 'px'}} onChange={(e) => {setLogInfo({ ...logInfo, LOGDATE: e.target.value })}} />
              <select id="hour" className={`form-select ${styles.formSelect}`} style={{width: 80 +'px'}} onChange={(e) => {setLogInfo({ ...logInfo, LOGSTTIME: e.target.value })}}>
                {timeOption('').map((time, index) => <option key={index} value={time}>{time}</option>)}
              </select>
              <label style={{width:16 +'px', paddingTop:8 + 'px', textAlign:'center'}}> ~ </label>
              <select id="hour" className={`form-select ${styles.formSelect}`} style={{width: 80 +'px'}} onChange={(e) => {setLogInfo({ ...logInfo, LOGENTIME: e.target.value })}}>
                {timeOption(logInfo.LOGSTTIME).map((time, index) => <option key={index} value={time}>{time}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-2">
              <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{ backgroundColor:vImgDisplay === 'flex' ? '#00c4b4' : '#909090'}} disabled={vImgDisplay === 'flex' ? '' : 'disabled'} onClick={(e) => setDisplay(!vDisplay)}>차량점검 및 일지작성</button>
          </div>
        </div>
        <div className={`mb-2 ${styles.formDiv}`} style={{display: vDisplay ? 'block' : 'none'}}>
          <div className="mb-2 d-flex">
            <label className="form-label" style={{paddingTop:6 + 'px'}}>점검항목</label>
            <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{ width:40 + 'px', marginLeft:'auto'}} onClick={(e) => setDisplay(!vDisplay)}>이전</button>
          </div>
          <div className="row">
            <div className="col mb-2 d-flex" >
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'px'}}>차량파손</label>
              <label className={`${styles.safetyLabel} ${isDamage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Damage', !isDamage)}>{isDamage ? '양호' : '불량'}</label>
              <div className={`${styles.safetyBox}`} onClick={() => handleSafetyCheck('Damage', !isDamage)}>
                  <div className={`${styles.safetyCheck} ${isDamage ? '' : styles.bad}`}></div>
              </div>
            </div>
            <div className="col mb-2 d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'px'}}>오일누수</label>
              <label className={`${styles.safetyLabel} ${isOilLeak ? '' : styles.bad}`} onClick={() => handleSafetyCheck('OilLeak', !isOilLeak)}>{isOilLeak ? '양호' : '불량'}</label>
              <div className={`${styles.safetyBox}`} onClick={() => handleSafetyCheck('OilLeak', !isOilLeak)}>
                  <div className={`${styles.safetyCheck} ${isOilLeak ? '' : styles.bad}`}></div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col mb-2 d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'px'}}>타이어</label>
              <label className={`${styles.safetyLabel} ${isTire ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Tire', !isTire)}>{isTire ? '양호' : '불량'}</label>
              <div className={`${styles.safetyBox}`} onClick={() => handleSafetyCheck('Tire', !isTire)}>
                  <div className={`${styles.safetyCheck} ${isTire ? '' : styles.bad}`}></div>
              </div>
            </div>
            <div className="col mb-2 d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'px'}}>적재물안전</label>
              <label className={`${styles.safetyLabel} ${isLuggage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Luggage', !isLuggage)}>{isLuggage ? '양호' : '불량'}</label>
              <div className={`${styles.safetyBox}`} onClick={() => handleSafetyCheck('Luggage', !isLuggage)}>
                  <div className={`${styles.safetyCheck} ${isLuggage ? '' : styles.bad}`}></div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col mb-2 d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'px'}}>기타(직접기재)</label>
              <label className={`${styles.safetyLabel} ${isEtc1 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc1', !isEtc1)}>{isEtc1 ? '양호' : '불량'}</label>
              <div className={`${styles.safetyBox}`} onClick={() => handleSafetyCheck('Etc1', !isEtc1)}>
                  <div className={`${styles.safetyCheck} ${isEtc1 ? '' : styles.bad}`}></div>
              </div>
            </div>
            <div className="col mb-2 d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'px'}}>특이사항(직전)</label>
              <label className={`${styles.safetyLabel} ${isEtc2 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc2', !isEtc2)}>{isEtc2 ? '양호' : '불량'}</label>
              <div className={`${styles.safetyBox}`} onClick={() => handleSafetyCheck('Etc2', !isEtc2)}>
                  <div className={`${styles.safetyCheck} ${isEtc2 ? '' : styles.bad}`}></div>
              </div>
            </div>
          </div>
          <div className="mb-2">
            <textarea className={`${styles.formTextArea}`} rows="5" value={logInfo.SAFETYNOTE} maxLength={1500} placeholder="점검특이사항(차량불량사항이 있는 경우/특수문자 입력불가)" onChange={(e) => {setLogInfo({ ...logInfo, SAFETYNOTE: e.target.value })}}  />
          </div>
        </div>
        <div className={`mb-2 ${styles.formDiv}`} style={{display: vDisplay ? 'block' : 'none'}}>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:63 +'px'}}>운행일시</label>
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'%'}}>{logInfo.LOGDATE + ' ' + logInfo.LOGSTTIME + ' ~ ' + logInfo.LOGENTIME}</label>
            </div>
          </div>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:63 +'px'}}>운행자</label>
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'%'}}>{user?.empNm + ' (' + user?.empNo + ')'}</label>
            </div>
          </div>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:63 +'px'}}>시작km</label>
              <input type="number" id="stKm" className={`form-control ${styles.formControl2}`} value={logInfo.STKM} disabled={carInfo.STKM === 0 ? '' : 'disabled'} style={{width:100 +'px'}} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, STKM: e.target.value })}} />
            </div>
          </div>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:63 +'px'}}>종료km</label>
              <input type="number" id="stKm" className={`form-control ${styles.formControl2}`} value={logInfo.ENKM} style={{width:100 +'px'}} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, ENKM: e.target.value })}} />
            </div>
          </div>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:63 +'px'}}>주행거리</label>
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:100 +'%'}}>{logInfo.ENKM - logInfo.STKM}</label>
            </div>
          </div>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:63 +'px'}}>주유(ℓ)</label>
              <input type="number" id="stKm" className={`form-control ${styles.formControl2}`} value={logInfo.FUEL} style={{width:100 +'px'}} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, FUEL: e.target.value })}} />
            </div>
          </div>
          <div className="mb-2">
            <div className="d-flex">
              <label className={`form-label flex-shrink-0 me-2 ${styles.formLabel}`} style={{width:63 +'px'}}>비고</label>
              <input type="text" id="notice" className={`form-control ${styles.formControl2}`} style={{width:100 +'%'}} onInput={(e) => {handleMaxLength(e, 1000)}} onChange={(e) => {setLogInfo({ ...logInfo, NOTE: e.target.value })}} />
            </div>
          </div>
          <div className="mb-2">
              <button className={`btn ${styles.btnCheck} ${styles.btn}`} onClick={(e) => alert('준비중입니다')}>영수증첨부</button>
          </div>
        </div>
        <div className={`mb-2`} style={{display: vDisplay ? 'block' : 'none'}}>
          <button className={`btn btn-secondary ${styles.btn}`} style={{ width:40 + 'px', marginLeft:'auto'}} onClick={onHide}>취소</button>
          <button className={`btn btn-primary ${styles.btn}`} style={{ width:40 + 'px', marginLeft:'auto'}} onClick={handleSubmit}>등록</button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default UserCarLogRegPopup;