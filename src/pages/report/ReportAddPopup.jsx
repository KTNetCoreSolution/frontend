import { useState, useEffect } from 'react';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import { fetchData } from '../../utils/dataUtils.js';
import CommonPopup from '../../components/popup/CommonPopup.jsx';
import UserListPopup from '../../components/popup/UserListPopup.jsx';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { hasPermission } from '../../utils/authUtils.js';
import Modal from 'react-bootstrap/Modal';
import styles from './ReportAddPopup.module.css';
import { set } from 'date-fns';

const ReportAddPopup = ({ show, onHide, onParentSearch }) => {
  const { user } = useStore();
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [newReport, setNewReport] = useState({ TITLE: '', CONTENTS: '', REPORTORDER: '', ORGNM: '', MNGEMPNO: '', EMPNM: '' });
  
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    //const initializeComponent = async () => {
    //};

    //initializeComponent();

    //return () => {
    //};
  }, []);
  
  useEffect(() => {
    setNewReport({ TITLE: '', CONTENTS: '', REPORTORDER: '', ORGNM: '', MNGEMPNO: '', EMPNM: '' });
  }, [show]);
  
  const isFormValid = () => {
    const { TITLE, CONTENTS, REPORTORDER, MNGEMPNO } = newReport;
    return (
      TITLE.trim() !== '' &&
      CONTENTS.trim() !== '' &&
      REPORTORDER.trim() !== '' &&
      MNGEMPNO.trim() !== ''
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      errorMsgPopup("제목, 내용, 정렬순서, 담당자사번은 필수 입력값입니다.");
      return;
    }
        
    if(confirm("성과 Report 목록을 추가하시겠습니까?")) { 
      try {
        const params = {
          pGUBUN: "I",
          pREPORTID: "",
          pTITLE: newReport.TITLE,
          pCONTENTS: newReport.CONTENTS,
          pREPORTORDER: newReport.REPORTORDER,
          pMNGEMPNO: newReport.MNGEMPNO,
        };

        const response = await fetchData('report/reportlistSave', params);

        if (!response.success) {
          throw new Error(response.errMsg || 'Report 정보가 잘못되었습니다.');
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;

            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

            errorMsgPopup(errMsg);
          } else {
            msgPopup("성과 Report 목록 추가가 완료되었습니다.");            
            onHide();
            onParentSearch();
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorMsgPopup(error.message || 'Report 정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      } 
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
        <Modal.Title>성과Report 목록 관리</Modal.Title>
      </Modal.Header>
      <Modal.Body className='formColWrap'>
        <div className='row'>
          <div className="col-12 d-flex">
            <label className="form-label w60">제목</label>
            <input type="text" className={`form-control ${styles.formControl} ${styles.w450}`} value={newReport.TITLE} placeholder="제목을 입력하세요" onInput={(e) => {handleMaxLength(e, 255)}} onChange={(e) => {setNewReport({ ...newReport, TITLE: e.target.value })}} />
          </div>
        </div>
        <div className='row'>
          <div className="col-12 d-flex">
            <label className="form-label w60">내용</label>
            <input type="text" className={`form-control ${styles.formControl} ${styles.w450}`} value={newReport.CONTENTS} placeholder="내용을 입력하세요" onInput={(e) => {handleMaxLength(e, 255)}} onChange={(e) => {setNewReport({ ...newReport, CONTENTS: e.target.value })}} />
          </div>
        </div>
        <div className='row'>
          <div className="col-12 d-flex">
            <label className="form-label w60">정렬순서</label>
            <input type="text" className={`form-control ${styles.formControl} ${styles.w60}`} value={newReport.REPORTORDER} placeholder="0" onInput={(e) => {handleNumberMaxLength(e, 3)}} onChange={(e) => {setNewReport({ ...newReport, REPORTORDER: e.target.value })}} />
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w60">담당자사번</label>
            <input type="text" value={newReport.MNGEMPNO} className={`form-control ${styles.formControl} ${styles.w150}`} disabled="disabled"/>
            <label className="form-label w10"></label>
            <label className="form-label w60">담당자명</label>
            <input type="text" value={newReport.EMPNM} className={`form-control ${styles.formControl} ${styles.w150}`} disabled="disabled"/>
            <button type="button" className={`btn btn-secondary ${styles.btn} flex-shrink-0`} onClick={(e) => {setShowUserPopup(true)}}>선택</button>
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex">
            <label className="form-label w60">조직</label>
            <input type="text" value={newReport.ORGNM} className={`form-control ${styles.formControl} ${styles.w450}`} disabled="disabled"/>
          </div>
        </div>
      </Modal.Body>
      <UserListPopup show={showUserPopup} onHide={() => setShowUserPopup(false)}
        onConfirm={(selectedRows) => {
          const userEmpNo = selectedRows.length > 0 ? selectedRows[0].EMPNO : '';
          const userEmpNm = selectedRows.length > 0 ? selectedRows[0].EMPNM : '';
          const userOrgNm = selectedRows.length > 0 ? selectedRows[0].ORGNM : '';
          setNewReport({ ...newReport, MNGEMPNO: userEmpNo, EMPNM: userEmpNm, ORGNM: userOrgNm });
        }}>
      </UserListPopup>
      <Modal.Footer>
        <button className='btn btnSecondary' onClick={onHide}>취소</button>
        <button className='btn btnPrimary' onClick={handleSubmit}>등록</button>
      </Modal.Footer>
    </Modal>
  )
};

export default ReportAddPopup;