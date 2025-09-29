import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../../../store/store';
import Modal from 'react-bootstrap/Modal';
import styles from './StandardEmpJobRegPopup.module.css';
import StandardClassSelectPopup from './StandardClassSelectPopup';
import { fetchData } from '../../../utils/dataUtils';
import { msgPopup } from '../../../utils/msgPopup';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import common from "../../../utils/common";

const getFieldOptions = (fieldId, dependentValue = '', classData) => {
  if (!Array.isArray(classData)) return [];
  const uniqueMap = new Map();

  if (fieldId === 'CLASSACD') {
    classData.forEach((item) => {
      if (item.CLASSACD && item.CLASSANM && !uniqueMap.has(item.CLASSACD)) {
        uniqueMap.set(item.CLASSACD, { value: item.CLASSACD, label: item.CLASSANM });
      }
    });
    return [{ value: 'all', label: '==대분류==' }, ...Array.from(uniqueMap.values())];
  }

  if (fieldId === 'CLASSBCD') {
    if (!dependentValue || dependentValue === 'all') {
      return [{ value: 'all', label: '==중분류==' }];
    }
    classData
      .filter((item) => item.CLASSACD === dependentValue)
      .forEach((item) => {
        if (item.CLASSBCD && item.CLASSBNM && !uniqueMap.has(item.CLASSBCD)) {
          uniqueMap.set(item.CLASSBCD, { value: item.CLASSBCD, label: item.CLASSBNM });
        }
      });
    return [{ value: 'all', label: '==중분류==' }, ...Array.from(uniqueMap.values())];
  }

  if (fieldId === 'CLASSCCD') {
    if (!dependentValue || dependentValue === 'all') {
      return [{ value: 'all', label: '==소분류==' }];
    }
    classData
      .filter((item) => item.CLASSBCD === dependentValue)
      .forEach((item) => {
        if (item.CLASSCCD && item.CLASSCNM && !uniqueMap.has(item.CLASSCCD)) {
          uniqueMap.set(item.CLASSCCD, { value: item.CLASSCCD, label: item.CLASSCNM });
        }
      });
    return [{ value: 'all', label: '==소분류==' }, ...Array.from(uniqueMap.values())];
  }

  return [];
};

