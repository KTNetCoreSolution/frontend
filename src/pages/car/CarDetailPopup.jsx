import { useState, useEffect } from 'react';
import useStore from '../../store/store';
import commonUtils from '../../utils/common';
import { fetchData } from '../../utils/dataUtils.js';
import CommonPopup from '../../components/popup/CommonPopup';
import OrgSearchPopup from '../../components/popup/OrgSearchPopup';
import MngUserListPopup from '../../components/popup/UserListPopup';
import Under26UserListPopup from '../../components/popup/UserListPopup';
import FuelCardPopup from '../car/FuelCardPopup';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { hasPermission } from '../../utils/authUtils';
import Modal from 'react-bootstrap/Modal';
import styles from './CarDetailPopup.module.css';
import { set } from 'date-fns';

const CarInfoDetailPopup = ({ show, onHide, onParentSearch, data }) => {
  const { user } = useStore();
  const today = commonUtils.getTodayDate();
  const [vStyle, setVStyle] = useState({vDISPLAY: 'show', vBTNDEL: 'show', vDISABLED: ''});  
  const [showOrgPopup, setShowOrgPopup] = useState(false);
  const [showMngUserPopup, setShowMngUserPopup] = useState(false);
  const [showFuelCardPopup, setShowFuelCardPopup] = useState(false);  
  const [showUnder26UserPopup, setShowUnder26UserPopup] = useState(false);
  const [carList, setCarList] = useState({});
  const [rentalCompList, setRentalCompList] = useState({});
  const initialCarInfo = {GUBUN: '', PRECARID: '', CARID: '', CARNO: '', RENTALTYPE: '', MGMTSTATUS: '', CARCD: '', USEFUEL: '', RENTALCOMP: '', CARACQUIREDDT: today, RENTALEXFIREDDT: today, CARREGDATE: today
                          , CARPRICE: '', RENTALPRICE: '', INSURANCE: '', DEDUCTIONYN: '', ORGGROUP: '', ORGCD: '', ORGNM: '', PRIMARYMNGEMPNO: '', PRIMARYMNGEMPNM: '', PRIMARYMNGMOBILE: '', PRIMARYGARAGEADDR: '', SAFETYMANAGER: ''
                          , FIREEXTINGUISHER: '', UNDER26AGEEMPNO: '', UNDER26AGEEMPNM: '', UNDER26AGEJUMINBTRTHNO: '', UNDER26AGECHGDT: '', CARDNO: '', EXFIREDT: '', NOTICE: ''};
  const [carInfo, setCarInfo] = useState(initialCarInfo);
  const [chkCarId, setChkCarId] = useState('');
  const [confirmBtnNm, setConfirmBtnNm] = useState('저장');
  const [delBtnNm, setDelBtnNm] = useState('삭제');
  const [reqStatus, setReqStatus] = useState('');
  const [reqGubun, setReqGubun] = useState('');
  const [transfer_ReqStatus, setTransfer_ReqStatus] = useState('');
  const [vDisabled, setVDisabled] = useState('disabled');
  
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (hasPermission(user?.auth, 'carManager')) {
        setConfirmBtnNm('저장');
        setDelBtnNm('삭제');
      }
      else {
        setConfirmBtnNm('검토요청');
        setDelBtnNm('삭제요청');
      }

      // Component에 들어갈 데이터 로딩
      try {
        const params = { pDEBUG: "F" };
        const response = await fetchData('car/carCodeList', params);

        if (!response.success) {
          throw new Error(response.errMsg || '차량구분 조회 중 오류가 발생했습니다.');
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
        errorMsgPopup(error.message || '차량구분 조회 중 오류가 발생했습니다.');
      }

      try {
        const params = { pDEBUG: "F" };
        const response = await fetchData('car/rentalCompList', params);
        
        if (!response.success) {
          throw new Error(response.errMsg || '렌터카업체 조회 중 오류가 발생했습니다.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;
            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
            errorMsgPopup(errMsg);
          } else {  
            setRentalCompList(response.data);
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || '렌터카업체 조회 중 오류가 발생했습니다.');
      }
    };

    initializeComponent();

    //return () => {
    //};
  }, []);
  
  useEffect(() => {
    setCarInfo(initialCarInfo);
    setReqStatus('');
    setTransfer_ReqStatus('');

    if (show) {
      if(data !== ''){ 
        setCarInfo({...carInfo, GUBUN:'U', PRECARID: data, CARID: data});

        setChkCarId(data);

        if(data.substring(0, 4) === 'ZZZZ'){
          setVStyle({vDISPLAY: 'none', vBTNDEL: 'show', vDISABLED: ''});
        }
        else {
          setVStyle({vDISPLAY: 'none', vBTNDEL: 'show', vDISABLED: 'disabled'});
        }

        handleSearchCarInfo(data); //차량정보 조회

        if (hasPermission(user?.auth, 'permissions')) {
          setVDisabled('');
        }
        else {          
          setVDisabled('disabled');
        }
      }
      else {
        setCarInfo({...carInfo, GUBUN:''});
        setVStyle({vDISPLAY: 'show', vBTNDEL: 'none', vDISABLED: ''});
        setVDisabled('');
      }
    }
    else {
      setVStyle({vDISPLAY: 'show', vBTNDEL: 'show', vDISABLED: ''});
      setVDisabled('disabled');
    }
  }, [show]);
  
  const validateForm = () => {
    if (!carInfo.GUBUN || carInfo.GUBUN === '') {
      return "차대번호 확인 버튼을 클릭하여 차량 정보를 확인해주세요.";
    }

    if(carInfo.GUBUN === 'I' && chkCarId !== carInfo.CARID) {
      return "차대번호가 변경되었습니다. 차대번호 확인 버튼을 클릭하여 차량 정보를 확인해주세요.";
    }

    if (reqStatus === 'G') {
      if (reqGubun === 'I') {
        return "해당차량은 신규 등록 요청 승인 대기중입니다.";
      } else if (reqGubun === 'D') {
        return "해당차량은 삭제 요청 승인 대기중입니다.";
      } else if (reqGubun === 'U') {
        return "해당차량은 수정 요청 승인 대기중입니다.";
      }
    }
    else if (reqStatus === 'R') {
      if (reqGubun === 'I') {
        return "해당차량은 신규 등록 검토 중입니다.";
      } else if (reqGubun === 'D') {
        return "해당차량은 삭제 요청 검토 중입니다.";
      } else if (reqGubun === 'U') {
        return "해당차량은 수정 요청 검토 중입니다.";
      }
    }
    else if (transfer_ReqStatus === 'R') {
      return "해당차량은 이관요청 승인 대기 중입니다.";
    }
    else if (transfer_ReqStatus === 'Y') {
      return "해당차량은 이관요청 인수 대기 중입니다.";
    }
  
    if (!carInfo.CARID || !carInfo.CARNO || !carInfo.MGMTSTATUS|| !carInfo.USEFUEL || !carInfo.RENTALTYPE || !carInfo.CARCD || !carInfo.ORGGROUP || !carInfo.ORGCD || !carInfo.PRIMARYMNGEMPNO || !carInfo.PRIMARYGARAGEADDR) {
      return "필수 입력 항목을 모두 입력해주세요.";
    }

    const carIdValidation = commonUtils.validateVarcharLength(carInfo.CARID, 30, '차대번호');
    if (!carIdValidation.valid) return carIdValidation.error;

    const carNoValidation = commonUtils.validateVarcharLength(carInfo.CARNO, 20, '차량번호');
    if (!carNoValidation.valid) return carNoValidation.error;

    const primaryGarageAddrValidation = commonUtils.validateVarcharLength(carInfo.PRIMARYGARAGEADDR, 200, '차고지주소(정)');
    if (!primaryGarageAddrValidation.valid) return primaryGarageAddrValidation.error;

    const noticeValidation = commonUtils.validateVarcharLength(carInfo.NOTICE, 1500, '비고');
    if (!noticeValidation.valid) return noticeValidation.error;

    return '';
  };
  
  const validateDelForm = () => {
    if (!carInfo.CARID || carInfo.CARID === '') {
      return "잘못된 접근입니다.";
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      msgPopup(validationError);
      return;
    }
        
    let Url = 'car/CarinfoRequest';
    let responseMsg = '';

    if (hasPermission(user?.auth, 'carManager')) {
      Url = 'car/CarinfoTransaction';
    }
    else {
      Url = 'car/CarinfoRequest';
      responseMsg = ' 검토 요청 ';
    }

    if(confirm("차량 정보를 등록/수정" + responseMsg  + "하시겠습니까?")) { 
      try {
        const params = {
          pGUBUN: carInfo.GUBUN,
          pPRECARID: carInfo.PRECARID,
          pCARID: carInfo.CARID,
          pCARNO: carInfo.CARNO,
          pRENTALTYPE: carInfo.RENTALTYPE,
          pMGMTSTATUS: carInfo.MGMTSTATUS,
          pCARCD: carInfo.CARCD,
          pUSEFUEL: carInfo.USEFUEL,
          pRENTALCOMP: carInfo.RENTALCOMP,
          pCARACQUIREDDT: carInfo.CARACQUIREDDT,
          pRENTALEXFIREDDT: carInfo.RENTALEXFIREDDT,
          pCARREGDATE: carInfo.CARREGDATE,
          pCARPRICE: carInfo.CARPRICE || '',
          pRENTALPRICE: carInfo.RENTALPRICE || '',
          pINSURANCE: carInfo.INSURANCE || '',
          pDEDUCTIONYN: carInfo.DEDUCTIONYN || '',
          pORGGROUP: carInfo.ORGGROUP,
          pORGCD: carInfo.ORGCD,
          pPRIMARYMNGEMPNO: carInfo.PRIMARYMNGEMPNO || '',
          pPRIMARYMNGEMPNM: carInfo.PRIMARYMNGEMPNM,
          pPRIMARYMNGMOBILE: carInfo.PRIMARYMNGMOBILE || '',
          pPRIMARYGARAGEADDR: carInfo.PRIMARYGARAGEADDR,
          pSAFETYMANAGER: carInfo.SAFETYMANAGER,
          pFIREEXTINGUISHER: carInfo.FIREEXTINGUISHER || '미보유',
          pUNDER26AGEEMPNO: carInfo.UNDER26AGEEMPNO,
          pUNDER26AGEEMPNM: carInfo.UNDER26AGEEMPNM,
          pUNDER26AGEJUMINBTRTHNO: carInfo.UNDER26AGEJUMINBTRTHNO,
          pUNDER26AGECHGDT: carInfo.UNDER26AGECHGDT,
          pCARDNO: carInfo.CARDNO,
          pEXFIREDT: carInfo.EXFIREDT,
          pNOTICE: carInfo.NOTICE,
          pREGEMPNO: user?.empNo || ''
        };

        const response = await fetchData(Url, params);

        if (!response.success) {
          throw new Error(response.errMsg || '차량정보가 잘못되었습니다.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;

            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

            errorMsgPopup(errMsg);
          } else {
            msgPopup("차량정보 저장 " + responseMsg + "이 완료되었습니다.");
            onHide();
            onParentSearch();
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || '차량정보 저장' + responseMsg + ' 중 오류가 발생했습니다. 다시 시도해주세요.');
      } 
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    if (reqStatus === 'G') {
      if (reqGubun === 'I') {
        msgPopup("해당차량은 신규 등록 요청 승인 대기중입니다.");
        return;
      } else if (reqGubun === 'D') {
        msgPopup("해당차량은 삭제 요청 승인 대기중입니다.");
        return;
      } else if (reqGubun === 'U') {
        msgPopup("해당차량은 수정 요청 승인 대기중입니다.");
        return;
      }
    }
    else if (reqStatus === 'R') {
      if (reqGubun === 'I') {
        msgPopup("해당차량은 신규 등록 검토 중입니다.");
        return;
      } else if (reqGubun === 'D') {
        msgPopup("해당차량은 삭제 요청 검토 중입니다.");
        return;
      } else if (reqGubun === 'U') {
        msgPopup("해당차량은 수정 요청 검토 중입니다.");
        return;
      }
    }
    else if (transfer_ReqStatus === 'R') {
      msgPopup("해당차량은 이관요청 승인 대기 중입니다.");
      return;
    }
    else if (transfer_ReqStatus === 'Y') {
      msgPopup("해당차량은 이관요청 인수 대기 중입니다.");
      return;
    }

    let Url = 'car/CarinfoRequest';
    let responseMsg = '';

    if (hasPermission(user?.auth, 'carManager')) {
      Url = 'car/CarinfoTransaction';
    }
    else {
      Url = 'car/CarinfoRequest';
      responseMsg = ' 검토요청 ';
    }
  
    if(confirm("차량 정보를 삭제" + responseMsg  + "하시겠습니까?")) { 
      const validationError = validateDelForm();

      if (validationError) {
        errorMsgPopup(validationError);
        return;
      }

      try {
        const params = {
          pGUBUN: 'D',
          pPRECARID: carInfo.PRECARID,
          pCARID: carInfo.CARID,
          pCARNO: '',
          pRENTALTYPE: '',
          pMGMTSTATUS: '',
          pCARCD: '',
          pUSEFUEL: '',
          pRENTALCOMP: '',
          pCARACQUIREDDT: '',
          pRENTALEXFIREDDT: '',
          pCARREGDATE: '',
          pCARPRICE: '',
          pRENTALPRICE: '',
          pINSURANCE: '',
          pDEDUCTIONYN: '',
          pORGGROUP: '',
          pORGCD: '',
          pPRIMARYMNGEMPNO: '',
          pPRIMARYMNGEMPNM: '',
          pPRIMARYMNGMOBILE: '',
          pPRIMARYGARAGEADDR: '',
          pSAFETYMANAGER: '',
          pFIREEXTINGUISHER: '',
          pUNDER26AGEEMPNO: '',
          pUNDER26AGEEMPNM: '',
          pUNDER26AGEJUMINBTRTHNO: '',
          pUNDER26AGECHGDT: '',
          pCARDNO: '',
          pEXFIREDT: '',
          pNOTICE: '',
          pREGEMPNO: user?.empNo || ''
        };

        const response = await fetchData(Url, params);

        if (!response.success) {
          throw new Error(response.errMsg || '차량정보 삭제' + responseMsg  + ' 중 오류가 발생했습니다.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;

            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

            errorMsgPopup(errMsg);
          } else {
            msgPopup("차량정보가 삭제" + responseMsg  + " 되었습니다.");
            onHide();
            onParentSearch();
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || '차량정보 삭제' + responseMsg  + ' 중 오류가 발생했습니다. 다시 시도해주세요.');
      } 
    }
  };
  const handleSearchCarInfo = async (data) => {
    let carId = '';
    if (data && data !== '' && data !== 'undefined') { 
      carId = data;
      setCarInfo({...carInfo, CARID: data});
      setChkCarId(data);
    }
    else {
      carId = carInfo.CARID;
    }

    if (!carId || carId === '') {
      msgPopup("차대번호를 입력해주세요.");
      return;
    }

    const carData = {
      pCARID: carId,
      pEMPNO: user?.empNo,
      pDEBUG: 'F' 
    };
    
    try {
      const response = await fetchData('car/CarinfoByCarId', carData);

      if (!response.success) {
        throw new Error(response.errMsg || '차량 정보 조회 중 오류가 발생했습니다.');
      } else {
          if(response.data === null) {
            setCarInfo({GUBUN: 'I', PRECARID: carId, CARID: carId, CARNO: '', RENTALTYPE: '', MGMTSTATUS: '', CARCD: '', USEFUEL: '', RENTALCOMP: '', CARACQUIREDDT: today, RENTALEXFIREDDT: today, CARREGDATE: today
                        , CARPRICE: '', RENTALPRICE: '', INSURANCE: '', DEDUCTIONYN: '', ORGGROUP: '', ORGCD: '', ORGNM: '', PRIMARYMNGEMPNO: '', PRIMARYMNGEMPNM: '', PRIMARYMNGMOBILE: '', PRIMARYGARAGEADDR: '', SAFETYMANAGER: ''
                        , FIREEXTINGUISHER: '', UNDER26AGEEMPNO: '', UNDER26AGEEMPNM: '', UNDER26AGEJUMINBTRTHNO: '', UNDER26AGECHGDT: '', CARDNO: '', EXFIREDT: '', NOTICE: ''});
            msgPopup("신규 등록 가능한 차대번호입니다.");
          } else { 
            if (response.errMsg !== '' || response.data[0].errCd !== '00') {          
              let errMsg = response.errMsg;

            if(response.data !== null && response.data.length > 0){
              if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
            }

            errorMsgPopup(errMsg);
          } else {
            //차량정보 컴포넌트에 바인딩
            const vReqStatus = response.data[0].REQSTATUS || '';
            const vReqGubun = response.data[0].REQGUBUN || '';
            const vTransfer_ReqStatus = response.data[0].TRANSFER_REQSTATUS || '';
            let bDataSet = true;

            setReqStatus(vReqStatus);
            setReqGubun(vReqGubun);
            setTransfer_ReqStatus(vTransfer_ReqStatus);
            
            if (vReqStatus === 'G') {
              if (vReqGubun === 'I') {
                msgPopup("해당차량은 신규 등록 요청 승인 대기중입니다.");
                bDataSet = false;
              } else if (vReqGubun === 'D') {
                msgPopup("해당차량은 삭제 요청 승인 대기중입니다.");
              } else if (vReqGubun === 'U') {
                msgPopup("해당차량은 수정 요청 승인 대기중입니다.");
              }
            }
            else if (vReqStatus === 'R') {
              if (vReqGubun === 'I') {
                msgPopup("해당차량은 신규 등록 검토 중입니다.");
                bDataSet = false;
              } else if (vReqGubun === 'D') {
                msgPopup("해당차량은 삭제 요청 검토 중입니다.");
              } else if (vReqGubun === 'U') {
                msgPopup("해당차량은 수정 요청 검토 중입니다.");
              }
            }
            else if (vTransfer_ReqStatus === 'R') {
              msgPopup("해당차량은 이관요청 승인 대기 중입니다.");
            }
            else if (vTransfer_ReqStatus === 'Y') {
              msgPopup("해당차량은 이관요청 인수 대기 중입니다.");
            }
            
            if (bDataSet) {
                setCarInfo({GUBUN: 'U', PRECARID: response.data[0].CARID, CARID: response.data[0].CARID, CARNO: response.data[0].CARNO, RENTALTYPE: response.data[0].RENTALTYPE, MGMTSTATUS: response.data[0].MGMTSTATUS, CARCD: response.data[0].CARCD, USEFUEL: response.data[0].USEFUEL
                          , RENTALCOMP: response.data[0].RENTALCOMP, CARACQUIREDDT: response.data[0].CARACQUIREDDT, RENTALEXFIREDDT: response.data[0].RENTALEXFIREDDT, CARREGDATE: response.data[0].CARREGDT, CARPRICE: response.data[0].CARPRICE
                          , RENTALPRICE: response.data[0].RENTALPRICE, INSURANCE: response.data[0].INSURANCE, DEDUCTIONYN: response.data[0].DEDUCTIONYN, ORGGROUP: response.data[0].ORG_GROUP, ORGCD: response.data[0].ORGCD, ORGNM: response.data[0].ORGNM
                          , PRIMARYMNGEMPNO: response.data[0].PRIMARY_MANAGER_EMPNO, PRIMARYMNGEMPNM: response.data[0].PRIMARY_MANAGER_EMPNM, PRIMARYMNGMOBILE: response.data[0].PRIMARY_MANAGER_MOBILE, PRIMARYGARAGEADDR: response.data[0].PRIMARY_GARAGE_ADDR, FIREEXTINGUISHER: response.data[0].FIREEXTINGUISHER
                          , SAFETYMANAGER: response.data[0].SAFETY_MANAGER, UNDER26AGEEMPNO: response.data[0].UNDER26AGE_EMPNO, UNDER26AGEEMPNM: response.data[0].UNDER26AGE_EMPNM, UNDER26AGEJUMINBTRTHNO: response.data[0].UNDER26AGE_JUMIN_BIRTH_NO
                          , UNDER26AGECHGDT: response.data[0].UNDER26AGE_CHGDT, CARDNO: response.data[0].CARDNO, EXFIREDT: response.data[0].EXFIREDT, NOTICE: response.data[0].NOTICE});
            } else {
                setCarInfo({GUBUN: 'I', PRECARID: carId, CARID: carId, CARNO: '', RENTALTYPE: '', MGMTSTATUS: '', CARCD: '', USEFUEL: '', RENTALCOMP: '', CARACQUIREDDT: today, RENTALEXFIREDDT: today, CARREGDATE: today
                            , CARPRICE: '', RENTALPRICE: '', INSURANCE: '', DEDUCTIONYN: '', ORGGROUP: '', ORGCD: '', ORGNM: '', PRIMARYMNGEMPNO: '', PRIMARYMNGEMPNM: '', PRIMARYMNGMOBILE: '', PRIMARYGARAGEADDR: '', SAFETYMANAGER: ''
                            , FIREEXTINGUISHER: '', UNDER26AGEEMPNO: '', UNDER26AGEEMPNM: '', UNDER26AGEJUMINBTRTHNO: '', UNDER26AGECHGDT: '', CARDNO: '', EXFIREDT: '', NOTICE: ''});
            }
          }
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량 정보 조회 중 오류가 발생했습니다.');
    }
  };

  const handleMaxLength = (e, maxlength) => {
    const value = e.target.value;
    
    e.target.value = value.substring(0, maxlength);
  }

  const handleNumberMaxLength = (e, maxlength) => {
    const value = e.target.value;
    
    e.target.value = value.replace(/[^0-9]/g, '').substring(0, maxlength);
  } 

  if (!show) return null;
  return (
    <Modal show={show} onHide={onHide} onParentSearch={onParentSearch} centered style={{overflowY: 'hidden'}} dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>기동장비정보 관리</Modal.Title>
      </Modal.Header>
      <Modal.Body className='formColWrap'>
        <div className='row'>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carId">차대번호<font color='red'>*</font></label>
            <input type="text" className={`form-control ${styles.formControl}`} id="carId" value={carInfo.CARID} disabled={`${vStyle.vDISABLED}`} placeholder="차대번호를 입력하세요" onInput={(e) => {handleMaxLength(e, 30)}} onChange={(e) => {setCarInfo({ ...carInfo, CARID: e.target.value })}} />
            <button id="btnCarId" type="button" className={`btn btn-secondary flex-shrink-0`} style={{display:`${vStyle.vDISPLAY}`}} disabled={`${vStyle.vDISABLED}`} onClick={(e) => handleSearchCarInfo(carInfo.CARID)}>확인</button>
            <button className={`btn btn-sm btn-outline-secondary ${styles.deleteButton} flex-shrink-0`} style={{display:`${vStyle.vBTNDEL}`}} onClick={handleDelete}>{delBtnNm}</button>
          </div>
          <div className="col-6 d-flex justify-content-end align-items-center">
            <label className="form-guide"><font color='red'>*</font>은 필수 입력 항목입니다.</label>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carNo">차량번호<font color='red'>*</font></label>
            <input type="text" value={carInfo.CARNO} className={`form-control ${styles.formControl}`} id="carNo" placeholder="차량번호을 입력하세요" onInput={(e) => {handleMaxLength(e, 20)}} onChange={(e) => {setCarInfo({ ...carInfo, CARNO: e.target.value })}} />
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="mgmtStatus">운용관리상태<font color='red'>*</font></label>
            <select id="mgmtStatus" className={`form-select ${styles.formSelect}`} value={carInfo.MGMTSTATUS} onChange={(e) => {setCarInfo({ ...carInfo, MGMTSTATUS: e.target.value })}}>
              <option value="">선택하세요</option>
              {['운행', '유휴', '반납'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalType">임대구분<font color='red'>*</font></label>
            <select id="rentalType" className={`form-select ${styles.formSelect}`} value={carInfo.RENTALTYPE} onChange={(e) => {setCarInfo({ ...carInfo, RENTALTYPE: e.target.value })}}>
              <option value="">선택하세요</option>
              {['렌탈', '리스'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="useFuel">사용연료<font color='red'>*</font></label>
            <select id="useFuel" className={`form-select ${styles.formSelect}`} value={carInfo.USEFUEL} onChange={(e) => {setCarInfo({ ...carInfo, USEFUEL: e.target.value })}}>
              <option value="">선택하세요</option>
              {['LPG', '휘발유', '경유'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carcd">차량<font color='red'>*</font></label>
            <select id="carcd" className={`form-select ${styles.formSelect}`} value={carInfo.CARCD} onChange={(e) => {setCarInfo({ ...carInfo, CARCD: e.target.value })}}>
              <option value="">선택하세요</option>
              {carList.map((item) => <option key={item.CARCD} value={item.CARCD}>{item.CARNM}</option>)}
            </select>
          </div>
          <div className="col-6 d-flex"></div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalComp">렌터카업체</label>
            <select id="rentalComp" className={`form-select ${styles.formSelect}`} value={carInfo.RENTALCOMP} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, RENTALCOMP: e.target.value })}}>
              <option value="">선택하세요</option>
              {rentalCompList.map((item) => <option key={item.RENTALCOMP} value={item.RENTALCOMP}>{item.RENTALCOMP}</option>)}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carAquireddt">차량취득일</label>
            <input type="date" id="carAquireddt" className={`form-control ${styles.formControl}`} value={carInfo.CARACQUIREDDT} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, CARACQUIREDDT: e.target.value })}} />
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalExfiredDt">계약만료일</label>
            <input type="date" id="rentalExfiredDt" className={`form-control ${styles.formControl}`} value={carInfo.RENTALEXFIREDDT} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, RENTALEXFIREDDT: e.target.value })}} />
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carRegDate">최초등록일</label>
            <input type="date" id="carRegDate" className={`form-control ${styles.formControl}`} value={carInfo.CARREGDATE} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, CARREGDATE: e.target.value })}} />
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carPrice">차량가</label>
            <input type="number" id="carPrice" value={carInfo.CARPRICE} className={`form-control ${styles.formControl}`} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, CARPRICE: e.target.value })}} />
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalPrice">월납부액</label>
            <input type="number" id="rentalPrice" value={carInfo.RENTALPRICE} className={`form-control ${styles.formControl}`} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, RENTALPRICE: e.target.value })}} />
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="insurance">보험료</label>
            <input type="number" id="insurance" value={carInfo.INSURANCE} className={`form-control ${styles.formControl}`} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, INSURANCE: e.target.value })}} />
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="deductionYn">공제여부</label>
            <select id="deductionYn" value={carInfo.DEDUCTIONYN} className={`form-select ${styles.formSelect}`} disabled={`${vDisabled}`} onChange={(e) => {setCarInfo({ ...carInfo, DEDUCTIONYN: e.target.value })}}>
              <option value="">선택하세요</option>
              {['공제', '불공제'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="orgGroup">본부<font color='red'>*</font></label>
            <select id="orgGroup" value={carInfo.ORGGROUP} className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, ORGGROUP: e.target.value })}}>
              <option value="">선택하세요</option>
              {['본사', 'Biz', '선로', '설계', '인프라운용본부', '재배치'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="orgNm">조직<font color='red'>*</font></label>
            <CommonPopup show={showOrgPopup} onHide={() => setShowOrgPopup(false)} title={'조직 선택'}>
              <div>
                <OrgSearchPopup
                  onClose={() => setShowOrgPopup(false)}
                  onConfirm={(selectedRows) => {
                    const orgNm = selectedRows.length > 0 ? selectedRows[0].ORGNM : ''
                    const orgCd = selectedRows.length > 0 ? selectedRows[0].ORGCD : ''
                    setCarInfo({ ...carInfo, ORGCD: orgCd, ORGNM: orgNm });
                  }} 
                  pGUBUN="CAROPEREMPNO" //차량용 트리 시(_fix 테이블 사용)
                  isMulti={false}
                  initialSelectedOrgs={carInfo.ORGCD} //초기 선택된 조직
                  isChecked={true} //체크박스 사용 여부
                />
              </div>
            </CommonPopup>
            <input type="text" className={`form-control ${styles.formControl}`} id="orgNm" value={carInfo.ORGNM} disabled="disabled"/>
            <button type="button" className={`btn btn-secondary ${styles.btn} flex-shrink-0`} onClick={(e) => {setShowOrgPopup(true)}}>선택</button>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="primaryMngEmpNm">운전자(정)<font color='red'>*</font></label>
            <input type="text" value={carInfo.PRIMARYMNGEMPNM} className={`form-control ${styles.formControl}`} id="primaryMngEmpNm" disabled="disabled"/>
            <button type="button" className={`btn btn-secondary ${styles.btn} flex-shrink-0`} onClick={(e) => {setShowMngUserPopup(true)}}>선택</button>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="primaryMngMobile">연락처</label>
            <input type="text" value={carInfo.PRIMARYMNGMOBILE} className={`form-control ${styles.formControl}`} id="primaryMngMobile" disabled="disabled"/>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="safetyManager">안전관리자</label>
            <select id="safetyManager" value={carInfo.SAFETYMANAGER} className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, SAFETYMANAGER: e.target.value })}}>
              <option value="">선택하세요</option>
              {['Y', 'N'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="fireExtinguisher">소화기보유</label>
            <select id="fireExtinguisher" value={carInfo.FIREEXTINGUISHER} className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, FIREEXTINGUISHER: e.target.value })}}>
              <option value="">선택하세요</option>
              {['보유', '미보유'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="primaryGarageAddr">차고지주소<font color='red'>*</font></label>
            <input type="text" value={carInfo.PRIMARYGARAGEADDR} className={`form-control ${styles.formControl}`} id="primaryGarageAddr" onChange={(e) => {setCarInfo({ ...carInfo, PRIMARYGARAGEADDR: e.target.value })}}/>
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100">만26세미만운전자</label>
            <button type="button" className={`btn btn-secondary ${styles.btn}`} onClick={(e) => {setShowUnder26UserPopup(true)}}>선택</button>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="under26AgeEmpNo">사번 </label>
            <input type="text" value={carInfo.UNDER26AGEEMPNO} className={`form-control ${styles.formControl}`} id="under26AgeEmpNo" disabled="disabled"/>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="under26AgeEmpNm">성명 </label>
            <input type="text" value={carInfo.UNDER26AGEEMPNM} className={`form-control ${styles.formControl}`} id="under26AgeEmpNm" disabled="disabled"/>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="under26AgeJuminBirthNo">생년월일 </label>
            <input type="text" value={carInfo.UNDER26AGEJUMINBTRTHNO} className={`form-control ${styles.formControl}`} id="under26AgeJuminBirthNo" placeholder="주민번호 앞자리" onInput={(e) => {handleNumberMaxLength(e, 6)}} onChange={(e) => {setCarInfo({ ...carInfo, UNDER26AGEJUMINBTRTHNO: e.target.value })}}/>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="primaryMngMobile">변경기준일 </label>
            <input type="date" className={`form-control ${styles.formControl}`} id="under26AgeChgDt" value={carInfo.UNDER26AGECHGDT} onChange={(e) => {setCarInfo({ ...carInfo, UNDER26AGECHGDT: e.target.value })}}/>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="cardNo">주유카드</label>
            <input type="text" value={carInfo.CARDNO} className={`form-control ${styles.formControl}`} id="cardNo"  disabled="disabled" onChange={(e) => {setCarInfo({ ...carInfo, CARDNO: e.target.value })}}/>
            <button type="button" className={`btn btn-secondary ${styles.btn}`} onClick={(e) => {setShowFuelCardPopup(true)}}>선택</button>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="exfireDt">유효기간</label>
            <input type="text" value={carInfo.EXFIREDT} className={`form-control ${styles.formControl}`} id="exfireDt" disabled="disabled" onChange={(e) => {setCarInfo({ ...carInfo, EXFIREDT: e.target.value })}}/>
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="notice">비고</label>
            <input type="text" value={carInfo.NOTICE} className={`form-control ${styles.formControl}`} id="notice" onChange={(e) => {setCarInfo({ ...carInfo, NOTICE: e.target.value })}}/>
          </div>
        </div>
      </Modal.Body>   
      <FuelCardPopup show={showFuelCardPopup} onHide={() => setShowFuelCardPopup(false)}
        onConfirm={(selectedRows) => {
          const cardNo = selectedRows.length > 0 ? selectedRows[0].CARDNO : '';
          const exfireDt = selectedRows.length > 0 ? selectedRows[0].EXFIREDT : '';
          setCarInfo({ ...carInfo, CARDNO: cardNo, EXFIREDT: exfireDt });
        }}
        checkCarNo={carInfo.CARNO}> //차량번호를 넘겨서 주유카드 조회
      </FuelCardPopup>
      <MngUserListPopup show={showMngUserPopup} onHide={() => setShowMngUserPopup(false)}
        onConfirm={(selectedRows) => {
          const userEmpNo = selectedRows.length > 0 ? selectedRows[0].EMPNO : '';
          const userEmpNm = selectedRows.length > 0 ? selectedRows[0].EMPNM : '';
          const userMobile = selectedRows.length > 0 ? selectedRows[0].MOBILE : '';
          setCarInfo({ ...carInfo, PRIMARYMNGEMPNO: userEmpNo, PRIMARYMNGEMPNM: userEmpNm, PRIMARYMNGMOBILE: userMobile });
        }}>
      </MngUserListPopup>
      <Under26UserListPopup show={showUnder26UserPopup} onHide={() => setShowUnder26UserPopup(false)}
        onConfirm={(selectedRows) => {
          const userEmpNm = selectedRows.length > 0 ? selectedRows[0].EMPNM : '';
          const userEmpNo = selectedRows.length > 0 ? selectedRows[0].EMPNO : '';
          setCarInfo({ ...carInfo, UNDER26AGEEMPNO: userEmpNo, UNDER26AGEEMPNM: userEmpNm });
        }}>
      </Under26UserListPopup>
      <Modal.Footer>
        <button className='btn btnSecondary' onClick={onHide}>취소</button>
        <button className='btn btnPrimary' onClick={handleSubmit}>{confirmBtnNm}</button>
      </Modal.Footer>
    </Modal>
  )
};

export default CarInfoDetailPopup;