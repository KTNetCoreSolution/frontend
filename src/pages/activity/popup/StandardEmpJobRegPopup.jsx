import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-bootstrap/Modal';
import styles from './StandardEmpJobRegPopup.module.css';
import StandardClassSelectPopup from './StandardClassSelectPopup';
import { fetchData } from '../../../utils/dataUtils';
import { msgPopup } from '../../../utils/msgPopup';

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
    QUANTITY: '1',
    isWeekly: false,
    isDuplicate: false,
  });
  const [registeredList, setRegisteredList] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);
  const [classPopupState, setClassPopupState] = useState({ show: false, editingIndex: -1 });
  const [workTypeOptions, setWorkTypeOptions] = useState([]); // 추가: WORKTYPE 옵션 상태

  const generateTimeOptions = (isWeekly = false, startTime = null, isEnd = false) => {
    const options = [];
    const startHour = isWeekly ? 9 : 0;
    const endHour = isWeekly ? 18 : 23;
    for (let h = startHour; h <= endHour; h++) {
      options.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < endHour || (h === endHour && !isWeekly)) {
        options.push(`${h.toString().padStart(2, '0')}:30`);
      }
    }
    options.push('24:00');
    if (isEnd && startTime) {
      const startMin = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      return options.filter(time => {
        const [h, m] = time.split(':').map(Number);
        const timeMin = (h === 24 ? 24 : h) * 60 + m;
        return timeMin > startMin;
      });
    }
    return options;
  };

  const formTimeOptions = useMemo(() => generateTimeOptions(formData.isWeekly), [formData.isWeekly]);
  const formEndTimeOptions = useMemo(() => generateTimeOptions(formData.isWeekly, formData.STARTTIME, true), [formData.isWeekly, formData.STARTTIME]);

  const listTimeOptions = generateTimeOptions(false); // 리스트는 항상 전체 시간대

  
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
          msgPopup(response.message || 'WORKTYPE 옵션을 가져오는 중 오류가 발생했습니다.');
          return;
        }
        const fetchedOptions = Array.isArray(response.data) ? response.data : [];
        // API 응답을 {value: DDLCD, label: DDLNM} 형식으로 매핑
        setWorkTypeOptions(fetchedOptions.map(item => ({ value: item.DDLCD, label: item.DDLNM })));
      } catch (err) {
        console.error('WORKTYPE 옵션 로드 실패:', err);
        msgPopup(err.response?.data?.message || 'WORKTYPE 옵션을 가져오는 중 오류가 발생했습니다.');
      }
    };

    fetchWorkTypeOptions();
  }, []); // 컴포넌트 마운트 시 한 번 호출

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
        // 종료시간이 시작시간 이후인지 확인하고 조정
        const startMin = parseInt(value.split(':')[0]) * 60 + parseInt(value.split(':')[1]);
        const endMin = parseInt(prev.ENDTIME.split(':')[0]) * 60 + parseInt(prev.ENDTIME.split(':')[1]);
        if (endMin <= startMin) {
          newData.ENDTIME = formEndTimeOptions[0] || prev.ENDTIME;
        }
      } else if (name === 'isDuplicate') {
        newData.isDuplicate = checked;
        if (checked) {
          newData.QUANTITY = '0';
        }
        else{
          newData.QUANTITY = '1';
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
    const lunchStart = 12 * 60;
    const lunchEnd = 13 * 60;
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

  const handleRegister = () => {
    if (formData.CLASSCCD === 'all' || formData.WORKTYPE === '' || (!formData.isDuplicate && !formData.QUANTITY)) {
      msgPopup('소분류, 건수, 근무형태를 확인해주세요.');
      return;
    }

    if (isInvalidTimeRange(formData.STARTTIME, formData.ENDTIME)) {
      msgPopup('12:00 ~ 13:00 입력 불가 시간입니다.');
      return;
    }

    if (checkTimeOverlap(formData.STARTTIME, formData.ENDTIME)) {
      msgPopup('오류!\n이미 입력한 업무시간입니다.!!');
      return;
    }

    const selectedMajor = data.find((item) => item.CLASSACD === formData.CLASSACD);
    const selectedMiddle = data.find((item) => item.CLASSBCD === formData.CLASSBCD);
    const selectedMinor = data.find((item) => item.CLASSCCD === formData.CLASSCCD);

    const workHours = calculateWorkHours(formData.STARTTIME, formData.ENDTIME);

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
      QUANTITY: formData.isDuplicate ? 0 : (formData.QUANTITY || 1),
      WORKDATETIME: `${formData.WORKDATE} ${formData.STARTTIME} ~ ${formData.ENDTIME}`,
      isDuplicate: formData.isDuplicate,
    };

    setRegisteredList((prev) => [...prev, newItem]);
  };

  const handleDelete = (index) => {
    setRegisteredList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = (index) => {
    const item = registeredList[index];
    if (isInvalidTimeRange(item.STARTTIME, item.ENDTIME)) {
      msgPopup('입력 불가 시간입니다.');
      return;
    }
    if (checkTimeOverlap(item.STARTTIME, item.ENDTIME, index)) {
      msgPopup('오류!\n이미 입력한 업무시간입니다.!!');
      return;
    }
    // 추가적인 업데이트 로직이 필요 없음 (이미 onChange로 업데이트됨), 하지만 overlap 체크 후 알림
    msgPopup('수정 완료!');
  };

  const handleRowChange = (index, field, value) => {
    setRegisteredList((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
              ...(field === 'STARTTIME' || field === 'ENDTIME'
                ? { WORKHOURS: calculateWorkHours(field === 'STARTTIME' ? value : item.STARTTIME, field === 'ENDTIME' ? value : item.ENDTIME) }
                : {}),
              ...(field === 'isDuplicate' 
                ? { QUANTITY: value ? 0 : 1 }
                : {}),
            }
          : item
      )
    );
  };

  const handleClassSelect = ({ major, middle, minor }) => {
    const editingIndex = classPopupState.editingIndex;
    if (editingIndex === -1) {
      // 새 등록용 formData 업데이트
      setClass2Options(getFieldOptions('CLASSBCD', major, data));
      setClass3Options(getFieldOptions('CLASSCCD', middle, data));

      setFormData((prev) => ({
        ...prev,
        CLASSACD: major,
        CLASSBCD: middle,
        CLASSCCD: minor,
      }));
    } else {
      // 리스트 row 업데이트
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
      <Modal.Body>
        <div className={styles.noteSection}>
          <span>* 익월 10일 지나면 전월자료 수정 불가 합니다.</span>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleRegister}>등록</button>
        </div>
        <table className={styles.formTable}>
          <tbody>
            <tr>
              <td className={styles.td1}>대분류:<button onClick={() => setClassPopupState({ show: true, editingIndex: -1 })} className={styles.selectBtn}>선택</button></td>
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
                {formData.isDuplicate ? (
                  <span>건(구간/본/개소)의 값이 0 으로 설정 됩니다.</span>
                ) : (
                  <input type="number" name="QUANTITY" value={formData.QUANTITY} onChange={handleChange} placeholder="건수 입력" min="0" className={styles.input} />
                )}
                <input type="checkbox" name="isDuplicate" checked={formData.isDuplicate} onChange={handleChange} />
                <span className={styles.duplicateSpan}>중복건</span>
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
                  {formTimeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
                ~
                <select name="ENDTIME" value={formData.ENDTIME} onChange={handleChange} className={styles.timeSelect}>
                  {formEndTimeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
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
                      <th>날짜</th>
                      <th style={{width: '194px'}}>시간</th>
                      <th style={{width: '200px'}}>소분류</th>
                      <th>건(구간/본/개소)</th>
                      <th style={{width: '110px'}}>근무형태</th>
                      <th style={{width: '110px'}}>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredList.map((item, index) => (
                      <tr key={index}>
                        <td>{item.WORKDATE}</td>
                        <td>
                          <select
                            value={item.STARTTIME}
                            onChange={(e) => handleRowChange(index, 'STARTTIME', e.target.value)}
                            className={styles.timeSelect}
                          >
                            {listTimeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                          </select>
                          ~
                          <select
                            value={item.ENDTIME}
                            onChange={(e) => handleRowChange(index, 'ENDTIME', e.target.value)}
                            className={styles.timeSelect}
                          >
                            {listTimeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                          </select>
                        </td>
                        <td>
                          {item.CLASSCNM}
                          <button
                            onClick={() => setClassPopupState({ show: true, editingIndex: index })}
                            className={styles.selectBtn}
                          >
                            선택
                          </button>
                        </td>
                        <td>
                          {item.isDuplicate ? (
                            <span>건(구간/본/개소)의 값이 0 으로 설정 됩니다.</span>
                          ) : (
                            <input
                              type="number"
                              value={item.QUANTITY}
                              onChange={(e) => handleRowChange(index, 'QUANTITY', e.target.value)}
                              min="0"
                              className={styles.rowInput}
                            />
                          )}
                          <input
                            type="checkbox"
                            checked={item.isDuplicate}
                            onChange={(e) => handleRowChange(index, 'isDuplicate', e.target.checked)}
                          />
                          <span className={styles.duplicateSpan}>중복건</span>
                        </td>
                        <td>
                          <select
                            value={item.WORKTYPE}
                            onChange={(e) => handleRowChange(index, 'WORKTYPE', e.target.value)}
                            className={styles.select}
                          >
                            <option value="">선택</option>
                            {workTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button onClick={() => handleUpdate(index)} className={styles.updateBtn}>수정</button>
                          <button onClick={() => handleDelete(index)} className={styles.deleteBtn}>삭제</button>
                        </td>
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