const StandardEmpJobRegPopup = ({ show, onHide, filters, data }) => {
  const { user } = useStore();
  const today = common.getTodayDate();
  const [formData, setFormData] = useState({
    CLASSACD: 'all',
    CLASSBCD: 'all',
    CLASSCCD: 'all',
    NAME: '',
    WORKTYPE: '',
    WORKDATE: today,
    STARTTIME: '09:00',
    ENDTIME: '18:00',
    QUANTITY: '1',
    isWeekly: false,
    isDuplicate: false,
  });
  const [registeredList, setRegisteredList] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);
  const [classPopupState, setClassPopupState] = useState({ show: false, editingIndex: -1 });
  const [workTypeOptions, setWorkTypeOptions] = useState([]);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [classGubun, setClassGubun] = useState(filters.classGubun || 'LINE');

  useEffect(() => {
    setClassGubun(filters.classGubun || 'LINE');
  }, [filters.classGubun]);

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

  const formTimeOptions = useMemo(() => generateTimeOptions(formData.isWeekly), [formData.isWeekly]);
  const formEndTimeOptions = useMemo(() => generateTimeOptions(formData.isWeekly, formData.STARTTIME, true), [
    formData.isWeekly,
    formData.STARTTIME,
  ]);

  const listTimeOptions = useMemo(() => generateTimeOptions(false), []);

  const getListEndTimeOptions = (startTime) => generateTimeOptions(false, startTime, true);

  const updatedClass2Options = useMemo(() => getFieldOptions('CLASSBCD', formData.CLASSACD, data), [formData.CLASSACD, data]);
  const updatedClass3Options = useMemo(() => getFieldOptions('CLASSCCD', formData.CLASSBCD, data), [formData.CLASSBCD, data]);

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

  useEffect(() => {
    setClass2Options(updatedClass2Options);
  }, [updatedClass2Options]);

  useEffect(() => {
    setClass3Options(updatedClass3Options);
  }, [updatedClass3Options]);

  useEffect(() => {
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
        setWorkTypeOptions(fetchedOptions.map((item) => ({ value: item.DDLCD, label: item.DDLNM })));
      } catch (err) {
        console.error('WORKTYPE 옵션 로드 실패:', err);
        msgPopup(err.response?.data?.message || 'WORKTYPE 옵션을 가져오는 중 오류가 발생했습니다.');
      }
    };
    fetchWorkTypeOptions();
  }, []);

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
          WORKTYPE: item.WORKCD || '',
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
      msgPopup(err.response?.data?.message || '등록 리스트를 가져오는 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (formData.WORKDATE) {
      fetchRegisteredList(formData.WORKDATE);
    }
  }, [formData.WORKDATE, user?.empNo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      let newData = { ...prev };
      if (name === 'CLASSACD') {
        newData.CLASSACD = value;
        newData.CLASSBCD = 'all';
        newData.CLASSCCD = 'all';
      } else if (name === 'CLASSBCD') {
        newData.CLASSBCD = value;
        newData.CLASSCCD = 'all';
      } else if (name === 'STARTTIME') {
        newData.STARTTIME = value;
        // Calculate new ENDTIME based on STARTTIME
        const startMin = parseInt(value.split(':')[0]) * 60 + parseInt(value.split(':')[1]);
        const nextTime = startMin + 30; // Set ENDTIME to STARTTIME + 30 minutes
        const hours = Math.floor(nextTime / 60);
        const minutes = nextTime % 60;
        const newEndTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        // Ensure newEndTime is within valid range
        const validEndTime = formEndTimeOptions.find((time) => timeToMinutes(time) >= timeToMinutes(newEndTime)) || formEndTimeOptions[0] || prev.ENDTIME;
        newData.ENDTIME = validEndTime;
      } else if (name === 'isDuplicate') {
        newData.isDuplicate = checked;
        newData.QUANTITY = checked ? '0' : '1';
      } else if (name === 'isWeekly') {
        newData.isWeekly = checked;
        if (checked) {
          newData.STARTTIME = '09:00';
          newData.ENDTIME = '17:30';
        }
      } else {
        newData[name] = type === 'checkbox' ? checked : value;
      }
      return newData;
    });
  };

  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return (h === 24 ? 24 : h) * 60 + m;
  };

  const isInvalidTimeRange = (start, end) => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    const lunchStart = timeToMinutes(data[0]?.BSTARTDT || '12:00');
    const lunchEnd = timeToMinutes(data[0]?.BENDDT || '13:00');
    return startMin < lunchEnd && endMin > lunchStart;
  };

  const checkTimeOverlap = (newStart, newEnd, excludeIndex = -1) => {
    const newStartMin = timeToMinutes(newStart);
    const newEndMin = timeToMinutes(newEnd);
    return registeredList.some((item, i) => {
      if (i === excludeIndex) return false;
      if (item.CLASSCNM !== formData.CLASSCNM || item.WORKDATE !== formData.WORKDATE) return false;
      const itemStartMin = timeToMinutes(item.STARTTIME);
      const itemEndMin = timeToMinutes(item.ENDTIME);
      return (
        (newStartMin < itemEndMin && newEndMin > itemStartMin) ||
        (newStartMin >= itemStartMin && newEndMin <= itemEndMin)
      );
    });
  };

  const calculateWorkHours = (start, end) => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    return (endMin - startMin) / 60;
  };

  const handleClose = () => {
    setClassPopupState({ show: false, editingIndex: -1 });
    onHide(); // 모달을 닫기 위해 onHide 호출
  };

  const handleSave = async (action, index = -1) => {
    let params;
    if (action === 'register') {
      // 건(구간/본/개소) 검증 (최대 10자)
      if (!formData.isDuplicate) {
        const quantityValidation = common.validateVarcharLength(String(formData.QUANTITY), 10, "건(구간/본/개소)");
        if (!quantityValidation.valid) {
          errorMsgPopup(quantityValidation.error);
          return;
        }
      }

      if (formData.CLASSCCD === 'all' || formData.WORKTYPE === '' || (!formData.isDuplicate && !formData.QUANTITY)) {
        msgPopup('소분류, 건수, 근무형태를 확인해주세요.');
        return;
      }

      if (timeToMinutes(formData.STARTTIME) >= timeToMinutes(formData.ENDTIME)) {
        msgPopup('종료시간이 시작시간보다 큽니다.');
        return;
      }

      if (isInvalidTimeRange(formData.STARTTIME, formData.ENDTIME)) {
        msgPopup(`${data[0]?.BSTARTDT || '12:00'} ~ ${data[0]?.BENDDT || '13:00'} 입력 불가 시간입니다.`);
        return;
      }

      if (checkTimeOverlap(formData.STARTTIME, formData.ENDTIME)) {
        msgPopup('오류!\n이미 입력한 업무시간입니다.!!');
        return;
      }
      params = {
        pGUBUN: 'I',
        pDATE1: formData.WORKDATE,
        pDATE2: formData.WORKDATE,
        pORGIN_STARTTM: formData.STARTTIME,
        pSTARTTM: formData.STARTTIME,
        pENDTM: formData.ENDTIME,
        pCLASSCD: formData.CLASSCCD,
        pWORKCD: formData.WORKTYPE,
        pWORKCNT: formData.isDuplicate ? '0' : formData.QUANTITY,
        pSECTIONCD: classGubun,
        pEMPNO: user?.empNo || '',
      };
    } else if (action === 'update') {
      const item = registeredList[index];

      // 건(구간/본/개소) 검증 (최대 10자)
      const quantityValidation = common.validateVarcharLength(String(item.QUANTITY), 10, "건(구간/본/개소)");
      if (!quantityValidation.valid) {
        errorMsgPopup(quantityValidation.error);
        return;
      }

      if (timeToMinutes(item.STARTTIME) >= timeToMinutes(item.ENDTIME)) {
        msgPopup('종료시간이 시작시간보다 큽니다.');
        return;
      }

      if (isInvalidTimeRange(item.STARTTIME, item.ENDTIME)) {
        msgPopup(`${data[0]?.BSTARTDT || '12:00'} ~ ${data[0]?.BENDDT || '13:00'} 입력 불가 시간입니다.`);
        return;
      }

      params = {
        pGUBUN: 'U',
        pDATE1: item.WORKDATE,
        pDATE2: item.WORKDATE,
        pORGIN_STARTTM: item.ORGIN_STARTTM,
        pSTARTTM: item.STARTTIME,
        pENDTM: item.ENDTIME,
        pCLASSCD: item.CLASSCCD,
        pWORKCD: item.WORKTYPE,
        pWORKCNT: item.QUANTITY,
        pSECTIONCD: classGubun,
        pEMPNO: user?.empNo || '',
      };
    } else {
      const item = registeredList[index];
      params = {
        pGUBUN: 'D',
        pDATE1: item.WORKDATE,
        pDATE2: item.WORKDATE,
        pORGIN_STARTTM: item.ORGIN_STARTTM,
        pSTARTTM: item.STARTTIME,
        pENDTM: item.ENDTIME,
        pCLASSCD: item.CLASSCCD,
        pWORKCD: item.WORKTYPE,
        pWORKCNT: item.QUANTITY,
        pSECTIONCD: classGubun,
        pEMPNO: user?.empNo || '',
      };
    }

    try {
      const response = await fetchData('standard/empJob/common/reg/save', params);
      if (!response.success) {
        msgPopup(response.errMsg || `${action === 'register' ? '등록' : action === 'update' ? '수정' : '삭제'} 중 오류가 발생했습니다.`);
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
      if (action !== 'register') {
          msgPopup(`${action === 'update' ? '수정' : '삭제'} 완료`);
      }
    } catch (err) {
      console.error(`${action} 실패:`, err);
      msgPopup(err.response?.data?.errMsg || `${action === 'register' ? '등록' : action === 'update' ? '수정' : '삭제'} 중 오류가 발생했습니다.`);
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
                    WORKHOURS: calculateWorkHours(
                      value,
                      timeToMinutes(value) >= timeToMinutes(item.ENDTIME)
                        ? getListEndTimeOptions(value)[0] || item.ENDTIME
                        : item.ENDTIME
                    ),
                    WORKDATETIME: `${item.WORKDATE} ${value} ~ ${
                      timeToMinutes(value) >= timeToMinutes(item.ENDTIME)
                        ? getListEndTimeOptions(value)[0] || item.ENDTIME
                        : item.ENDTIME
                    }`,
                  }
                : field === 'ENDTIME'
                ? {
                    WORKHOURS: calculateWorkHours(item.STARTTIME, value),
                    WORKDATETIME: `${item.WORKDATE} ${item.STARTTIME} ~ ${value}`,
                  }
                : {}),
            }
          : item
      )
    );
  };

  const handleClassSelect = ({ major, middle, minor }) => {
    const editingIndex = classPopupState.editingIndex;
    if (editingIndex === -1) {
      setClass2Options(getFieldOptions('CLASSBCD', major, data));
      setClass3Options(getFieldOptions('CLASSCCD', middle, data));
      setFormData((prev) => ({
        ...prev,
        CLASSACD: major,
        CLASSBCD: middle,
        CLASSCCD: minor,
      }));
    } else {
      const selectedMajor = data.find((item) => item.CLASSACD === major);
      const selectedMiddle = data.find((item) => item.CLASSBCD === middle);
      const selectedMinor = data.find((item) => item.CLASSCCD === minor);

      setRegisteredList((prev) =>
        prev.map((item, i) =>
          i === editingIndex
            ? {
                ...item,
                CLASSACD: major,
                CLASSBCD: middle,
                CLASSCCD: minor,
                CLASSANM: selectedMajor ? selectedMajor.CLASSANM : '',
                CLASSBNM: selectedMiddle ? selectedMiddle.CLASSBNM : '',
                CLASSCNM: selectedMinor ? selectedMinor.CLASSCNM : '',
              }
            : item
        )
      );
    }
    setClassPopupState({ show: false, editingIndex: -1 });
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>개별업무 등록</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        <div className={styles.noteSection}>
          <span>* 익월 {data[0]?.CLOSEDT || '10'}일 지나면 전월자료 수정 불가 합니다.<br/>
          * {data[0]?.BSTARTDT || '12:00'} ~ {data[0]?.BENDDT || '13:00'} 은 입력이 불가한 시간입니다.
          </span>
          <div className={styles.noteButtons}>
            {isButtonVisible && (
              <button className={`btn text-bg-success`} onClick={() => handleSave('register')}>
                등록
              </button>
            )}
            <button className={`btn text-bg-secondary`} onClick={() => handleClose()}>
                닫기
            </button>
          </div>
        </div>
        <table className={styles.formTable}>
          <tbody>
            <tr>
              <td className={styles.td1}>
                대분류:<button onClick={() => setClassPopupState({ show: true, editingIndex: -1 })} className={`${styles.btn} text-bg-secondary`}>
                  선택
                </button>
              </td>
              <td className={styles.td2}>
                <select name="CLASSACD" value={formData.CLASSACD} onChange={handleChange} className={styles.select}>
                  <option value="all">==대분류==</option>
                  {getFieldOptions('CLASSACD', '', data)
                    .slice(1)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </td>
              <td className={styles.td3}>중분류:</td>
              <td>
                <select name="CLASSBCD" value={formData.CLASSBCD} onChange={handleChange} className={styles.select}>
                  <option value="all">==중분류==</option>
                  {class2Options.slice(1).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td>소분류:</td>
              <td>
                <select name="CLASSCCD" value={formData.CLASSCCD} onChange={handleChange} className={styles.select}>
                  <option value="all">==소분류==</option>
                  {class3Options.slice(1).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>건(구간/본/개소):</td>
              <td>
                {formData.isDuplicate ? (
                  <span>건(구간/본/개소)의 값이 0 으로 설정 됩니다.</span>
                ) : (
                  <input
                    type="number"
                    name="QUANTITY"
                    value={formData.QUANTITY}
                    onChange={handleChange}
                    placeholder="건수 입력"
                    min="0"
                    className={styles.duplicateInput}
                  />
                )}
                <input type="checkbox" name="isDuplicate" checked={formData.isDuplicate} onChange={handleChange} className={`${styles.checkbox}`} />
                <span className={styles.duplicateSpan}>중복건</span>
              </td>
            </tr>
            <tr>
              <td>업무 부가 설명:</td>
              <td colSpan="3">
                <span>{formData.CLASSCCD !== 'all' ? data.find(item => item.CLASSCCD === formData.CLASSCCD)?.DETAIL || '' : ''}</span>
              </td>
            </tr>
            <tr>
              <td>
                작업일시(주간:<input type="checkbox" name="isWeekly" checked={formData.isWeekly} onChange={handleChange} className={styles.checkbox}/> )
              </td>
              <td>
                <input type="date" name="WORKDATE" value={formData.WORKDATE} onChange={handleChange} className={styles.dateInput} />
                <select name="STARTTIME" value={formData.STARTTIME} onChange={handleChange} className={styles.timeSelect}>
                  {formTimeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                ~
                <select name="ENDTIME" value={formData.ENDTIME} onChange={handleChange} className={styles.timeSelect}>
                  {formEndTimeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </td>
              <td>근무형태:</td>
              <td>
                <select name="WORKTYPE" value={formData.WORKTYPE} onChange={handleChange} className={`${styles.select} ${styles.selectWorkType}`}>
                  <option value="">선택</option>
                  {workTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td colSpan="4">
                <h5>
                ※ 등록 리스트 ({formData.WORKDATE}) <span style={{ color: "#237FB3" }}>[총 처리시간: {totalRegisteredTime}(분), {formatTime(totalRegisteredTime)}(시간)]</span>
                </h5>
                <table className={styles.listTable}>
                  <thead>
                    <tr>
                      <th className={styles.thNo}>No</th>
                      <th className={styles.thDate}>날짜</th>
                      <th className={styles.thTime}>시간</th>
                      <th className={styles.thClassC}>소분류</th>
                      <th className={styles.thQuantity}>건(구간/본/개소)</th>
                      <th className={styles.thWorkType}>근무형태</th>
                      <th className={styles.thAction}>작업</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredList.map((item, index) => (
                      <tr key={index}>
                        <td className={styles.thNo}>{index + 1}</td>
                        <td className={styles.thDate}>{item.WORKDATE}</td>
                        <td className={styles.thTime}>
                          <select
                            value={item.STARTTIME}
                            onChange={(e) => handleRowChange(index, 'STARTTIME', e.target.value)}
                            className={styles.listSelect}
                          >
                            {listTimeOptions.map((time) => (
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
                        </td>
                        <td className={styles.thClassC}>
                          {item.CLASSCNM}
                          {isButtonVisible && (
                            <button
                              onClick={() => setClassPopupState({ show: true, editingIndex: index })}
                              className={`${styles.btn} ${styles.listBtn}  text-bg-secondary`}
                            >
                              선택
                            </button>
                          )}
                        </td>
                        <td className={styles.thQuantity}>
                          <input
                            type="number"
                            value={item.QUANTITY}
                            onChange={(e) => handleRowChange(index, 'QUANTITY', e.target.value)}
                            min="0"
                            className={`${styles.rowInput} ${styles.listInput}`}
                          />
                        </td>
                        <td className={styles.thWorkType}>
                          <select
                            value={item.WORKTYPE || ''}
                            onChange={(e) => handleRowChange(index, 'WORKTYPE', e.target.value)}
                            className={styles.listSelect}
                          >
                            <option value="">선택</option>
                            {workTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={styles.thAction}>
                          {isButtonVisible && (
                            <>
                              <button onClick={() => handleSave('update', index)} className={`${styles.btn} ${styles.listBtn} btn-secondary`}>
                                수정
                              </button>
                              <button onClick={() => handleSave('delete', index)} className={`${styles.btn} ${styles.listBtn} btn-primary`}>
                                삭제
                              </button>
                            </>
                          )}
                        </td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal.Body>
      <StandardClassSelectPopup
        show={classPopupState.show}
        onHide={() => setClassPopupState({ show: false, editingIndex: -1 })}
        onSelect={handleClassSelect}
        data={data}
      />
    </Modal>
  );
};

export default StandardEmpJobRegPopup;