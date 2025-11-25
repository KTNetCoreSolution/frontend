import { useState, useEffect, useRef } from 'react';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import { fetchData } from '../../utils/dataUtils.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { hasPermission, hasLvCdPermission } from '../../utils/authUtils.js';
import Modal from 'react-bootstrap/Modal';
import styles from './RequestDetailPopup.module.css';

const RequestDetailPopup = ({ show, onHide, onParentSearch, data }) => {
  const { user } = useStore();
  const [carList, setCarList] = useState({});
  const [rentalCompList, setRentalCompList] = useState({});
  const initialCarInfo = {REQUESTDT: '', REQSTATUS: '', GUBUN: '', CARID: '', CARNO: '', RENTALTYPE: '', MGMTSTATUS: '', CARCD: '', USEFUEL: '', RENTALCOMP: '', CARACQUIREDDT: '', RENTALEXFIREDDT: '', CARREGDATE: ''
                          , CARPRICE: '', RENTALPRICE: '', INSURANCE: '', DEDUCTIONYN: '', ORGGROUP: '', ORGCD: '', ORGNM: '', PRIMARYMNGEMPNO: '', PRIMARYMNGEMPNM: '', PRIMARYMNGMOBILE: '', PRIMARYGARAGEADDR: '', SAFETYMANAGER: ''
                          , FIREEXTINGUISHER: '', UNDER26AGEEMPNO: '', UNDER26AGEEMPNM: '', UNDER26AGEJUMINBTRTHNO: '', UNDER26AGECHGDT: '', CARDNO: '', EXFIREDT: '', NOTICE: '', REQUEST_ORGCD: '', REQUEST_EMPNO: ''};
  const [carInfo, setCarInfo] = useState(initialCarInfo);
  const [confirmBtnNm, setConfirmBtnNm] = useState('');

  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 300));

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
    setConfirmBtnNm('');

    if (show) {
      if(data !== null && data !== undefined) {
        handleSearch(data); //차량정보 조회
      }
      else {
        msgPopup("잘못된 접근입니다.");
        onHide();
        onParentSearch();
      }
    }
  }, [show]);

  const setReqStatus = async (reqStatus, gubun, seq) => {
    /*if (data.REQSTATUS !== 'R' || (reqStatus === 'Y' && !hasPermission(user?.auth, 'permissions')) || (reqStatus === 'N' && !hasPermission(user?.auth, 'permissions')) || (reqStatus === 'C' && !hasPermission(user?.auth, 'carManager'))) {
        msgPopup("잘못된 접근입니다.");
        onHide();
        onParentSearch();
    }
    else {
      const responseMsg = '차량정보 ' + (gubun === 'I' ? '추가' : gubun === 'U' ? '수정' : '삭제') + ' 요청을 ' + (reqStatus === 'Y' ? '승인' : reqStatus === 'N' ? '반려' : '취소');

      if(confirm(responseMsg + ' 하시겠습니까?')) { 
        try {
          const params = {
            pREQSTATUS: reqStatus,
            pSEQ: seq,
            pEMPNO: user?.empNo
          };

          const response = await fetchData('car/RequestConfirmTransaction', params);

          if (!response.success) {
            throw new Error(response.errMsg || responseMsg + ' 처리 중 오류가 발생했습니다.');
          } else {
            if (response.errMsg !== '' || response.data[0].errCd !== '00') {
              let errMsg = response.errMsg;

              if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

              errorMsgPopup(errMsg);
            } else {
              msgPopup(responseMsg + ' 처리가 완료되었습니다.');
              onHide();
              onParentSearch();
            }
          }
        } catch (error) {
          console.error('Registration error:', error);
          errorMsgPopup(error.message || responseMsg + ' 처리 중 오류가 발생했습니다.');
        } 
      }
    }*/
   
    if (((reqStatus === 'Y' || reqStatus === 'G' || reqStatus === 'N') && data.CONFIRMYN === 'Y') || (reqStatus === 'C' && data.CANCELYN === 'Y')) {
      const responseMsg = '차량정보 ' + (gubun === 'I' ? '추가' : gubun === 'U' ? '수정' : '삭제') + ' 요청을 ' + (reqStatus === 'Y' ? '승인' : reqStatus === 'N' ? '반려' : reqStatus === 'G' ? '검토완료' : '취소');

      if(confirm(responseMsg + ' 하시겠습니까?')) { 
        try {
          const params = {
            pREQSTATUS: reqStatus,
            pSEQ: seq,
            pEMPNO: user?.empNo
          };

          const response = await fetchData('car/RequestConfirmTransaction', params);

          if (!response.success) {
            throw new Error(response.errMsg || responseMsg + ' 처리 중 오류가 발생했습니다.');
          } else {
            if (response.errMsg !== '' || response.data[0].errCd !== '00') {
              let errMsg = response.errMsg;

              if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

              errorMsgPopup(errMsg);
            } else {
              msgPopup(responseMsg + ' 처리가 완료되었습니다.');
              onHide();
              onParentSearch();
            }
          }
        } catch (error) {
          console.error('Registration error:', error);
          errorMsgPopup(error.message || responseMsg + ' 처리 중 오류가 발생했습니다.');
        } 
      }
    }
    else {
        msgPopup("잘못된 접근입니다.");
        onHide();
        onParentSearch();
    }
  };

  const handleCancel = async (e) => {
    setReqStatus('C', data.GUBUN, data.SEQ);
  };

  const handleSubmit = async (e) => {
    if (hasPermission(user?.auth, 'carManager')) {
      setReqStatus('Y', data.GUBUN, data.SEQ);
    }
    else if (user?.orgCd === carInfo.REQUEST_ORGCD && hasLvCdPermission(user?.levelCd,'carConfirm')) {
      setReqStatus('G', data.GUBUN, data.SEQ);
    }
  };

  const handleReject = async (e) => {
    setReqStatus('N', data.GUBUN, data.SEQ);
  }

  const handleSearch = async () => {
    const seq = data.SEQ;

    const param = {
      pSEQ: seq,
      pEMPNO: user?.empNo,
      pDEBUG: 'F' 
    };
    
    try {
      const response = await fetchData('car/RequstDetail', param);

      if (!response.success) {
        throw new Error(response.errMsg || '차량 정보 조회 중 오류가 발생했습니다.');
      } else {
        if(response.data === null) {
          msgPopup("잘못된 접근입니다.");
          onHide();
          onParentSearch();
        } else {
          setCarInfo(response.data[0]);
          if (data.REQSTATUS === 'G' && hasPermission(user?.auth, 'carManager')) {
            setConfirmBtnNm('승인');
          }
          else if (data.REQSTATUS === 'R' && user?.orgCd === response.data[0].REQUEST_ORGCD && hasLvCdPermission(user?.levelCd,'carConfirm')) {
            setConfirmBtnNm('검토완료');
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
          <div className="col d-flex">
            <button className={`btn btn-sm btn-outline-secondary`} style={{display:`${data.CANCELYN === 'Y' ? 'show' : 'none'}`}} onClick={handleCancel}>요청취소</button>
          </div>
          <div className="col-4 d-flex justify-content-end align-items-center">
            <label className="form-guide" ><font color='red'>*</font>은 필수 입력 항목입니다.</label>
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
        <button className='btn btnPrimary' style={{display:`${data.CONFIRMYN === 'Y' ? 'show' : 'none'}`}} onClick={handleSubmit}>{confirmBtnNm}</button>
        <button className={`btn ${styles.btnReject}`} style={{display:`${data.CONFIRMYN === 'Y' ? 'show' : 'none'}`}} onClick={handleReject}>반려</button>
      </Modal.Footer>
    </Modal>
  )
};

export default RequestDetailPopup;