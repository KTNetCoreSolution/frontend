import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { fetchData } from '../../../utils/dataUtils';
import { msgPopup } from '../../../utils/msgPopup';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import useStore from '../../../store/store';
import common from "../../../utils/common";
import styles from './RentalProductManagePopup.module.css'; // 기존 스타일 재사용 (필요 시 별도 CSS 생성)

const RentalProductAddPopup = ({ show, onHide, onSave }) => {
  const { user } = useStore();
  const [formData, setFormData] = useState({
    PRODUCTNM: '',
    MODELNM: '',
    CLASSNM: '',
    MEMO: '',
    CLASSCD: '', // 기본값
    PRODUCTCD: '', // 기본값
    PRODUCTODR: '', // 기본값
    CLASSODR: '', // 기본값
    USEYN: 'Y' // 기본값 Y
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    // 필수 입력 항목 유효성 검사
    if (!formData.CLASSNM.trim()) {
      errorMsgPopup("분류명은 필수 입력 항목입니다.");
      return;
    }
    if (!formData.PRODUCTNM.trim()) {
      errorMsgPopup("상품명은 필수 입력 항목입니다.");
      return;
    }
    if (!formData.MODELNM.trim()) {
      errorMsgPopup("모델명은 필수 입력 항목입니다.");
      return;
    }

    const validation1 = common.validateVarcharLength(formData.CLASSNM, 100, "분류명");
    if (!validation1.valid) {
      errorMsgPopup(validation1.error);
      return;
    }

    const validation2 = common.validateVarcharLength(formData.PRODUCTNM, 150, "상품명");
    if (!validation2.valid) {
      errorMsgPopup(validation2.error);
      return;
    }

    const validation3 = common.validateVarcharLength(formData.MODELNM, 500, "모델명");
    if (!validation3.valid) {
      errorMsgPopup(validation3.error);
      return;
    }

    const validation4 = common.validateVarcharLength(formData.MEMO, 500, "비고");
    if (!validation4.valid) {
      errorMsgPopup(validation4.error);
      return;
    }

    try {
      const params = {
        pGUBUN: 'I',
        pPRODUCTCD: formData.PRODUCTCD,
        pPRODUCTNM: formData.PRODUCTNM,
        pMODELNM: formData.MODELNM,
        pCLASSCD: formData.CLASSCD,
        pCLASSNM: formData.CLASSNM,
        pPRODUCTODR: formData.PRODUCTODR,
        pCLASSODR: formData.CLASSODR,
        pMEMO: formData.MEMO,
        pUSEYN: formData.USEYN,
        pEMPNO: user?.empNo || ''
      };
      const response = await fetchData('rental/productInfo/save', params);
      if (!response.success) {
        errorMsgPopup(response.message || '추가 중 오류가 발생했습니다.');
        return;
      }
      if (response.errMsg !== "" || (response.data[0] && response.data[0].errCd !== "00")) {
        let errMsg = response.errMsg;
        if (response.data[0] && response.data[0].errMsg !== "") errMsg = response.data[0].errMsg;
        msgPopup(errMsg);
        return;
      }
      msgPopup("추가되었습니다.");
      onSave(); // 부모 콜백 호출 (그리드 재조회 및 분류 갱신)
      onHide();
    } catch (err) {
      console.error("추가 실패:", err);
      errorMsgPopup("추가 중 오류가 발생했습니다.");
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>상품 추가</Modal.Title>
      </Modal.Header>
      <Modal.Body className='formColWrap'>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="CLASSNM">분류명<font color='red'>*</font></label>
            <input type="text" className={`form-control ${styles.formControl}`} id="CLASSNM" value={formData.CLASSNM} onChange={handleChange} />
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="PRODUCTNM">상품명<font color='red'>*</font></label>
            <input type="text" className={`form-control ${styles.formControl}`} id="PRODUCTNM" value={formData.PRODUCTNM} onChange={handleChange} />
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="MODELNM">모델명<font color='red'>*</font></label>
            <input type="text" className={`form-control ${styles.formControl}`} id="MODELNM" value={formData.MODELNM} onChange={handleChange} />
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w100" htmlFor="MEMO">비고</label>
            <input type="text" className={`form-control ${styles.formControl}`} id="MEMO" value={formData.MEMO} onChange={handleChange} />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className='btn btnPrimary' onClick={handleSave}>확인</button>
        <button className='btn btnSecondary' onClick={onHide}>닫기</button>
      </Modal.Footer>
    </Modal>
  );
};

export default RentalProductAddPopup;