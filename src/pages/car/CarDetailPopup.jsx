import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import commonUtils from '../../utils/common.js';
import { fetchData } from '../../utils/dataUtils.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import Modal from 'react-bootstrap/Modal';
import styles from './CarInfoDetailPopup.module.css';

const CarInfoDetailPopup = ({ show, onHide, data }) => {
  const today = new Date().toISOString().split('T')[0];
  const [carId, setCarId] = useState('');
  const [carList, setCarList] = useState({});
  const [carInfo, setCarInfo] = useState({GUBUN: '', CARID: '', CARNO: '', RENTALTYPE: '', MGMTSTATUS: '', CARCD: '', USEFUEL: '', MAINCOMPPHONE: '', CARACQUIREDDT: '', RENTALEXFIREDDT: '', CARREGDATE: ''
                                          , CARPRICE: '', RENTALPRICE: '', INSURANCE: '', DEDUCTIONYN: '', ORGGROUP: '', ORGCD: '', PRIMARYMNGEMPNM: '', PRIMARYMNGMOBILE: '', PRIMARYGARAGEADDR: '', SAFETYMANAGER: ''
                                          , NOTICE: '', UNDER26AGEREMPNO: '', UNDER26AGEREMPNM: '', UNDER26AGERJUMINBTRTHNO: '', UNDER26AGECHGDT: '', CARDNO: '', EXFIREDT: '', NOTICE2: ''});
                                          
  const navigate = useNavigate();
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Component에 들어갈 데이터 로딩
      try {
        setCarId(data);
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
    };

    initializeComponent();

    //return () => {
    //};
  }, []);
  
  useEffect(() => {
    if (!show) {
      //setCarInfo({});
    } 
    else {
    }
  }, [show]);  
  
  const validateForm = () => {
    if (!carId || !carNo || !rentalType || !carCd || !useFuel || !mainCompPhone || !carSize || !orgGroup || !orgCd) {
      return "필수 입력 항목을 모두 채워주세요.";
    }

    const carNoValidation = commonUtils.validateVarcharLength(carNo, 20, '차량번호');
    if (!carNoValidation.valid) return carNoValidation.error;

    const carIdValidation = commonUtils.validateVarcharLength(carId, 30, '차대번호');
    if (!carIdValidation.valid) return carIdValidation.error;

    const mainCompPhoneValidation = commonUtils.validateVarcharLength(mainCompPhone, 50, '대표번호');
    if (!mainCompPhoneValidation.valid) return mainCompPhoneValidation.error;

    const primaryGarageAddrValidation = commonUtils.validateVarcharLength(primaryGarageAddr, 200, '차고지주소(정)');
    if (!primaryGarageAddrValidation.valid) return primaryGarageAddrValidation.error;

    const noticeValidation = commonUtils.validateVarcharLength(notice, 1500, '기타사항');
    if (!noticeValidation.valid) return noticeValidation.error;

    const notice2Validation = commonUtils.validateVarcharLength(notice2, 1500, '비고');
    if (!notice2Validation.valid) return notice2Validation.error;

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    msgPopup("준비중입니다.");
    /* const validationError = validateForm();
    if (validationError) {
      errorMsgPopup(validationError);
      return;
    }

    try {
      const response = await fetchData('auth/join/save', carInfo);

      if (!response.success) {
        throw new Error(response.errMsg || '가입정보가 잘못되었습니다.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("가입되었습니다.");
          navigate('/'); // Changed from '/login'
          onHide();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } */
  };

  const handleSearchCarInfo = async () => {
    //차량정보 조회
    alert(1);
    if (!carInfo.CARID || carInfo.CARID === '') {
      return "차대번호를 입력해주세요.";
    }

    const carIdValidation = commonUtils.validateVarcharLength(carId, 30, '차대번호');
    if (!carIdValidation.valid) return carIdValidation.error;

    const carData = {
      pCARID: carInfo.CARID,
      pDEBUG: 'F' 
    };
    
    try {
      const response = await fetchData('car/CarinfoByCarId', carData);

      if (!response.success) {
        throw new Error(response.errMsg || '차량 정보 조회 중 오류가 발생했습니다.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          if(response.data.length === 0){
            msgPopup("신규 등록 가능한 차대번호입니다.");
          }
          else{
            //차량정보 컴포넌트에 바인딩
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
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>기동장비정보 관리</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label className="form-label">차대번호 </label>
          <input type="text" className={`form-control ${styles.formControl}`} id="carId" style={{width:180 +'px'}} placeholder="차대번호를 입력하세요" onChange={(e) => {setCarInfo({ ...carInfo, CARID: e.target.value })}} />
          <button type="button" className={`btn btn-secondary ${styles.btn}`} style={{width:60 +'px', float:'right', marginTop:-30+'px', marginRight:190+'px'}} onClick={handleSearchCarInfo}>확인</button>
        </div>
        <div className="mb-3">
          <label className="form-label">차량번호 </label>
          <input type="text" className={`form-control ${styles.formControl}`} id="carNo" placeholder="차량번호을 입력하세요" onChange={(e) => {setCarInfo({ ...carInfo, CARNO: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">임대구분 </label>
          <select id="rentalType" className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, RENTALTYPE: e.target.value })}}>
            <option value="">선택하세요</option>
            {['렌탈', '리스'].map((type) => (<option key={type} value={type}>{type}</option>))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">운용관리상태 </label>
          <select id="mgmtStatus" className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, MGMTSTATUS: e.target.value })}}>
            <option value="">선택하세요</option>
            {['운행', '유휴', '반납'].map((type) => (<option key={type} value={type}>{type}</option>))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">차량</label>
          <select id="carcd" className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, CARCD: e.target.value })}}>
            <option value="">선택하세요</option>
            {carList.map((item) => <option key={item.CARCD} value={item.CARCD}>{item.CARNM}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">차량</label>
          <select id="usefuel" className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, USEFUEL: e.target.value })}}>
            <option value="">선택하세요</option>
            {['운행', '유휴', '반납'].map((type) => (<option key={type} value={type}>{type}</option>))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">대표번호</label>
          <input type="text" id="mainCompPhone" className={`form-control ${styles.formControl}`} placeholder="대표번호를 입력하세요" onChange={(e) => {setCarInfo({ ...carInfo, MAINCOMPPHONE: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">차량취득일</label>
          <input type="date" id="carAquireddt" className={`form-control ${styles.formControl}`} defaultValue={today} onChange={(e) => {setCarInfo({ ...carInfo, CARACQUIREDDT: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">계약만료일</label>
          <input type="date" id="rentalExfiredDt" className={`form-control ${styles.formControl}`} defaultValue={today} onChange={(e) => {setCarInfo({ ...carInfo, RENTALEXFIREDDT: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">최초등록일</label>
          <input type="date" id="carRegDate" className={`form-control ${styles.formControl}`} defaultValue={today} onChange={(e) => {setCarInfo({ ...carInfo, CARREGDATE: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">차량가</label>
          <input type="number" id="carPrice" className={`form-control ${styles.formControl}`} onChange={(e) => {setCarInfo({ ...carInfo, CARPRICE: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">월납부액</label>
          <input type="number" id="rentalPrice" className={`form-control ${styles.formControl}`} onChange={(e) => {setCarInfo({ ...carInfo, RENTALPRICE: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">보험료</label>
          <input type="number" id="insurance" className={`form-control ${styles.formControl}`} onChange={(e) => {setCarInfo({ ...carInfo, INSURANCE: e.target.value })}} />
        </div>
        <div className="mb-3">
          <label className="form-label">공제여부</label>
          <select id="deductionYn" className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, USEFUEL: e.target.value })}}>
            <option value="">선택하세요</option>
            {['공제', '불공제'].map((type) => (<option key={type} value={type}>{type}</option>))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">본부</label>
          <select id="orgGroup" className={`form-select ${styles.formSelect}`} onChange={(e) => {setCarInfo({ ...carInfo, USEFUEL: e.target.value })}}>
            <option value="">선택하세요</option>
            {['본사', 'Biz', '선로', '설계', '인프라운용본부', '재배치'].map((type) => (<option key={type} value={type}>{type}</option>))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">조직</label>
          <input type="text" className={`form-control ${styles.formControl}`} id="orgCd" disabled="disabled" onChange={(e) => {setCarInfo({ ...carInfo, ORGCD: e.target.value })}}/>
          <button type="button" className={`${styles.btn} btn-close`} onClick={(e) => {alert('작업중')}}> + </button>
        </div>
        <div className="mb-3">
          <label className="form-label">운전자(정)</label>
          <input type="text" className={`form-control ${styles.formControl}`} id="primaryMngEmpNm" disabled="disabled" onChange={(e) => {setCarInfo({ ...carInfo, PRIMARYMNGEMPNM: e.target.value })}}/>
          <input type="text" className={`form-control ${styles.formControl}`} id="primaryMngMobile" disabled="disabled" onChange={(e) => {setCarInfo({ ...carInfo, PRIMARYMNGMOBILE: e.target.value })}}/>
          <button type="button" className={`${styles.btn} btn-close`} onClick={(e) => {alert('작업중')}}> + </button>
        </div>
        <div className="mb-3">
          <label className="form-label">차고지주소</label>
          <input type="text" className={`form-control ${styles.formControl}`} id="primaryGarageAddr" onChange={(e) => {setCarInfo({ ...carInfo, PRIMARYGARAGEADDR: e.target.value })}}/>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className={`btn btn-secondary ${styles.btn}`} onClick={onHide}>취소</button>
        <button className={`btn btn-primary ${styles.btn}`} onClick={handleSubmit}>확인</button>
      </Modal.Footer>
    </Modal>
  );
};

export default CarInfoDetailPopup;