import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import { fetchData } from '../../../utils/dataUtils';
import { msgPopup } from '../../../utils/msgPopup';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import RentalProductPopup from './RentalProductPopup';
import useStore from '../../../store/store';
import common from "../../../utils/common";
import styles from './RentalEmpAddPopup.module.css';
import DatePickerCommon from '../../../components/common/DatePickerCommon';

const RentalEmpAddPopup = ({ show, onHide, onSave }) => {
  const { user } = useStore();

  const [formData, setFormData] = useState({
    ORGIN_CONTRACT_NUM: '',
    ORGIN_SN: '',
    CONTRACT_NUM: '',
    CONTRACT_STARTDT: '',
    CONTRACT_ENDDT: '',
    MRENT_PRICE: '',
    ASSET_NUM: '',
    PURPOSE: '',
    PAYGB: '',
    PRODUCTCD: '',
    SN: '',
    ADDR: '',
    MEMO: '',
    CLASSNM: '',
    PRODUCTNM: '',
    MODELNM: '',
  });

  const [showProductPopup, setShowProductPopup] = useState(false);

  // DatePicker용 상태 (Date 객체)
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // formData ↔ startDate/endDate 동기화 (안전하게)
  useEffect(() => {
    const startStr = formData.CONTRACT_STARTDT;
    const endStr = formData.CONTRACT_ENDDT;

    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;

    setStartDate(start && !isNaN(start.getTime()) ? start : null);
    setEndDate(end && !isNaN(end.getTime()) ? end : null);
  }, [formData.CONTRACT_STARTDT, formData.CONTRACT_ENDDT]);

  // 숫자만 허용
  const handleNumberInput = (e) => {
    const { id, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, [id]: numericValue }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const openProductPopup = () => setShowProductPopup(true);

  const handleProductSelect = (selected) => {
    setFormData(prev => ({
      ...prev,
      PRODUCTCD: selected.PRODUCTCD || '',
      CLASSNM: selected.CLASSNM || '',
      PRODUCTNM: selected.PRODUCTNM || '',
      MODELNM: selected.MODELNM || '',
    }));
    setShowProductPopup(false);
  };

  // 유효성 검사
  const validateForm = () => {
    if (!formData.CONTRACT_NUM?.trim()) {
      errorMsgPopup("계약번호는 필수 입력 항목입니다.");
      return false;
    }
    if (!formData.SN?.trim()) {
      errorMsgPopup("시리얼번호는 필수 입력 항목입니다.");
      return false;
    }

    if (!formData.PRODUCTCD?.trim()) {
      errorMsgPopup("상품은 필수 입력 항목입니다.");
      return false;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (formData.CONTRACT_STARTDT && !dateRegex.test(formData.CONTRACT_STARTDT)) {
      errorMsgPopup("계약시작일은 YYYY-MM-DD 형식이어야 합니다.");
      return false;
    }
    if (formData.CONTRACT_ENDDT && !dateRegex.test(formData.CONTRACT_ENDDT)) {
      errorMsgPopup("계약종료일은 YYYY-MM-DD 형식이어야 합니다.");
      return false;
    }

    if (formData.CONTRACT_STARTDT && formData.CONTRACT_ENDDT) {
      if (new Date(formData.CONTRACT_STARTDT) > new Date(formData.CONTRACT_ENDDT)) {
        errorMsgPopup("계약시작일은 계약종료일보다 이전이어야 합니다.");
        return false;
      }
    }

    const validations = [
      { value: formData.CONTRACT_NUM, max: 20, label: "계약번호" },
      { value: formData.CONTRACT_STARTDT, max: 10, label: "계약시작일" },
      { value: formData.CONTRACT_ENDDT, max: 10, label: "계약종료일" },
      { value: formData.MRENT_PRICE, max: 10, label: "임차가(월)", isNumber: true },
      { value: formData.ASSET_NUM, max: 20, label: "자산번호" },
      { value: formData.PURPOSE, max: 100, label: "용도" },
      { value: formData.PAYGB, max: 100, label: "지급구분" },
      { value: formData.SN, max: 40, label: "시리얼번호" },
      { value: formData.ADDR, max: 500, label: "주소지" },
      { value: formData.MEMO, max: 500, label: "비고" },
    ];

    for (const v of validations) {
      if (v.value) {
        const str = v.isNumber ? String(v.value) : v.value;
        const result = common.validateVarcharLength(str, v.max, v.label);
        if (!result.valid) {
          errorMsgPopup(result.error);
          return false;
        }
      }
    }
    return true;
  };

  // 저장
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const params = {
        pGUBUN: 'I',
        pEMPNO: user?.empNo || '',
        pORGIN_CONTRACT_NUM: formData.ORGIN_CONTRACT_NUM || '',
        pORGIN_SN: formData.ORGIN_SN || '',
        pCONTRACT_NUM: formData.CONTRACT_NUM || '',
        pCONTRACT_STARTDT: formData.CONTRACT_STARTDT || '',
        pCONTRACT_STARTTM: '',
        pCONTRACT_ENDDT: formData.CONTRACT_ENDDT || '',
        pCONTRACT_ENDTM: '',
        pMRENT_PRICE: formData.MRENT_PRICE || '',
        pASSET_NUM: formData.ASSET_NUM || '',
        pPURPOSE: formData.PURPOSE || '',
        pPAYGB: formData.PAYGB || '',
        pPRODUCTCD: formData.PRODUCTCD || '',
        pSN: formData.SN || '',
        pZIPCODE: '',
        pADDR: formData.ADDR || '',
        pMEMO: formData.MEMO || '',
      };

      const response = await fetchData('rental/empMng/save', params);

      if (!response.success) {
        errorMsgPopup(response.message || '등록 중 오류가 발생했습니다.');
        return;
      }

      if (response.errMsg || (response.data[0]?.errCd !== '00')) {
        const errMsg = response.errMsg || response.data[0]?.errMsg || '처리 중 오류 발생';
        msgPopup(errMsg);
        return;
      }

      msgPopup('등록되었습니다.');
      onSave?.();
      onHide();
    } catch (err) {
      console.error('등록 실패:', err);
      errorMsgPopup('등록 중 오류가 발생했습니다.');
    }
  };

  const handleReset = () => {
    setFormData(prev => ({
      ...prev,
      ORGIN_CONTRACT_NUM: '',
      ORGIN_SN: '',
      CONTRACT_NUM: '',
      CONTRACT_STARTDT: '',
      CONTRACT_ENDDT: '',
      MRENT_PRICE: '',
      ASSET_NUM: '',
      PURPOSE: '',
      PAYGB: '',
      PRODUCTCD: '',
      SN: '',
      ADDR: '',
      MEMO: '',
      CLASSNM: '',
      PRODUCTNM: '',
      MODELNM: '',
    }));
    setStartDate(null);
    setEndDate(null);
  };

  const handleClose = () => onHide();

  if (!show) return null;

  return (
    <>
      <Modal show={show} onHide={handleClose} centered dialogClassName={styles.customModal}>
        <Modal.Header closeButton>
          <Modal.Title>렌탈 등록</Modal.Title>
        </Modal.Header>
        <Modal.Body className='formColWrap'>
          <div className="row">
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="CONTRACT_NUM">계약번호<span style={{color:'red'}}>*</span></label>
              <input type="text" className={`form-control ${styles.formControl}`} id="CONTRACT_NUM" value={formData.CONTRACT_NUM} onChange={handleChange} maxLength="20" placeholder="필수입력" />
            </div>
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="SN">시리얼번호<span style={{color:'red'}}>*</span></label>
              <input type="text" className={`form-control ${styles.formControl}`} id="SN" value={formData.SN} onChange={handleChange} maxLength="40" placeholder="필수입력" />
            </div>
          </div>
          <div className="row">
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="CONTRACT_STARTDT">계약시작일</label>
              <DatePickerCommon
                id="CONTRACT_STARTDT"
                type="startday"
                value={formData.CONTRACT_STARTDT}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, CONTRACT_STARTDT: value }));
                  const date = value ? new Date(value) : null;
                  if (date && !isNaN(date.getTime())) {
                    setStartDate(date);
                    if (endDate && endDate < date) {
                      setEndDate(null);
                      setFormData(prev => ({ ...prev, CONTRACT_ENDDT: '' }));
                    }
                  } else {
                    setStartDate(null);
                  }
                }}
                placeholder="YYYY-MM-DD"
                width="100%"
                enabled={true}
                maxDate={endDate || undefined}
                selected={startDate || undefined}
              />
            </div>
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="CONTRACT_ENDDT">계약종료일</label>
              <DatePickerCommon
                id="CONTRACT_ENDDT"
                type="endday"
                value={formData.CONTRACT_ENDDT}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, CONTRACT_ENDDT: value }));
                  const date = value ? new Date(value) : null;
                  if (date && !isNaN(date.getTime())) {
                    setEndDate(date);
                  } else {
                    setEndDate(null);
                  }
                }}
                placeholder="YYYY-MM-DD"
                width="100%"
                enabled={true}
                minDate={startDate || undefined}
                selected={endDate || undefined}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="MRENT_PRICE">임차가(월)</label>
              <input
                type="number"
                className={`form-control ${styles.formControl}`}
                id="MRENT_PRICE"
                value={formData.MRENT_PRICE}
                onChange={handleNumberInput}
                maxLength="10"
                placeholder="숫자만 입력"
              />
            </div>
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="ASSET_NUM">자산번호</label>
              <input type="text" className={`form-control ${styles.formControl}`} id="ASSET_NUM" value={formData.ASSET_NUM} onChange={handleChange} maxLength="20" />
            </div>
          </div>
          <div className="row">
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="PURPOSE">용도</label>
              <input type="text" className={`form-control ${styles.formControl}`} id="PURPOSE" value={formData.PURPOSE} onChange={handleChange} maxLength="100" />
            </div>
            <div className="col-6 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="PAYGB">지급구분</label>
              <input type="text" className={`form-control ${styles.formControl}`} id="PAYGB" value={formData.PAYGB} onChange={handleChange} maxLength="100" />
            </div>
          </div>
          <div className="row">
            <div className="col-4 d-flex align-items-center mb-2">
              <label className="form-label w120">분류<span style={{color:'red'}}>*</span></label>
              <input
                type="text"
                className={`form-control ${styles.formControl} ${styles.readonly}`}
                value={formData.CLASSNM}
                readOnly
                onClick={openProductPopup}
                placeholder="클릭하여 선택"
              />
            </div>
            <div className="col-8 d-flex align-items-center mb-2">
              <label className="form-label w120">상품명<span style={{color:'red'}}>*</span></label>
              <input
                type="text"
                className={`form-control ${styles.formControl} ${styles.readonly}`}
                value={formData.PRODUCTNM}
                readOnly
                onClick={openProductPopup}
                placeholder="클릭하여 선택"
              />
            </div>
          </div>
          <div className="col-12 d-flex align-items-center mb-2">
            <label className="form-label w120">모델명<span style={{color:'red'}}>*</span></label>
            <input
              type="text"
              className={`form-control ${styles.formControl} ${styles.readonly}`}
              value={formData.MODELNM}
              readOnly
              onClick={openProductPopup}
              placeholder="클릭하여 선택"
            />
          </div>
          <div className="row">
            <div className="col-12 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="ADDR">주소지</label>
              <input type="text" className={`form-control ${styles.formControl}`} id="ADDR" value={formData.ADDR} onChange={handleChange} maxLength="500" />
            </div>
          </div>
          <div className="row">
            <div className="col-12 d-flex align-items-center mb-2">
              <label className="form-label w120" htmlFor="MEMO">비고</label>
              <input type="text" className={`form-control ${styles.formControl}`} id="MEMO" value={formData.MEMO} onChange={handleChange} maxLength="500" />
            </div>
          </div>
          <div className={styles.inputButtonWrapper}>
            <button className={`btn text-bg-secondary`} onClick={handleClose}>닫기</button>
            <button className={`btn text-bg-dark`} onClick={handleReset}>초기화</button>
            <button className={`btn text-bg-success`} onClick={handleSave}>확인</button>
          </div>
        </Modal.Body>
      </Modal>
      <RentalProductPopup
        show={showProductPopup}
        onHide={() => setShowProductPopup(false)}
        onSave={handleProductSelect}
      />
    </>
  );
};

export default RentalEmpAddPopup;