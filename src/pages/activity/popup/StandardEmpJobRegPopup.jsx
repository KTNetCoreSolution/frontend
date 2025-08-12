import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-bootstrap/Modal';
import styles from './StandardEmpJobRegPopup.module.css';
import StandardClassSelectPopup from './StandardClassSelectPopup';
import { fetchData } from '../../../utils/dataUtils';

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

const StandardEmpJobRegPopup = ({ show, onHide, data }) => {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    CLASSACD: 'all',
    CLASSBCD: 'all',
    CLASSCCD: 'all',
    NAME: '', // 사용 안 함 (고정 span으로 대체)
    WORKTYPE: '',
    WORKDATE: today,
    STARTTIME: '09:00',
    ENDTIME: '18:00',
    QUANTITY: '',
    isWeekly: false,
  });
  const [registeredList, setRegisteredList] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);
  const [showClassPopup, setShowClassPopup] = useState(false);
  const [workTypeOptions, setWorkTypeOptions] = useState([]); // 추가: WORKTYPE 옵션 상태

  const generateTimeOptions = (isWeekly) => {
    const options = [];
    const startHour = isWeekly ? 9 : 0;
    const endHour = isWeekly ? 18 : 23;
    for (let h = startHour; h <= endHour; h++) {
      options.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < endHour || (h === endHour && !isWeekly)) {
        options.push(`${h.toString().padStart(2, '0')}:30`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions(formData.isWeekly);

  
  // useMemo로 옵션 최적화
  const updatedClass2Options = useMemo(
    () => getFieldOptions('CLASSBCD', formData.CLASSACD, data),
    [formData.CLASSACD, data]
  );
  const updatedClass3Options = useMemo(
    () => getFieldOptions('CLASSCCD', formData.CLASSBCD, data),
    [formData.CLASSBCD, data]
  );

  useEffect(() => {
    setClass2Options(updatedClass2Options);
  }, [updatedClass2Options]);

  useEffect(() => {
    setClass3Options(updatedClass3Options);
  }, [updatedClass3Options]);

  // 추가: WORKTYPE 옵션을 API로 불러오는 useEffect
  useEffect(() => {
    const fetchWorkTypeOptions = async () => {
      try {
        const params = {
          pGUBUN: 'WORKTYPE',
          pDEBUG: 'F',
        };

        const response = await fetchData('standard/ddlList', params);
        if (!response.success) {
          console.error('WORKTYPE 옵션 로드 실패:', response.message);
          alert(response.message || 'WORKTYPE 옵션을 가져오는 중 오류가 발생했습니다.');
          return;
        }
        const fetchedOptions = Array.isArray(response.data) ? response.data : [];
        // API 응답을 {value: DDLCD, label: DDLNM} 형식으로 매핑
        setWorkTypeOptions(fetchedOptions.map(item => ({ value: item.DDLCD, label: item.DDLNM })));
      } catch (err) {
        console.error('WORKTYPE 옵션 로드 실패:', err);
        alert(err.response?.data?.message || 'WORKTYPE 옵션을 가져오는 중 오류가 발생했습니다.');
      }
    };

    fetchWorkTypeOptions();
  }, []); // 컴포넌트 마운트 시 한 번 호출

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      if (name === 'CLASSACD') {
        return {
          ...prev,
          CLASSACD: value,
          CLASSBCD: 'all',
          CLASSCCD: 'all',
        };
      } else if (name === 'CLASSBCD') {
        return {
          ...prev,
          CLASSBCD: value,
          CLASSCCD: 'all',
        };
      } else {
        return {
          ...prev,
          [name]: type === 'checkbox' ? checked : value,
        };
      }
    });
  };

  const checkTimeOverlap = (newStart, newEnd) => {
    const newStartMin = parseInt(newStart.split(':')[0]) * 60 + parseInt(newStart.split(':')[1]);
    const newEndMin = parseInt(newEnd.split(':')[0]) * 60 + parseInt(newEnd.split(':')[1]);

    return registeredList.some((item) => {
      if (item.CLASSCNM !== formData.CLASSCNM || item.WORKDATE !== formData.WORKDATE) return false;
      const itemStartMin = parseInt(item.STARTTIME.split(':')[0]) * 60 + parseInt(item.STARTTIME.split(':')[1]);
      const itemEndMin = parseInt(item.ENDTIME.split(':')[0]) * 60 + parseInt(item.ENDTIME.split(':')[1]);
      return (
        (newStartMin < itemEndMin && newEndMin > itemStartMin) ||
        (newStartMin >= itemStartMin && newEndMin <= itemEndMin)
      );
    });
  };

  const handleRegister = () => {
    if (checkTimeOverlap(formData.STARTTIME, formData.ENDTIME)) {
      alert('오류!\n이미 입력한 업무시간입니다.!!');
      return;
    }

    const selectedMajor = data.find((item) => item.CLASSACD === formData.CLASSACD);
    const selectedMiddle = data.find((item) => item.CLASSBCD === formData.CLASSBCD);
    const selectedMinor = data.find((item) => item.CLASSCCD === formData.CLASSCCD);

    const startMin = parseInt(formData.STARTTIME.split(':')[0]) * 60 + parseInt(formData.STARTTIME.split(':')[1]);
    const endMin = parseInt(formData.ENDTIME.split(':')[0]) * 60 + parseInt(formData.ENDTIME.split(':')[1]);
    const workHours = (endMin - startMin) / 60;

    const newItem = {
      CLASSACD: formData.CLASSACD,
      CLASSBCD: formData.CLASSBCD,
      CLASSCCD: formData.CLASSCCD,
      CLASSANM: selectedMajor ? selectedMajor.CLASSANM : '',
      CLASSBNM: selectedMiddle ? selectedMiddle.CLASSBNM : '',
      CLASSCNM: selectedMinor ? selectedMinor.CLASSCNM : '',
      NAME: '긴급민원',
      WORKTYPE: formData.WORKTYPE,
      WORKDATE: formData.WORKDATE,
      STARTTIME: formData.STARTTIME,
      ENDTIME: formData.ENDTIME,
      WORKHOURS: workHours,
      QUANTITY: formData.QUANTITY || 1,
      WORKDATETIME: `${formData.WORKDATE} ${formData.STARTTIME} ~ ${formData.ENDTIME}`,
    };

    setRegisteredList((prev) => [...prev, newItem]);
  };

  const handleDelete = (index) => {
    setRegisteredList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClassSelect = ({ major, middle, minor }) => {
    setClass2Options(getFieldOptions('CLASSBCD', major, data));
    setClass3Options(getFieldOptions('CLASSCCD', middle, data));

    setFormData((prev) => ({
      ...prev,
      CLASSACD: major,
      CLASSBCD: middle,
      CLASSCCD: minor,
    }));

    setShowClassPopup(false);
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>개별업무 등록</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.noteSection}>
          <span>* 익월 10일 지나면 전월자료 수정 불가 합니다.</span>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleRegister}>등록</button>
        </div>
        <table className={styles.formTable}>
          <tbody>
            <tr>
              <td className={styles.td1}>대분류:<button onClick={() => setShowClassPopup(true)} onSelect={handleClassSelect} className={styles.selectBtn}>선택</button></td>
              <td className={styles.td2}>
                <select name="CLASSACD" value={formData.CLASSACD} onChange={handleChange} className={styles.select}>
                  <option value="all">==대분류==</option>
                  {getFieldOptions('CLASSACD', '', data).slice(1).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </td>
              <td className={styles.td3}>중분류:</td>
              <td>
                <select name="CLASSBCD" value={formData.CLASSBCD} onChange={handleChange} className={styles.select}>
                  <option value="all">==중분류==</option>
                  {class2Options.slice(1).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
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
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </td>
              <td>건(구간/본/개소):</td>
              <td>
                <input type="number" name="QUANTITY" value={formData.QUANTITY} onChange={handleChange} placeholder="건수 입력" min="0" className={styles.input} />
              </td>
            </tr>
            <tr>
              <td>업무 부가 설명:</td>
              <td colSpan="3">
                <span>긴급민원</span>
              </td>
            </tr>
            <tr>
              <td>작업일시 (주간:<input type="checkbox" name="isWeekly" checked={formData.isWeekly} onChange={handleChange} /> )</td>
              <td>
                <input type="date" name="WORKDATE" value={formData.WORKDATE} onChange={handleChange} className={styles.dateInput} />
                <select name="STARTTIME" value={formData.STARTTIME} onChange={handleChange} className={styles.timeSelect}>
                  {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
                ~
                <select name="ENDTIME" value={formData.ENDTIME} onChange={handleChange} className={styles.timeSelect}>
                  {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </td>
              <td>근무형태:</td>
              <td>
                <select name="WORKTYPE" value={formData.WORKTYPE} onChange={handleChange} className={styles.select}>
                  <option value="">선택</option>
                  {workTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td colSpan="4">
                <h5>※ 등록 리스트 ({formData.WORKDATE})</h5>
                <table className={styles.listTable}>
                  <thead>
                    <tr>
                      <th>소분류</th>
                      <th>날짜</th>
                      <th>시간</th>
                      <th>건(구간/본/개소)</th>
                      <th>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredList.map((item, index) => (
                      <tr key={index}>
                        <td>{item.CLASSCNM}</td>
                        <td>{item.WORKDATE}</td>
                        <td>{item.STARTTIME}~{item.ENDTIME}</td>
                        <td>{item.QUANTITY}</td>
                        <td><button onClick={() => handleDelete(index)} className={styles.deleteBtn}>삭제</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal.Body>
      <StandardClassSelectPopup show={showClassPopup} onHide={() => setShowClassPopup(false)} onSelect={handleClassSelect} data={data} />
    </Modal>
  );
};

export default StandardEmpJobRegPopup;