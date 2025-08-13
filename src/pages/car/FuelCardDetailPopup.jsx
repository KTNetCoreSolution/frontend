import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import CommonPopup from '../../components/popup/CommonPopup';
import CarListPopup from './CarListPopup.jsx';
import { fetchData } from '../../utils/dataUtils.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import Modal from 'react-bootstrap/Modal';
import styles from './CarInfoDetailPopup.module.css';

const FuelCardInfoDetailPopup = ({ show, onHide, onParentSearch, data }) => {
  const { user } = useStore();
  const [vStyle, setVStyle] = useState({vDISPLAY: 'show', vBTNDEL: 'show', vDISABLED: ''});  
  const [cardInfo, setCardInfo] = useState([{GUBUN: '', CARDNO1: '', CARDNO2: '', CARDNO3: '', CARDNO4: '',CARDNO: '',  EXFIREDT: '',  EXFIREMONTH: '',  EXFIREDAY: '', CARNO: '', CARID: ''}]); 
  const [chkCardNo, setChkCardNo] = useState('');  
  const [showCarListPopup, setShowCarListPopup] = useState(false);

  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    initializeComponent();

    //return () => {
    //};
  }, []);
  useEffect(() => {    
    if (show) {        
      if(data !== '') { 
        setCardInfo({...cardInfo, GUBUN:'U'});
        setChkCardNo(data);        
        setVStyle({vDISPLAY: 'none', vBTNDEL: 'show', vDISABLED: 'disabled'});
        handleSearchCardInfo(data); //카드정보 조회
      }
      else {        
        setCardInfo({...cardInfo, GUBUN: '', CARDNO1: '', CARDNO2: '', CARDNO3: '', CARDNO4: '', CARDNO: '', EXFIREDT: '',  EXFIREMONTH: '',  EXFIREDAY: '', CARNO: '', CARID: ''});
        setVStyle({vDISPLAY: 'show', vBTNDEL: 'none', vDISABLED: ''});
      }
    }
    else{
      setCardInfo({GUBUN: '', CARDNO1: '', CARDNO2: '', CARDNO3: '', CARDNO4: '', CARDNO: '', EXFIREDT: '',  EXFIREMONTH: '',  EXFIREDAY: '', CARNO: '', CARID: ''});
        setVStyle({vDISPLAY: 'show', vBTNDEL: 'show', vDISABLED: 'disabled'});
    }
  }, [show]);
  
  const validateForm = () => {
    if (!cardInfo.GUBUN || cardInfo.GUBUN === '') {
      return "카드번호 확인 버튼을 클릭하여 카드정보를 확인해주세요.";
    }

    if(cardInfo.GUBUN === 'I' && cardInfo.CARDNO !== chkCardNo) {
      return "카드번호가 변경되었습니다. 카드번호 확인 버튼을 클릭하여 카드정보를 확인해주세요.";
    }
  
    if (!cardInfo.CARDNO || !cardInfo.EXFIREDT) {
      return "필수 입력 항목을 모두 입력해주세요.";
    }

    const carIdValidation = commonUtils.validateVarcharLength(cardInfo.CARDNO, 20, '카드번호');
    if (!carIdValidation.valid) return carIdValidation.error;

    const carNoValidation = commonUtils.validateVarcharLength(cardInfo.CARID, 20, '차량번호');
    if (!carNoValidation.valid) return carNoValidation.error;
    return '';
  };
  
  const validateDelForm = () => {
    if (!cardInfo.CARDNO || cardInfo.CARDNO === '') {
      return "잘못된 접근입니다.";
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      errorMsgPopup(validationError);
      return;
    }

    try {
      const params = {
        pGUBUN: cardInfo.GUBUN,
        pCARDNO: cardInfo.CARDNO,
        pEXFIREDT: cardInfo.EXFIREDT,
        pCARID: cardInfo.CARID,
        pREGEMPNO: user?.empNo || ''
      };

      const response = await fetchData('fuelcard/FuelCardinfoTransaction', params);

      if (!response.success) {
        throw new Error(response.errMsg || '카드정보가 잘못되었습니다.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("카드정보가 저장되었습니다.");
          onHide();
          onParentSearch();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '카드정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } 
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    
    if(confirm("카드 정보를 삭제하시겠습니까?")) { 
      const validationError = validateDelForm();

      if (validationError) {
        errorMsgPopup(validationError);
        return;
      }

      try {
        const params = {
          pGUBUN: 'D',
          pCARDNO: cardInfo.CARDNO,
          pEXFIREDT: '',
          pCARID: '',
          pREGEMPNO: user?.empNo || ''
        };

        const response = await fetchData('fuelcard/FuelCardinfoTransaction', params);

        if (!response.success) {
          throw new Error(response.errMsg || '카드정보 삭제 중 오류가 발생했습니다.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;

            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

            errorMsgPopup(errMsg);
          } else {
            msgPopup("카드정보가 삭제되었습니다.");
            onHide();
            onParentSearch();
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || '카드정보 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
      } 
    }
  };

  const handleSearchCardInfo = async (data) => {
    let cardNo = '';
    
    if (!data || data === '' || data.length < 12) {
      msgPopup("카드번호를 입력해주세요.");
      return;
    }

    if (data && data !== '' && data !== 'undefined') { 
      cardNo = data;
      //setCardInfo({...cardInfo, CARDNO: data});
      setChkCardNo(data);
    }
    else {
      cardNo = cardInfo.CARDNO;
    }

    if (!data || data === '') {
      msgPopup("카드번호를 입력해주세요.");
      return;
    }
    
    const params = {pGUBUN: 'CARDNO' || '', pSEARCH: cardNo || '', pDEBUG: 'F'};
    
    try {
      const response = await fetchData('car/FuelCardList', params);

      if (!response.success) {
        throw new Error(response.errMsg || '카드 정보 조회 중 오류가 발생했습니다.');
      } else {
          if(response.data === null) {
            setCardInfo({...cardInfo, GUBUN: 'I', EXFIREMONTH: '', EXFIREDAY: '', EXFIREDT: '', CARID: '', CARNO: ''});
            msgPopup("신규 등록 가능한 카드번호입니다.");
          } else { 
            if (response.errMsg !== '' || response.data[0].errCd !== '00') {          
              let errMsg = response.errMsg;

            if(response.data !== null && response.data.length > 0){
              if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
            }

            errorMsgPopup(errMsg);
          } else {
            //차량정보 컴포넌트에 바인딩
            setCardInfo({...cardInfo, GUBUN: 'U', CARDNO1: response.data[0].CARDNO1, CARDNO2: response.data[0].CARDNO2, CARDNO3: response.data[0].CARDNO3, CARDNO4: response.data[0].CARDNO4, CARDNO: response.data[0].CARDNO
                      , EXFIREDT: response.data[0].EXFIREDT, EXFIREMONTH: response.data[0].EXFIREMONTH, EXFIREDAY: response.data[0].EXFIREDAY, CARID: response.data[0].CARID, CARNO: response.data[0].CARNO});
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

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} onParentSearch={onParentSearch} centered>
      <Modal.Header closeButton>
        <Modal.Title>주유카드정보 관리</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-2 d-flex">
          <label className="form-label flex-shrink-0 me-2" style={{width:60 +'px', paddingTop:6 + 'px'}} htmlFor="cardNo1">카드번호<font color='red'>*</font></label>
          <input type="text" className={`form-control ${styles.formControl} flex-shrink-0 me-2`} id="cardNo1" value={cardInfo.CARDNO1 || ''} style={{width:55 + 'px'}} disabled={`${vStyle.vDISABLED}`} onInput={(e) => {handleMaxLength(e, 4)}} onChange={(e) => {setCardInfo({ ...cardInfo, CARDNO1: e.target.value, CARDNO: e.target.value + cardInfo.CARDNO2 + cardInfo.CARDNO3 + cardInfo.CARDNO4 })}} />
          <input type="text" className={`form-control ${styles.formControl} flex-shrink-0 me-2`} id="cardNo2" value={cardInfo.CARDNO2 || ''} style={{width:55 + 'px'}} disabled={`${vStyle.vDISABLED}`} onInput={(e) => {handleMaxLength(e, 4)}} onChange={(e) => {setCardInfo({ ...cardInfo, CARDNO2: e.target.value, CARDNO: cardInfo.CARDNO1 + e.target.value + cardInfo.CARDNO3 + cardInfo.CARDNO4 })}} />
          <input type="text" className={`form-control ${styles.formControl} flex-shrink-0 me-2`} id="cardNo3" value={cardInfo.CARDNO3 || ''} style={{width:55 + 'px'}} disabled={`${vStyle.vDISABLED}`} onInput={(e) => {handleMaxLength(e, 4)}} onChange={(e) => {setCardInfo({ ...cardInfo, CARDNO3: e.target.value, CARDNO: cardInfo.CARDNO1 + cardInfo.CARDNO2 + e.target.value + cardInfo.CARDNO4 })}} />
          <input type="text" className={`form-control ${styles.formControl} flex-shrink-0 me-2`} id="cardNo4" value={cardInfo.CARDNO4 || ''} style={{width:55 + 'px'}} disabled={`${vStyle.vDISABLED}`} onInput={(e) => {handleMaxLength(e, 4)}} onChange={(e) => {setCardInfo({ ...cardInfo, CARDNO4: e.target.value, CARDNO: cardInfo.CARDNO1 + cardInfo.CARDNO2 + cardInfo.CARDNO3 + e.target.value })}} />
          <button id="btnCarId" type="button" className={`btn btn-secondary ${styles.btn}`} style={{width:60 + 'px', height: 28 + 'px', display:`${vStyle.vDISPLAY}`}} disabled={`${vStyle.vDISABLED}`} onClick={(e) => handleSearchCardInfo(cardInfo.CARDNO)}>확인</button>
          <button className={`btn btn-sm btn-danger ${styles.deleteButton}`} style={{width:60 +'px', height: 28 + 'px', display:`${vStyle.vBTNDEL}`}} onClick={handleDelete}>삭제</button>
        </div>
        <div className="mb-2 d-flex">
          <label className="form-label flex-shrink-0 me-2" htmlFor="exfireMonth" style={{width:60 +'px', paddingTop:6 + 'px'}}>유효기간</label>
          <input type="text" className={`form-control ${styles.formControl} flex-shrink-0 me-2`} id="exfireMonth" value={cardInfo.EXFIREMONTH || ''} style={{width:42 + 'px', textAlign:'center'}} placeholder="mm" onInput={(e) => {handleMaxLength(e, 2)}} onChange={(e) => {setCardInfo({ ...cardInfo, EXFIREMONTH: e.target.value, EXFIREDT: e.target.value + '/' + cardInfo.EXFIREDAY })}} />
          <label className="form-label flex-shrink-0 me-2" htmlFor="exfireDay" style={{width:5 +'px', paddingTop:6 + 'px'}}>/</label>
          <input type="text" className={`form-control ${styles.formControl} flex-shrink-0 me-2`} id="exfireDay" value={cardInfo.EXFIREDAY || ''} style={{width:42 + 'px', textAlign:'center'}} placeholder="dd" onInput={(e) => {handleMaxLength(e, 2)}} onChange={(e) => {setCardInfo({ ...cardInfo, EXFIREDAY: e.target.value, EXFIREDT: cardInfo.EXFIREMONTH + '/' + e.target.value })}} />
        </div>
        <div className="mb-2 d-flex">
          <label className="form-label flex-shrink-0 me-2" htmlFor="carNo" style={{width:60 +'px', paddingTop:6 + 'px'}}>차량번호</label>
          <CommonPopup show={showCarListPopup} onHide={() => setShowCarListPopup(false)} title={'차량 선택'}>
            <div>
              <CarListPopup
                onClose={() => setShowCarListPopup(false)}
                onConfirm={(selectedRows) => {
                  const carId = selectedRows.length > 0 ? selectedRows[0].CARID : '';
                  const carNo = selectedRows.length > 0 ? selectedRows[0].CARNO : '';
                  setCardInfo({ ...cardInfo, CARID: carId, CARNO: carNo });
                }}
                checkCardNo={cardInfo.CARDNO} //주유카드를 넘겨서 차량번호 조회
              />
            </div>
          </CommonPopup>
          <input type="text" value={cardInfo.CARNO} className={`form-control ${styles.formControl}`} id="carNo" style={{width:200 +'px'}} disabled="disabled" onChange={(e) => {setCardInfo({ ...cardInfo, CARNO: e.target.value })}}/>
          <input type="text" value={cardInfo.CARID} className={`form-control ${styles.formControl}`} id="carNo" style={{width:200 +'px', display:'none'}} disabled="disabled" onChange={(e) => {setCardInfo({ ...cardInfo, CARID: e.target.value })}}/>
          <button type="button" className={`btn btn-secondary ${styles.btn}`} style={{width:60 + 'px', height:28 + 'px', marginLeft:10 + 'px'}} onClick={(e) => {setShowCarListPopup(true)}}>선택</button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className={`btn btn-secondary ${styles.btn}`} onClick={onHide}>취소</button>
        <button className={`btn btn-primary ${styles.btn}`} onClick={handleSubmit}>확인</button>
      </Modal.Footer>
    </Modal>
  );
};

export default FuelCardInfoDetailPopup;