import { useState, useEffect,useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { fetchData } from "../../utils/dataUtils";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { hasPermission } from '../../utils/authUtils';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import MobileStandardBizLogReg from './MobileStandardBizLogReg';
import Modal from 'react-bootstrap/Modal';
import styles from './MobileStandardBizLog.module.css'; // 기존 CSS 재사용 (필요 시 별도 CSS 생성)
import api from '../../utils/api';
import common from "../../utils/common";

const MobileStandardBizLog = () => {
  const { user, clearUser } = useStore();
  const navigate = useNavigate();
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [registeredList, setRegisteredList] = useState([]);
  const [workDate, setWorkDate] = useState(common.getTodayDate());
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [classGubun, setClassGubun] = useState('BIZ');
  const [classData, setClassData] = useState([]);
  const [bizWorkTypes, setBizWorkTypes] = useState([]); // BIZ 워크 타입 옵션
  const [showRegModal, setShowRegModal] = useState(false);

  // 추가: formData 상태를 부모에서 관리
  const [formData, setFormData] = useState({
    CLASSACD: "all",
    CLASSBCD: "all",
    CLASSCCD: "all",
    CUSTOMER: "",
    DISPATCH: "",
    WORKERS: "",
    WORKTIME: "",
    LINES: 1,
    PROCESSSECTION: "",  // 추가: 구분 필드
    PROCESS: "",
    PROCESSTIME: 0,
    WORKDATE: workDate,  // 초기 workDate 사용
  });

  // 초기 리다이렉트 (기존과 동일)
  /*
  useEffect(() => {
    msgPopup("작업중입니다.");
    navigate('/mobile/Main');
  }, [navigate]);
  */

  // 등록 리스트 총 처리시간 계산
  const totalRegisteredTime = useMemo(() => {
    return registeredList.reduce((sum, item) => sum + (parseInt(item.PROCESSTIME) || 0), 0);
  }, [registeredList]);

  // 분을 시간:분 형식으로 변환
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // classData 가져오기 (기존과 동일)
  const fetchClassData = async (gubun) => {
    try {
      const params = {
        pGUBUN: gubun,
        pDEBUG: 'F',
      };
      const response = await fetchData('standard/classinfoList', params);
      if (!response.success) {
        msgPopup(response.message || '분류 목록을 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const fetchedClassData = Array.isArray(response.data) ? response.data : [];
      setClassData(fetchedClassData);
    } catch (err) {
      console.error('분류 목록 로드 실패:', err);
      errorMsgPopup(err.response?.data?.message || '분류 목록을 가져오는 중 오류가 발생했습니다.');
    }
  };

  // BIZ 워크 타입 옵션 가져오기 (StandardBizEmpJobRegPopup 참조, ddlList 대신 적절 API)
  const fetchBizWorkTypes = async () => {
    try {
      const params = {
        pGUBUN: 'ALL',
        pDEBUG: 'F',
      };
      const response = await fetchData('standard/bizWorkTypeInfoList', params);
      if (!response.success) {
        msgPopup(response.message || 'BIZ 워크 타입 옵션을 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const fetchedOptions = Array.isArray(response.data) ? response.data : [];
      setBizWorkTypes(fetchedOptions.map((item, index) => ({ 
        value: item.WORKCD, 
        label: item.WORKNM, 
        BIZMCODE: item.BIZMCODE,
        ODR: item.ODR || 0, // ODR 필드 포함, 없으면 0으로 기본값
        index
      })));

    } catch (err) {
      console.error('BIZ 워크 타입 로드 실패:', err);
      msgPopup(err.response?.data?.message || 'BIZ 워크 타입을 가져오는 중 오류가 발생했습니다.');
    }
  };


  // 등록 리스트 가져오기 (biz/reg/list 사용, mappedData StandardBizEmpJobRegPopup 참조)
  const fetchRegisteredList = async (date) => {
    try {
      const params = {
        pGUBUN: 'LIST',
        pEMPNO: user?.empNo || '',
        pDATE1: date,
        pSECTIONCD: classGubun,
        pDEBUG: 'F',
      };
      const response = await fetchData('standard/empJob/biz/reg/list', params);
      if (!response.success) {
        msgPopup(response.message || '등록 리스트를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const fetchedData = Array.isArray(response.data) ? response.data : [];
      const mappedData = fetchedData
        .filter((item) => item.DDATE !== '')
        .map((item) => ({
          CLASSACD: item.CLASSACD || '',
          CLASSBCD: item.CLASSBCD || '',
          CLASSCCD: item.CLASSCCD || '',
          CLASSANM: item.CLASSANM || '',
          CLASSBNM: item.CLASSBNM || '',
          CLASSCNM: item.CLASSCNM || '',
          CUSTOMER: item.BIZTXT || '',
          ORIGINAL_CUSTOMER: item.BIZTXT || '', // 원본 값 저장
          DISPATCHCD: item.BIZRUN || '',
          DISPATCH: item.BIZRUNNM || '',
          WORKERSCD: item.BIZMAN || '',
          WORKERS: item.BIZMANNM || '',
          WORKTIMECD: item.WORKCD || '',
          WORKTIME: item.WORKNM || '',
          LINES: item.WORKCNT || '1',
          PROCESS: item.BIZWORKGB || '',
          PROCESSNM: item.BIZWORKGBNM || '',
          PROCESSTIME: item.WORKM || '0',
          ORIGINAL_PROCESSTIME: item.WORKM || '0', // 원본 값 저장
          WORKDATE: item.DDATE || '',
          BIZINPUTKEY: item.BIZINPUTKEY || '',
        }));
      setRegisteredList(mappedData);
      if (response.data && response.data[0] && response.data[0].MODIFYN === 'N') {
        setIsButtonVisible(false);
      } else {
        setIsButtonVisible(true);
      }
    } catch (err) {
      console.error('등록 리스트 로드 실패:', err);
      errorMsgPopup(err.response?.data?.message || '등록 리스트를 가져오는 중 오류가 발생했습니다.');
    }
  };

  // 수정 및 삭제 처리
  const handleSave = async (action, index) => {
    const item = registeredList[index];

    if (action === 'update') {
      // 회선번호+고객명 검증 (최대 200자)
      const customerValidation = common.validateVarcharLength(item.CUSTOMER, 200, "회선번호+고객명");
      if (!customerValidation.valid) {
        errorMsgPopup(customerValidation.error);
        return;
      }

      // 처리시간 검증 (최대 8자)
      const processTimeValidation = common.validateVarcharLength(String(item.PROCESSTIME), 8, "처리시간(분)");
      if (!processTimeValidation.valid) {
        errorMsgPopup(processTimeValidation.error);
        return;
      }

      // 수정 시 해당 항목의 PROCESSTIME만 확인
      if (parseInt(item.PROCESSTIME) > 1440) {
        msgPopup("하루 24시간 초과하면 안됩니다.");
        return;
      }
    }

    try {
      const params = {
        pGUBUN: action === 'update' ? 'U' : 'DD',
        pDATE1: item.WORKDATE,
        pDATE2: item.WORKDATE,
        pCLASSCD: item.CLASSCCD,
        pBIZTXT: item.CUSTOMER,
        pBIZRUN: item.DISPATCHCD,
        pBIZMAN: item.WORKERSCD,
        pWORKCD: item.WORKTIMECD,
        pWORKCNT: item.LINES,
        pWORKGBCD: item.PROCESS,
        pWORKGBTM: item.PROCESSTIME,
        pSECTIONCD: classGubun,
        pORIGINBIZINPUTKEY: item.BIZINPUTKEY || '',
        pEMPNO: user?.empNo || '',
      };

      const response = await fetchData('standard/empJob/biz/reg/save', params);
      if (!response.success) {
        msgPopup(response.errMsg || `${action === 'update' ? '수정' : '삭제'} 중 오류가 발생했습니다.`);
        return;
      } else {
        if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
          let errMsg = response.errMsg;
          if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          msgPopup(errMsg);
          return;
        }
      }
      await fetchRegisteredList(params.pDATE1);
      msgPopup(`${action === 'update' ? '수정' : '삭제'} 완료`);
    } catch (err) {
      console.error(`${action} 실패:`, err);
      msgPopup(err.response?.data?.errMsg || `${action === 'update' ? '수정' : '삭제'} 중 오류가 발생했습니다.`);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchClassData(classGubun);
    fetchBizWorkTypes();
    fetchRegisteredList(workDate);
  }, [classGubun, workDate]);

  const handleToggleSidebar = () => setShowSidebar(!showSidebar);

  const handleLogout = async () => {
    try {
      const response = await api.post(common.getServerUrl('auth/logout'), {});
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

  const handleRowChange = (index, field, value) => {
    setRegisteredList((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === "PROCESSTIME" ? (value === '' ? '0' : parseInt(value) || 0) : value } : item
      )
    );
  };

  // 모달 열기
  const moveToReg = () => {
    setShowRegModal(true);
  };

  // 모달 닫기
  const handleRegModalClose = () => {
    setShowRegModal(false);
  };

  // 등록 후 리스트 새로고침
  const handleRegSubmit = async () => {
    await fetchRegisteredList(workDate);
    setShowRegModal(false);
  };

  return (
    <div className="container-fluid p-0">
      <header className="header">
        <h1 className="h5 mb-0">표준활동[BIZ]</h1>
        <button className="btn text-white" onClick={handleToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
      </header>
      <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

      <div className='pageMain'>
        <div className='formDivBox d-flex gap-3'>
          <div className='d-flex'>
            <label className='formLabel'>일자</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className={styles.formDate}
            />
          </div>
          <div className='d-flex'>
            <label className='formLabel'>분야</label>
            <input
              type="text"
              value={'BIZ'}
              disabled
              className={styles.formInputDisabled}
            />
          </div>
        </div>

        <div className="mb-4">
          <button className='btn btn-primary btnCheck' onClick={moveToReg}>
            표준활동 등록
          </button>
        </div>
        <div className='listSubmitWrap'>
          <span>※ 등록 리스트 ({workDate})</span>
          <span style={{ color: "blue" }}>[총 처리시간: {totalRegisteredTime}(분), {formatTime(totalRegisteredTime)}(시간)]</span>
        </div>
        {/* <div className={`${styles.formDivTimeBox}`}>
          <label className='formLabel mb-0'>총 처리시간</label>
          <div>
            <input className={styles.formTime} type='text' value={totalRegisteredTime}  readOnly aria-label='분 단위 시간' />
            <span className={styles.formTimeSpan}>(분)</span>
            <span className='ms-3'></span>
            <input className={styles.formTime} type='text' value={formatTime(totalRegisteredTime)} readOnly  aria-label='시간 단위 시간' />
            <span className={styles.formTimeSpan}>(시간)</span>
          </div>
        </div> */}
        {registeredList.length > 0 ? (
          registeredList.map((item, index) => (
            <div key={index} className='formDivBox'>
              <ul className='formListData'>
                <li>
                  <span className='formLabel'>대분류</span>
                  <span className='formText'>{item.CLASSANM}</span>
                </li>
                <li>
                  <span className='formLabel'>중분류</span>
                  <span className='formText'>{item.CLASSBNM}</span>
                </li>
                <li>
                  <span className='formLabel'>소분류</span>
                  <span className='formText'>{item.CLASSCNM}</span>
                </li>
                <li>
                  <span className='formLabel'>회선번호+고객명</span>
                  <input
                    type="text"
                    value={item.CUSTOMER}
                    onChange={(e) => handleRowChange(index, "CUSTOMER", e.target.value)}
                    className={`${styles.formInput}`}
                    style={{
                      backgroundColor: item.CUSTOMER !== item.ORIGINAL_CUSTOMER ? '#fff9e6' : '#fff',
                    }}
                  />
                </li>
                <li>
                  <span className='formLabel'>출동여부</span>
                  <span className='formText'>{item.DISPATCH}</span>
                </li>
                <li>
                  <span className='formLabel'>작업인원</span>
                  <span className='formText'>{item.WORKERS}</span>
                </li>
                <li>
                  <span className='formLabel'>근무시간</span>
                  <span className='formText'>{item.WORKTIME}</span>
                </li>
                <li>
                  <span className='formLabel'>회선수</span>
                  <span className='formText'>{item.LINES}</span>
                </li>
                <li>
                  <span className='formLabel'>프로세스</span>
                  <span className='formText'>{item.PROCESSNM}</span>
                </li>
                <li>
                  <span className='formLabel'>처리시간(분)</span>
                  <input
                    type="number"
                    min="0"
                    value={item.PROCESSTIME}
                    onChange={(e) => handleRowChange(index, "PROCESSTIME", e.target.value)}
                    className={`${styles.minInput}`}
                    style={{
                      backgroundColor: item.PROCESSTIME !== item.ORIGINAL_PROCESSTIME ? '#fff9e6' : '#fff',
                    }}
                  />
                </li>
                {isButtonVisible && (
                  <li>
                    <span className='formLabel'>작업</span>
                    <div className='d-flex gap-1'>
                      <button
                        className={`${styles.btn} btn-secondary`}
                        onClick={() => handleSave('update', index)}
                      >
                        수정
                      </button>
                      <button
                        className={`${styles.btn} btn-primary`}
                        onClick={() => handleSave('delete', index)}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          ))
        ) : (
          <div className="nodataWrap">조회된 목록이 없습니다.</div>
        )}
      </div>
      <Modal show={showRegModal} onHide={handleRegModalClose} centered className={styles.customModal}>
        <Modal.Body className={styles.modalBody}>
          <MobileStandardBizLogReg
            workDate={workDate}
            classGubun={classGubun}
            classData={classData}
            bizWorkTypes={bizWorkTypes}
            onHide={handleRegModalClose}
            onSubmit={handleRegSubmit}
            formData={formData}
            setFormData={setFormData}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MobileStandardBizLog;