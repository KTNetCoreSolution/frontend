import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import fileUtils from '../../utils/fileUtils.js';
import { fetchData, fetchFileUpload } from "../../utils/dataUtils.js";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import styles from './MobileCarLogReg.module.css';
import api from '../../utils/api.js';

const MobileDrivingLog = () => {
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
  const { clearUser } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const { state } = useLocation();
  const [carId, setCarId] = useState('');
  const [gubun, setGubun] = useState('');
  const [logInfo, setLogInfo] = useState({GUBUN: '', CARID: '', CARNO: '', LOGDATE: todayDate, LOGSTTIME: '00:00', LOGENTIME: '00:30', SAFETYNOTE: '', STKM: 0, ENKM: 0, FUEL: 0, NOTE: '', EMPNO: '', EMPNM: '', DELYN: 'N'});
  const [lastLogInfo, setLastLogInfo] = useState({LOGDATE: '', LOGSTTIME: '', LOGENTIME: ''});
  const [isDamage, setIsDamage] = useState(true);
  const [isOilLeak, setIsOilLeak] = useState(true);
  const [isTire, setIsTire] = useState(true);
  const [isLuggage, setIsLuggage] = useState(true);
  const [isEtc1, setIsEtc1] = useState(true);
  const [isEtc2, setIsEtc2] = useState(true);
  const [stTime , setStTime] = useState([]);
  const [enTime , setEnTime] = useState([]);
  const [diffTime, setDiffTime] = useState('');
  const logDateRef = useRef(null);

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

  const calcTimeDifference = (stTime, enTime) => {
    // 날짜는 동일하다고 가정하고, 시간만 파싱
    const [startHours, startMinutes] = stTime.split(':').map(Number);
    const [endHours, endMinutes] = enTime.split(':').map(Number);

    // Date 객체 생성 (임의의 동일한 날짜 사용)
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    // 시간 차이 계산 (밀리초 단위)
    const diffInMs = endDate - startDate;

    // 밀리초를 시간과 분으로 변환
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffInHours}시간 ${diffInMinutes}분`;
  };

  const getCarLogInfo = async () => {
    setCarId(state?.carId);
    const plogdate = state?.logDate || '';
    const plogtime = state?.logTime || '';
    const pGubun = state?.gubun || 'I';
    setGubun(pGubun);

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const params = { pLOGDATE: plogdate, pLOGSTTIME: plogtime, pCARID: state?.carId, pEMPNO: user?.empNo, pDEBUG: "F" };
      const response = await fetchData('carlogM/logDetail', params);

      if (!response.success) {
        throw new Error(response.errMsg || '운행일지 상세정보 조회 중 오류가 발생했습니다.');
      } else {
        const logDate = pGubun === 'I' ? response.data[0].LOGDATE <= todayDate ? todayDate : response.data[0].LOGDATE : response.data[0].LOGDATE;            
        const logStTime = pGubun === 'I' ? response.data[0].LOGDATE === todayDate ? response.data[0].LOGENTIME : '09:00' : response.data[0].LOGSTTIME;
        setStTime(timeOption(logStTime, 'S'));

        const safetyNote = pGubun === 'I' ? '' : response.data[0].SAFETYNOTE;
        const stKm = pGubun === 'I' ? response.data[0].ENKM || 0 : response.data[0].STKM;
        const enKm = pGubun === 'I' ? 0 : response.data[0].ENKM;
        const fuel = pGubun === 'I' ? 0 : response.data[0].FUEL;
        const note = pGubun === 'I' ? '' : response.data[0].NOTE;
        const empNo = pGubun === 'I' ? user?.empNo : response.data[0].EMPNO;
        const empNm = pGubun === 'I' ? user?.empNm : response.data[0].EMPNM;
        const delYn = response.data[0].DELYN;

        setEnTime(timeOption(logStTime, 'E'));

        let logEnTime = '09:00';

        if (pGubun === 'I') {
          timeOption(logInfo.LOGSTTIME, 'E').some(time => {
            if (time > logStTime) {
              logEnTime = time; 
              return true;
            }
          });
        } else {
          logEnTime = response.data[0].LOGENTIME;
        }

        setLogInfo({GUBUN:pGubun, CARID: state?.carId, CARNO: response.data[0].CARNO, LOGDATE: logDate, LOGSTTIME: logStTime, LOGENTIME: logEnTime, SAFETYNOTE: safetyNote, STKM: stKm, ENKM: enKm, FUEL: fuel, NOTE: note, EMPNO: empNo, EMPNM: empNm, DELYN: delYn});
        setLastLogInfo({LOGDATE: response.data[0].LOGDATE, LOGSTTIME: response.data[0].LOGDATE, LOGENTIME: response.data[0].LOGENTIME});

        const bDamage = response.data[0].DAMAGE === 'Y' || pGubun === 'I' ? true : false;
        const bOilLeak = response.data[0].OILLEAK === 'Y' || pGubun === 'I' ? true : false;
        const bTire = response.data[0].TIRE === 'Y' || pGubun === 'I' ? true : false;
        const bLuggage = response.data[0].LUGGAGE === 'Y' || pGubun === 'I' ? true : false;
        const bEtc1 = response.data[0].ETC1 === 'Y' || pGubun === 'I' ? true : false;
        const bEtc2 = response.data[0].ETC2 === 'Y' || pGubun === 'I' ? true : false;

        setIsDamage(bDamage);
        setIsOilLeak(bOilLeak);
        setIsTire(bTire);
        setIsLuggage(bLuggage);
        setIsEtc1(bEtc1);
        setIsEtc2(bEtc2);

        setDiffTime(calcTimeDifference(logStTime, logEnTime));
      }
    } catch (error) {
      setCarId('');
      console.error('Registration error:', error);
      alert(error.message || '운행일지 상세정보 조회 중 오류가 발생했습니다.');
    }
  };
  
  useEffect(() => {
    getCarLogInfo();
  }, []);

  const handleLogDate = (e) => {
    let logDate = e.target.value;
    let logStTime = '09:00';
    
    if(e.target.value < lastLogInfo.LOGDATE) {
      logDateRef.current.value = lastLogInfo.LOGDATE;
      logDate =lastLogInfo.LOGDATE;
      logStTime = lastLogInfo.LOGENTIME;
    }
    else {
      logDate = e.target.value;
      logStTime = lastLogInfo.LOGDATE >= e.target.value ? lastLogInfo.LOGENTIME : '09:00';
    }

    setStTime(timeOption(logStTime, 'S'));   
    setEnTime(timeOption(logStTime, 'E'));

    let logEnTime = '09:00';
    timeOption(logStTime, 'E').some(time => {
      if (time > logStTime) {
        logEnTime = time; 
        return true;
      }
    });
    
    
    setLogInfo({ ...logInfo, LOGDATE: logDate, LOGSTTIME: logStTime, LOGENTIME: logEnTime});
    setDiffTime(calcTimeDifference(logStTime, logEnTime));
  };

  const handleLogTime = (e, timeGbn) => {
    const time = e.target.value;

    if(timeGbn === 'stTime'){
      setLogInfo({ ...logInfo, LOGSTTIME: time });
      setDiffTime(calcTimeDifference(time, logInfo.LOGENTIME));
    }
    else {
      setLogInfo({ ...logInfo, LOGENTIME: time });
      setDiffTime(calcTimeDifference(logInfo.LOGSTTIME, time));
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

    if(!confirm("운행일지를 등록하시겠습니까?")) {
      return;
    }

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
          if(gubun === 'I') {
            handleMoveRecipt();
          }
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } 
  };

  const handleMoveRecipt = () => {
    navigate('/mobile/MobileCarLogReceipt', { state: { gubun: gubun, carId: logInfo.CARID, logDate: logInfo.LOGDATE, logTime: logInfo.LOGSTTIME, empNo: logInfo.EMPNO }});
  }

  const handleDelete = async(e) => {
    e.preventDefault();

    if(!confirm("운행일지를 삭제하시겠습니까?")) {
      return;
    }

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
          navigate(-1);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    } 
  };

  const handleMaxLength = (e, maxlength) => {
    const value = e.target.value;    
    e.target.value = value.substring(0, maxlength);
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
        <h1 className="h5 mb-0">운행일지등록</h1>
        <button className="btn text-white" onClick={handleToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
      </header>
      
      <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

      <div className="pageMain">
        <div style={{display: 'flex', marginTop:-5 + 'px', marginBottom:10 + 'px', marginRight:4 + 'px', justifyContent: 'flex-end'}}>
          <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={handleReturnPage}>{state?.gubun === 'U' ? '돌아가기' : '닫기' }</button>
        </div>
        <div className='mb-3'>
          <div className='formList'>
            <span className='formSearchTitle'>차량번호 : {logInfo.CARNO} </span>
          </div>
          <div className='formList'>
            <span className='formSearchTitle'>차대번호 : {logInfo.CARID} </span>
          </div>
          <div className='formList02'>
            <span className='formSearchTitle'>운행일시</span>
            <div className='d-flex gap-1'>
              <input type="date" ref={logDateRef} id="logDate" className={`${styles.formInput}`} style={{width: '110px'}} value={logInfo.LOGDATE} disabled={gubun === 'I' ? '' : 'disabled'} onChange={(e) => {handleLogDate(e)}} />
              <div className='d-flex flex-row align-items-center'>
                <select id="stTime" className={`form-select ${styles.formSelect}`} value={logInfo.LOGSTTIME} disabled={gubun === 'I' ? '' : 'disabled'} onChange={(e) => {handleLogTime(e, 'stTime')}}>
                  {stTime.map((time, index) => <option key={index} value={time}>{time}</option>)}
                </select>
                <span style={{width: '12px', textAlign: 'center'}}>~</span>
                <select id="enTime" className={`form-select ${styles.formSelect}`} value={logInfo.LOGENTIME}  disabled={gubun === 'I' ? '' : 'disabled'} onChange={(e) => {handleLogTime(e, 'enTime')}}>
                  {enTime.map((time, index) => <option key={index} value={time}>{time}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className='formList'>
            <span className='formSearchTitle'>운행시간 : {diffTime} </span>
          </div>
        </div>
        <div className='formDivBox'>
          <div className={styles.container}>
            <div className='formList'>
              <span className='formSearchTitle'>점검항목</span>
            </div>
            <ul class="formListData">
              <li>
                <span class="formLabel">차량파손</span>
                <div className='safetyWrap'>
                  <label className={`${styles.safetyLabel} ${isDamage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Damage', !isDamage)}>{isDamage ? '양호' : '불량'}</label>
                  <div className={`${styles.safetyBox} ${isDamage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Damage', !isDamage)}>
                      <div className={`${styles.safetyCheck} ${isDamage ? '' : styles.bad}`}></div>
                  </div>
                </div>
              </li>
              <li>
                <span class="formLabel">오일누수</span>
                <div className='safetyWrap'>
                  <label className={`${styles.safetyLabel} ${isOilLeak ? '' : styles.bad}`} onClick={() => handleSafetyCheck('OilLeak', !isOilLeak)}>{isOilLeak ? '양호' : '불량'}</label>
                  <div className={`${styles.safetyBox} ${isOilLeak ? '' : styles.bad}`} onClick={() => handleSafetyCheck('OilLeak', !isOilLeak)}>
                    <div className={`${styles.safetyCheck} ${isOilLeak ? '' : styles.bad}`}></div>
                  </div>
                </div>  
              </li>
              <li>
                <span class="formLabel">타이어</span>
                <div className='safetyWrap'>
                  <label className={`${styles.safetyLabel} ${isTire ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Tire', !isTire)}>{isTire ? '양호' : '불량'}</label>
                  <div className={`${styles.safetyBox} ${isTire ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Tire', !isTire)}>
                      <div className={`${styles.safetyCheck} ${isTire ? '' : styles.bad}`}></div>
                  </div>
                </div>
              </li> 
              <li>
                <span class="formLabel">적재물안전</span>
                <div className='safetyWrap'>
                  <label className={`${styles.safetyLabel} ${isLuggage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Luggage', !isLuggage)}>{isLuggage ? '양호' : '불량'}</label>
                  <div className={`${styles.safetyBox} ${isLuggage ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Luggage', !isLuggage)}>
                      <div className={`${styles.safetyCheck} ${isLuggage ? '' : styles.bad}`}></div>
                  </div>
                </div>
              </li>       
              <li>
                <span class="formLabel">기타(직접기재)</span>
                <div className='safetyWrap'>
                  <label className={`${styles.safetyLabel} ${isEtc1 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc1', !isEtc1)}>{isEtc1 ? '양호' : '불량'}</label>
                  <div className={`${styles.safetyBox} ${isEtc1 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc1', !isEtc1)}>
                      <div className={`${styles.safetyCheck} ${isEtc1 ? '' : styles.bad}`}></div>
                  </div>
                </div>
              </li>      
              <li>
                <span class="formLabel">특이사항(직전)</span>
                <div className='safetyWrap'>
                  <label className={`${styles.safetyLabel} ${isEtc2 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc2', !isEtc2)}>{isEtc2 ? '양호' : '불량'}</label>
                  <div className={`${styles.safetyBox} ${isEtc2 ? '' : styles.bad}`} onClick={() => handleSafetyCheck('Etc2', !isEtc2)}>
                      <div className={`${styles.safetyCheck} ${isEtc2 ? '' : styles.bad}`}></div>
                  </div>
                </div>
              </li>                                                
            </ul>
            <div className='mt-2'>
              <textarea className={`${styles.formTextArea}`} rows="5" value={logInfo.SAFETYNOTE} maxLength={1500} placeholder="점검특이사항(차량불량사항이 있는 경우/특수문자 입력불가)" disabled={logInfo.GUBUN === 'I' ? '' : 'disabled'} onChange={(e) => {setLogInfo({ ...logInfo, SAFETYNOTE: e.target.value })}}  />
            </div>
          </div>
        </div>
        <div className='formDivBox d-flex flex-column gap-2'>
            <div className='d-flex align-items-center'>
              <span className='formSearchTitle' style={{width:'70px'}}>운행자</span>
              <span className='formSearchTitle' style={{width: '200px'}}>{user?.empNm + ' (' + user?.empNo + ')'}</span>
            </div>
            <div className='d-flex align-items-center'>
              <span className='formSearchTitle' style={{width:'70px'}}>시작km</span>
              <input type="number" className={`${styles.formInput}`} style={{width: '120px'}} value={logInfo.STKM} disabled={gubun === 'I' ? logInfo.STKM === 0 ? '' : 'disabled' : 'disabled'} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, STKM: e.target.value })}} />
            </div>
            <div className='d-flex align-items-center'>
              <span className='formSearchTitle' style={{width:'70px'}}>종료km</span>
              <input type="number" className={`${styles.formInput}`} style={{width: '120px'}} value={logInfo.ENKM} disabled={gubun === 'I' ? '' : 'disabled'} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, ENKM: e.target.value })}} />
            </div>
            <div className='d-flex align-items-center'>
              <span className='formSearchTitle' style={{width:'70px'}}>운행거리</span>
              <span className='formSearchTitle' style={{width: '120px'}}>{logInfo.ENKM - logInfo.STKM}</span>
            </div>
            <div className='d-flex align-items-center'>
              <span className='formSearchTitle' style={{width:'70px'}}>주유(ℓ)</span>
              <input type="number" className={`${styles.formInput}`} style={{width: '120px'}} value={logInfo.FUEL} onInput={(e) => {handleMaxLength(e, 11)}} onChange={(e) => {setLogInfo({ ...logInfo, FUEL: e.target.value })}} />
            </div>
            <div className='d-flex align-items-center'>
              <span className='formSearchTitle' style={{width:'70px'}}>비고</span>
              <input type="text" className={`${styles.formInput}`} style={{flex: 1, marginLeft:0}} value={logInfo.NOTE} onInput={(e) => {handleMaxLength(e, 1000)}} onChange={(e) => {setLogInfo({ ...logInfo, NOTE: e.target.value })}} />
            </div>
        </div>
        <div className='d-flex flex-column gap-2'>
          <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{display: user?.empNo === logInfo.EMPNO ? 'block' : 'none'}} onClick={(e) => handleSubmit(e)}>운행일지 {gubun === 'I' ? '등록' : '수정'}</button>
          <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{display: gubun === 'U' ? 'block' : 'none'}} onClick={() => handleMoveRecipt()}>주차장 영수증</button>
          <button className={`btn ${styles.btnDelete} ${styles.btn}`} style={{display: logInfo.DELYN === 'Y' ? 'block' : 'none'}} onClick={(e) => handleDelete(e)}>운행일지 삭제</button>
        </div>
      </div>
    </div>
  );
};

export default MobileDrivingLog;