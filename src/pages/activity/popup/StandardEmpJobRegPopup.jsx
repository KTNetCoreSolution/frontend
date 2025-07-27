import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import styles from './StandardEmpJobRegPopup.module.css';

const StandardEmpJobRegPopup = ({ show, onHide, onConfirm, filters, data }) => {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    CLASSACD: filters.CLASSACD || 'all',
    CLASSBCD: filters.CLASSBCD || 'all',
    CLASSCCD: filters.CLASSCCD || 'all',
    NAME: '',
    WORKTYPE: '',
    WORKDATE: today,
    WORKHOURS: '',
    QUANTITY: '',
  });

  // 중분류 및 소분류 옵션 동적 생성
  const [classBOptions, setClassBOptions] = useState([]);
  const [classCOptions, setClassCOptions] = useState([]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      CLASSACD: filters.CLASSACD || 'all',
      CLASSBCD: filters.CLASSBCD || 'all',
      CLASSCCD: filters.CLASSCCD || 'all',
    }));
  }, [filters.CLASSACD, filters.CLASSBCD, filters.CLASSCCD]);

  useEffect(() => {
    // 대분류 변경 시 중분류 필터링
    const filteredB = data
      .filter((item) => item.CLASSACD === formData.CLASSACD || formData.CLASSACD === 'all')
      .map((item) => ({ value: item.CLASSBCD, label: item.CLASSBNM }))
      .filter((item, index, self) => index === self.findIndex((t) => t.value === item.value));
    setClassBOptions(filteredB);
    setFormData((prev) => ({ ...prev, CLASSBCD: 'all' })); // 중분류 초기화
  }, [formData.CLASSACD, data]);

  useEffect(() => {
    // 중분류 변경 시 소분류 필터링
    const filteredC = data
      .filter((item) => item.CLASSBCD === formData.CLASSBCD || formData.CLASSBCD === 'all')
      .map((item) => ({ value: item.CLASSCCD, label: item.CLASSCNM }))
      .filter((item, index, self) => index === self.findIndex((t) => t.value === item.value));
    setClassCOptions(filteredC);
    setFormData((prev) => ({ ...prev, CLASSCCD: 'all' })); // 소분류 초기화
  }, [formData.CLASSBCD, data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const selectedMajor = data.find((item) => item.CLASSACD === formData.CLASSACD);
    const selectedMiddle = data.find((item) => item.CLASSBCD === formData.CLASSBCD);
    const selectedMinor = data.find((item) => item.CLASSCCD === formData.CLASSCCD);
    const newData = {
      CLASSACD: formData.CLASSACD,
      CLASSBCD: formData.CLASSBCD,
      CLASSCCD: formData.CLASSCCD,
      CLASSANM: selectedMajor ? selectedMajor.CLASSANM : '',
      CLASSBNM: selectedMiddle ? selectedMiddle.CLASSBNM : '',
      CLASSCNM: selectedMinor ? selectedMinor.CLASSCNM : '',
      NAME: formData.NAME,
      WORKTYPE: formData.WORKTYPE,
      WORKDATE: formData.WORKDATE,
      STARTTIME: '09:00',
      ENDTIME: '18:00',
      WORKHOURS: formData.WORKHOURS || 8,
      QUANTITY: formData.QUANTITY || 1,
      WORKDATETIME: `${formData.WORKDATE} 09:00 ~ 18:00`,
    };
    onConfirm(newData);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>개별업무 등록</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label className="form-label">대분류</label>
          <select className={`form-select ${styles.formSelect}`} name="CLASSACD" value={formData.CLASSACD} onChange={handleChange}>
            <option value="all">==대분류==</option>
            {[...new Set(data.map((item) => item.CLASSANM))].map((name) => (
              <option key={name} value={data.find((item) => item.CLASSANM === name).CLASSACD}>{name}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">중분류</label>
          <select className={`form-select ${styles.formSelect}`} name="CLASSBCD" value={formData.CLASSBCD} onChange={handleChange}>
            <option value="all">==중분류==</option>
            {classBOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">소분류</label>
          <select className={`form-select ${styles.formSelect}`} name="CLASSCCD" value={formData.CLASSCCD} onChange={handleChange}>
            <option value="all">==소분류==</option>
            {classCOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">이름</label>
          <input type="text" className={`form-control ${styles.formControl}`} name="NAME" value={formData.NAME} onChange={handleChange} placeholder="이름 입력" />
        </div>
        <div className="mb-3">
          <label className="form-label">근무형태</label>
          <select className={`form-select ${styles.formSelect}`} name="WORKTYPE" value={formData.WORKTYPE} onChange={handleChange}>
            <option value="">선택</option>
            {['정규', '계약', '파견'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">작업일시</label>
          <input type="date" className={`form-control ${styles.formControl}`} name="WORKDATE" value={formData.WORKDATE} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">작업시간</label>
          <input type="number" className={`form-control ${styles.formControl}`} name="WORKHOURS" value={formData.WORKHOURS} onChange={handleChange} placeholder="시간 입력" step="0.5" min="0" />
        </div>
        <div className="mb-3">
          <label className="form-label">건(구간/본/개소)</label>
          <input type="number" className={`form-control ${styles.formControl}`} name="QUANTITY" value={formData.QUANTITY} onChange={handleChange} placeholder="건수 입력" min="0" />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className={`btn btn-secondary ${styles.btn}`} onClick={onHide}>취소</button>
        <button className={`btn btn-primary ${styles.btn}`} onClick={handleSubmit}>확인</button>
      </Modal.Footer>
    </Modal>
  );
};

export default StandardEmpJobRegPopup;