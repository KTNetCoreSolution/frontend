import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { fetchData } from "../../utils/dataUtils";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { hasPermission } from '../../utils/authUtils';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import MobileStandardCommonLogReg from './MobileStandardCommonLogReg';
import Modal from 'react-bootstrap/Modal';
import styles from './MobileStandardCommonLog.module.css';
import api from '../../utils/api';
import common from "../../utils/common";

const MobileStandardCommonLog = () => {
  const { user, clearUser } = useStore();
  const navigate = useNavigate();
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [registeredList, setRegisteredList] = useState([]);
  const [workDate, setWorkDate] = useState(common.getTodayDate());
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [classGubun, setClassGubun] = useState(user?.standardSectionCd || 'LINE');
  const [classData, setClassData] = useState([]);
  const [workTypeOptions, setWorkTypeOptions] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [formData, setFormData] = useState({
    CLASSACD: "all",
    CLASSBCD: "all",
    CLASSCCD: "all",
    NAME: "",
    WORKTYPE: "",
    WORKDATE: workDate,
    STARTTIME: "09:00",
    ENDTIME: "18:00",
    QUANTITY: "1",
    isWeekly: false,
    isDuplicate: false,
  });

  /*
  useEffect(() => {
    msgPopup("작업중입니다.");
    navigate('/mobile/Main');
  }, [navigate]);
  */

  // 등록 리스트 총 처리시간 계산
  const totalRegisteredTime = useMemo(() => {
    return registeredList.reduce((sum, item) => sum + (parseInt(item.WORKM) || 0), 0);
  }, [registeredList]);

  // 분을 시간:분 형식으로 변환
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // 시간 옵션 생성 함수
  const generateTimeOptions = (isWeekly = false, startTime = null, isEnd = false) => {
    const options = [];
    const startHour = isWeekly ? 9 : 0;
    const endHour = isWeekly ? (isEnd ? 18 : 17) : 23;
    for (let h = startHour; h <= endHour; h++) {
      options.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < endHour || (h === endHour && (!isWeekly || !isEnd))) {
        options.push(`${h.toString().padStart(2, '0')}:30`);
      }
    }
    if (isEnd && !isWeekly) {
      options.push('23:59');
    }
    if (isEnd && startTime) {
      const startMin = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      return options.filter((time) => {
        const [h, m] = time.split(':').map(Number);
        const timeMin = (h === 24 ? 24 : h) * 60 + m;
        return timeMin > startMin;
      });
    }
    return options;
  };

  // 종료 시간 옵션 생성
  const getListEndTimeOptions = (startTime) => generateTimeOptions(false, startTime, true);

  // 시간 문자열을 분 단위로 변환
  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return (h === 24 ? 24 : h) * 60 + m;
  };

  // 시간 범위 유효성 검사 (점심 시간 등 입력 불가 시간 확인)
  const isInvalidTimeRange = (start, end) => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    const lunchStart = timeToMinutes(classData[0]?.BSTARTDT || '12:00');
    const lunchEnd = timeToMinutes(classData[0]?.BENDDT || '13:00');
    return startMin < lunchEnd && endMin > lunchStart;
  };

  // 시간 중복 검사
  const checkTimeOverlap = (newStart, newEnd, excludeIndex = -1) => {
    const newStartMin = timeToMinutes(newStart);
    const newEndMin = timeToMinutes(newEnd);
    return registeredList.some((item, i) => {
      if (i === excludeIndex) return false;
      if (item.CLASSCNM !== registeredList[excludeIndex]?.CLASSCNM || item.WORKDATE !== registeredList[excludeIndex]?.WORKDATE) return false;
      const itemStartMin = timeToMinutes(item.STARTTIME);
      const itemEndMin = timeToMinutes(item.ENDTIME);
      return (
        (newStartMin < itemEndMin && newEndMin > itemStartMin) ||
        (newStartMin >= itemStartMin && newEndMin <= itemEndMin)
      );
    });
  };

  // classData 가져오기
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

  // WORKTYPE 옵션 가져오기
  const fetchWorkTypeOptions = async () => {
    try {
      const params = {
        pGUBUN: 'WORKTYPE',
        pDEBUG: 'F',
      };
      const response = await fetchData('standard/ddlList', params);
      if (!response.success) {
        msgPopup(response.message || 'WORKTYPE 옵션을 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const fetchedOptions = Array.isArray(response.data) ? response.data : [];
      setWorkTypeOptions(fetchedOptions.map((item) => ({ value: String(item.DDLCD), label: item.DDLNM })));
    } catch (err) {
      console.error('WORKTYPE 옵션 로드 실패:', err);
      msgPopup(err.response?.data?.message || 'WORKTYPE 옵션을 가져오는 중 오류가 발생했습니다.');
    }
  };

  // 등록 리스트 가져오기
  const fetchRegisteredList = async (date) => {
    try {
      const params = {
        pGUBUN: 'LIST',
        pEMPNO: user?.empNo || '',
        pDATE1: date,
        pSECTIONCD: classGubun,
        pDEBUG: 'F',
      };
      const response = await fetchData('standard/empJob/common/reg/list', params);
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
          NAME: '긴급민원',
          WORKTYPE: String(item.WORKCD) || '',
          WORKDATE: item.DDATE || '',
          STARTTIME: item.STARTTM || '',
          ORGIN_STARTTM: item.STARTTM || '',
          ENDTIME: item.ENDTM || '',
          WORKHOURS: item.WORKH || 0,
          WORKM: item.WORKM || 0,
          QUANTITY: item.WORKCNT || '0',
          WORKDATETIME: `${item.DDATE} ${item.STARTTM} ~ ${item.ENDTM}`,
          WORKNM: item.WORKNM || '',
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

    // 건(구간/본/개소) 유효성 검사
    const quantityValidation = common.validateVarcharLength(String(item.QUANTITY), 10, "건(구간/본/개소)");
    if (!quantityValidation.valid) {
      errorMsgPopup(quantityValidation.error);
      return;
    }

    // 시간 범위 검사
    if (timeToMinutes(item.STARTTIME) >= timeToMinutes(item.ENDTIME)) {
      msgPopup('종료시간이 시작시간보다 큽니다.');
      return;
    }

    // 점심 시간대 입력 불가 검사
    if (isInvalidTimeRange(item.STARTTIME, item.ENDTIME)) {
      msgPopup(`${classData[0]?.BSTARTDT || '12:00'} ~ ${classData[0]?.BENDDT || '13:00'} 입력 불가 시간입니다.`);
      return;
    }

    // 시간 중복 검사
    if (checkTimeOverlap(item.STARTTIME, item.ENDTIME, index)) {
      msgPopup('오류!\n이미 입력한 업무시간입니다.!!');
      return;
    }

    try {
      const params = {
        pGUBUN: action === 'update' ? 'U' : 'D',
        pDATE1: item.WORKDATE,
        pDATE2: item.WORKDATE,
        pORGIN_STARTTM: item.ORGIN_STARTTM,
        pSTARTTM: item.STARTTIME,
        pENDTM: item.ENDTIME,
        pCLASSCD: item.CLASSCCD,
        pWORKCD: item.WORKTYPE,
        pWORKCNT: item.QUANTITY,
        pSECTIONCD: classGubun,
        pEMPNO: user?.empNo || ''
      };

      const response = await fetchData('standard/empJob/common/reg/save', params);
      if (!response.success) {
        msgPopup(response.message || `${action === 'update' ? '수정' : '삭제'} 중 오류가 발생했습니다.`);
        return;
      } else {
        if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
          let errMsg = response.errMsg;
          if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          msgPopup(errMsg);
          await fetchRegisteredList(item.WORKDATE);
          return;
        }
      }

      await fetchRegisteredList(item.WORKDATE);
      msgPopup(`${action === 'update' ? '수정' : '삭제'} 완료`);
    } catch (err) {
      console.error(`${action === 'update' ? '수정' : '삭제'} 실패:`, err);
      errorMsgPopup(err.response?.data?.message || `${action === 'update' ? '수정' : '삭제'} 중 오류가 발생했습니다.`);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchClassData(classGubun);
    fetchWorkTypeOptions();
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
        i === index
          ? {
              ...item,
              [field]: value,
              ...(field === 'STARTTIME'
                ? {
                    ENDTIME:
                      timeToMinutes(value) >= timeToMinutes(item.ENDTIME)
                        ? getListEndTimeOptions(value)[0] || item.ENDTIME
                        : item.ENDTIME,
                    WORKDATETIME: `${item.WORKDATE} ${value} ~ ${
                      timeToMinutes(value) >= timeToMinutes(item.ENDTIME)
                        ? getListEndTimeOptions(value)[0] || item.ENDTIME
                        : item.ENDTIME
                    }`,
                  }
                : field === 'ENDTIME'
                ? {
                    WORKDATETIME: `${item.WORKDATE} ${item.STARTTIME} ~ ${value}`,
                  }
                : {}),
            }
          : item
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
        <h1 className="h5 mb-0">표준활동</h1>
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
            {hasPermission(user?.auth, 'standardOper') ? (
              <select
                value={classGubun}
                onChange={(e) => setClassGubun(e.target.value)}
                className={styles.formSelect}
              >
                <option value="LINE">선로</option>
                <option value="DESIGN">설계</option>
              </select>
            ) : (
              <input
                type="text"
                value={
                  user?.standardSectionCd === 'LINE'
                    ? '선로'
                    : user?.standardSectionCd === 'DESIGN'
                    ? '설계'
                    : ''
                }
                disabled
                className={styles.formInputDisabled}
              />
            )}
          </div>
        </div>

        <button className='btn btn-primary btnCheck' onClick={moveToReg}>
          표준활동 등록
        </button>
        <div className='listSubmitWrap'>
          <span>※ 등록 리스트 ({workDate})</span>
          <span style={{ color: "#237FB3" }}>[총:{totalRegisteredTime}(분), {formatTime(totalRegisteredTime)}(시간)]</span>
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
              <ul className='formDataWrap'>
                <li>
                  <span className="formLabel" style={{width: '120px'}}>시간</span>
                  <div className="formData">
                    <select
                      value={item.STARTTIME}
                      onChange={(e) => handleRowChange(index, 'STARTTIME', e.target.value)}
                      className={styles.listSelect}
                    >
                      {generateTimeOptions(false).map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    ~
                    <select
                      value={item.ENDTIME}
                      onChange={(e) => handleRowChange(index, 'ENDTIME', e.target.value)}
                      className={styles.listSelect}
                    >
                      {getListEndTimeOptions(item.STARTTIME).map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                <li>
                  <span className="formLabel" style={{width: '120px'}}>대분류</span>
                  <div className="formData">{item.CLASSANM}</div>
                </li>
                <li>
                  <span className="formLabel" style={{width: '120px'}}>중분류</span>
                  <div className="formData">{item.CLASSBNM}</div>
                </li>
                <li>
                  <span className="formLabel" style={{width: '120px'}}>소분류</span>
                  <div className="formData">{item.CLASSCNM}</div>
                </li>
                <li>
                  <span className="formLabel" style={{width: '120px'}}>건(구간/본/개소)</span>
                  <div className="formData">
                    <input
                      type="number"
                      value={item.QUANTITY}
                      onChange={(e) => handleRowChange(index, 'QUANTITY', e.target.value)}
                      min="0"
                      className="text-end"
                      style={{width: '80px'}}
                    />
                  </div>
                </li>
                <li>
                  <span className="formLabel" style={{width: '120px'}}>근무형태</span>
                  <div className="formData">
                    <select
                      value={item.WORKTYPE || ''}
                      onChange={(e) => handleRowChange(index, 'WORKTYPE', e.target.value)}
                      className={styles.listSelect2}
                    >
                      {workTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                {isButtonVisible && (
                  <li>
                    <span className="formLabel" style={{width: '120px'}}>작업</span>
                    <div className="formListDataRow">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleSave('update', index)}
                      >
                        수정
                      </button>
                      <button
                        className="btn btn-primary"
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
      <Modal show={showRegModal} onHide={handleRegModalClose} centered className='customModal' style={{zIndex: 1050}}>
        <Modal.Body className={styles.modalBody}>
          <MobileStandardCommonLogReg
            workDate={workDate}
            classGubun={classGubun}
            classData={classData}
            workTypeOptions={workTypeOptions}
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

export default MobileStandardCommonLog;