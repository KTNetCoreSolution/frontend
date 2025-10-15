import { useState, useEffect } from 'react';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import { fetchData } from '../../utils/dataUtils.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import Modal from 'react-bootstrap/Modal';
import styles from './CarDetailPopup.module.css';

const CarInfoDetailForUserPopup = ({ show, onHide, onParentSearch, data }) => {
  const { user } = useStore();
  const today = commonUtils.getTodayDate();
  const [carList, setCarList] = useState({});
  const [rentalCompList, setRentalCompList] = useState({});
  const initialCarInfo = {GUBUN: '', PRECARID: '', CARID: '', CARNO: '', RENTALTYPE: '', MGMTSTATUS: '', CARCD: '', USEFUEL: '', RENTALCOMP: '', CARACQUIREDDT: today, RENTALEXFIREDDT: today, CARREGDATE: today
                          , CARPRICE: '', RENTALPRICE: '', INSURANCE: '', DEDUCTIONYN: '', ORGGROUP: '', ORGCD: '', ORGNM: '', PRIMARYMNGEMPNO: '', PRIMARYMNGEMPNM: '', PRIMARYMNGMOBILE: '', PRIMARYGARAGEADDR: '', SAFETYMANAGER: ''
                          , FIREEXTINGUISHER: '', UNDER26AGEEMPNO: '', UNDER26AGEEMPNM: '', UNDER26AGEJUMINBTRTHNO: '', UNDER26AGECHGDT: '', CARDNO: '', EXFIREDT: '', NOTICE: ''};
  const [carInfo, setCarInfo] = useState(initialCarInfo);
  
  useEffect(() => {

    // 컴포넌트 언마운트 시 테이블 정리
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
    if (show) {
      if(data !== ''){ 
        setCarInfo({...carInfo, GUBUN:'U', PRECARID: data, CARID: data});

        handleSearchCarInfo(data); //차량정보 조회
      }
      else {
        setCarInfo({...carInfo, GUBUN:''});
      }
    }
  }, [show]);

  const handleSearchCarInfo = async (data) => {
    let carId = '';
    if (data && data !== '' && data !== 'undefined') { 
      carId = data;
      setCarInfo({...carInfo, CARID: data});
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
            setCarInfo({GUBUN: 'U', PRECARID: response.data[0].CARID, CARID: response.data[0].CARID, CARNO: response.data[0].CARNO, RENTALTYPE: response.data[0].RENTALTYPE, MGMTSTATUS: response.data[0].MGMTSTATUS, CARCD: response.data[0].CARCD, USEFUEL: response.data[0].USEFUEL
                      , RENTALCOMP: response.data[0].RENTALCOMP, CARACQUIREDDT: response.data[0].CARACQUIREDDT, RENTALEXFIREDDT: response.data[0].RENTALEXFIREDDT, CARREGDATE: response.data[0].CARREGDT, CARPRICE: response.data[0].CARPRICE
                      , RENTALPRICE: response.data[0].RENTALPRICE, INSURANCE: response.data[0].INSURANCE, DEDUCTIONYN: response.data[0].DEDUCTIONYN, ORGGROUP: response.data[0].ORG_GROUP, ORGCD: response.data[0].ORGCD, ORGNM: response.data[0].ORGNM
                      , PRIMARYMNGEMPNM: response.data[0].PRIMARY_MANAGER_EMPNM, PRIMARYMNGMOBILE: response.data[0].PRIMARY_MANAGER_MOBILE, PRIMARYGARAGEADDR: response.data[0].PRIMARY_GARAGE_ADDR, FIREEXTINGUISHER: response.data[0].FIREEXTINGUISHER, SAFETYMANAGER: response.data[0].SAFETY_MANAGER
                      , UNDER26AGEEMPNO: response.data[0].UNDER26AGE_EMPNO, UNDER26AGEEMPNM: response.data[0].UNDER26AGE_EMPNM, UNDER26AGEJUMINBTRTHNO: response.data[0].UNDER26AGE_JUMIN_BIRTH_NO
                      , UNDER26AGECHGDT: response.data[0].UNDER26AGE_CHGDT, CARDNO: response.data[0].CARDNO, EXFIREDT: response.data[0].EXFIREDT, NOTICE: response.data[0].NOTICE});
          }
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량 정보 조회 중 오류가 발생했습니다.');
    }
  };

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
            <input type="text" className={`form-control ${styles.formControl}`} id="carId" value={carInfo.CARID} disabled="disabled"/>
          </div>
          <div className="col-6 d-flex justify-content-end align-items-center">
            <label className="form-guide"><font color='red'>*</font>은 필수 입력 항목입니다.</label>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carNo">차량번호<font color='red'>*</font></label>
            <input type="text" value={carInfo.CARNO} className={`form-control ${styles.formControl}`} id="carNo" disabled="disabled" />
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="mgmtStatus">운용관리상태<font color='red'>*</font></label>
            <select id="mgmtStatus" className={`form-select ${styles.formSelect}`} value={carInfo.MGMTSTATUS} disabled="disabled">
              <option value="">미선택</option>
              {['운행', '유휴', '반납'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalType">임대구분<font color='red'>*</font></label>
            <select id="rentalType" className={`form-select ${styles.formSelect}`} value={carInfo.RENTALTYPE} disabled="disabled">
              <option value="">선택하세요</option>
              {['렌탈', '리스'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="useFuel">사용연료<font color='red'>*</font></label>
            <select id="useFuel" className={`form-select ${styles.formSelect}`} value={carInfo.USEFUEL} disabled="disabled">
              <option value="">선택하세요</option>
              {['LPG', '휘발유', '경유'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carcd">차량<font color='red'>*</font></label>
            <select id="carcd" className={`form-select ${styles.formSelect}`} value={carInfo.CARCD} disabled="disabled">
              <option value="">선택하세요</option>
              {carList.map((item) => <option key={item.CARCD} value={item.CARCD}>{item.CARNM}</option>)}
            </select>
          </div>
          <div className="col-6 d-flex"></div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalComp">렌터카업체</label>
            <select id="rentalComp" className={`form-select ${styles.formSelect}`} value={carInfo.RENTALCOMP} disabled="disabled">
              <option value="">미선택</option>
              {rentalCompList.map((item) => <option key={item.RENTALCOMP} value={item.RENTALCOMP}>{item.RENTALCOMP}</option>)}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carAquireddt">차량취득일</label>
            <input type="date" id="carAquireddt" className={`form-control ${styles.formControl}`} value={carInfo.CARACQUIREDDT} disabled="disabled" />
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalExfiredDt">계약만료일</label>
            <input type="date" id="rentalExfiredDt" className={`form-control ${styles.formControl}`} value={carInfo.RENTALEXFIREDDT} disabled="disabled" />
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carRegDate">최초등록일</label>
            <input type="date" id="carRegDate" className={`form-control ${styles.formControl}`} value={carInfo.CARREGDATE} disabled="disabled" />
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="carPrice">차량가</label>
            <input type="number" id="carPrice" value={carInfo.CARPRICE} className={`form-control ${styles.formControl}`} disabled="disabled" />
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="rentalPrice">월납부액</label>
            <input type="number" id="rentalPrice" value={carInfo.RENTALPRICE} className={`form-control ${styles.formControl}`} disabled="disabled" />
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="insurance">보험료</label>
            <input type="number" id="insurance" value={carInfo.INSURANCE} className={`form-control ${styles.formControl}`} disabled="disabled"/>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="deductionYn">공제여부</label>
            <select id="deductionYn" value={carInfo.DEDUCTIONYN} className={`form-select ${styles.formSelect}`} disabled="disabled">
              <option value="">미선택</option>
              {['공제', '불공제'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="orgGroup">본부<font color='red'>*</font></label>
            <select id="orgGroup" value={carInfo.ORGGROUP} className={`form-select ${styles.formSelect}`} disabled="disabled">
              <option value="">선택하세요</option>
              {['본사', 'Biz', '선로', '설계', '인프라운용본부', '재배치'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="orgNm">조직<font color='red'>*</font></label>
            <input type="text" className={`form-control ${styles.formControl}`} id="orgNm" value={carInfo.ORGNM} disabled="disabled"/>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="primaryMngEmpNm">운전자(정)<font color='red'>*</font></label>
            <input type="text" value={carInfo.PRIMARYMNGEMPNM} className={`form-control ${styles.formControl}`} id="primaryMngEmpNm" disabled="disabled"/>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="primaryMngMobile">연락처 </label>
            <input type="text" value={carInfo.PRIMARYMNGMOBILE} className={`form-control ${styles.formControl}`} id="primaryMngMobile" disabled="disabled"/>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="safetyManager">안전관리자</label>
            <select id="safetyManager" value={carInfo.SAFETYMANAGER} className={`form-select ${styles.formSelect}`} disabled="disabled">
              <option value="">미선택</option>
              {['Y', 'N'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="fireExtinguisher">소화기보유</label>
            <select id="fireExtinguisher" value={carInfo.FIREEXTINGUISHER} className={`form-select ${styles.formSelect}`} disabled="disabled">
              <option value="">미선택</option>
              {['보유', '미보유'].map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="primaryGarageAddr">차고지주소</label>
            <input type="text" value={carInfo.PRIMARYGARAGEADDR} className={`form-control ${styles.formControl}`} id="primaryGarageAddr" disabled="disabled"/>
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100">만26세미만운전자</label>
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
            <input type="text" value={carInfo.UNDER26AGEJUMINBTRTHNO} className={`form-control ${styles.formControl}`} id="under26AgeJuminBirthNo" placeholder="주민번호 앞자리" disabled="disabled"/>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="primaryMngMobile">변경기준일 </label>
            <input type="date" className={`form-control ${styles.formControl}`} id="under26AgeChgDt" value={carInfo.UNDER26AGECHGDT} disabled="disabled"/>
          </div>
        </div>
        <div className="row">
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="cardNo">주유카드</label>
            <input type="text" value={carInfo.CARDNO} className={`form-control ${styles.formControl}`} id="cardNo" disabled="disabled"/>
          </div>
          <div className="col-6 d-flex">
            <label className="form-label w100" htmlFor="exfireDt">유효기간</label>
            <input type="text" value={carInfo.EXFIREDT} className={`form-control ${styles.formControl}`} id="exfireDt" disabled="disabled"/>
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="notice">비고</label>
            <input type="text" value={carInfo.NOTICE} className={`form-control ${styles.formControl}`} id="notice" disabled="disabled" />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className='btn btnSecondary' onClick={onHide}>닫기</button>
      </Modal.Footer>
    </Modal>
  )
};

export default CarInfoDetailForUserPopup;