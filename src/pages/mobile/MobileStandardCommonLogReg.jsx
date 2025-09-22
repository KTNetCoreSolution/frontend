import React, { useState, useEffect, useMemo } from "react";
import useStore from "../../store/store";
import { fetchData } from "../../utils/dataUtils";
import { msgPopup } from "../../utils/msgPopup.js";
import { errorMsgPopup } from "../../utils/errorMsgPopup.js";
import common from "../../utils/common";
import styles from "./MobileStandardCommonLogReg.module.css";

const MobileStandardCommonLogReg = ({ workDate, classGubun, classData, workTypeOptions, onHide, onSubmit }) => {
  const { user } = useStore();
  const today = common.getTodayDate();
  const initialWorkDate = workDate || today;
  const initialClassGubun = classGubun || "LINE";
  const initialItem = null; // 수정용 데이터 (필요 시 props로 받음)

  const [formData, setFormData] = useState({
    CLASSACD: initialItem?.CLASSACD || "all",
    CLASSBCD: initialItem?.CLASSBCD || "all",
    CLASSCCD: initialItem?.CLASSCCD || "all",
    NAME: initialItem?.NAME || "",
    WORKTYPE: String(initialItem?.WORKTYPE) || "",
    WORKDATE: initialItem?.WORKDATE || initialWorkDate,
    STARTTIME: initialItem?.STARTTIME || "09:00",
    ENDTIME: initialItem?.ENDTIME || "18:00",
    QUANTITY: initialItem?.QUANTITY || "1",
    isWeekly: initialItem?.isWeekly || false,
    isDuplicate: initialItem?.isDuplicate || false,
  });
  const [class1Options, setClass1Options] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);

  // classData로부터 옵션 초기화
  useEffect(() => {
    setClass1Options(getFieldOptions("CLASSACD", "", classData));
    setClass2Options(getFieldOptions("CLASSBCD", formData.CLASSACD, classData));
    setClass3Options(getFieldOptions("CLASSCCD", formData.CLASSBCD, classData));
  }, [classData, formData.CLASSACD, formData.CLASSBCD]);

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
      options.push("23:59");
    }
    if (isEnd && startTime) {
      const startMin = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]);
      return options.filter((time) => {
        const [h, m] = time.split(":").map(Number);
        const timeMin = (h === 24 ? 24 : h) * 60 + m;
        return timeMin > startMin;
      });
    }
    return options;
  };

  const formTimeOptions = useMemo(() => generateTimeOptions(formData.isWeekly), [formData.isWeekly]);
  const formEndTimeOptions = useMemo(
    () => generateTimeOptions(formData.isWeekly, formData.STARTTIME, true),
    [formData.isWeekly, formData.STARTTIME]
  );

  const getFieldOptions = (fieldId, dependentValue = "", classData) => {
    if (!Array.isArray(classData)) return [];
    const uniqueMap = new Map();

    if (fieldId === "CLASSACD") {
      classData.forEach((item) => {
        if (item.CLASSACD && item.CLASSANM && !uniqueMap.has(item.CLASSACD)) {
          uniqueMap.set(item.CLASSACD, { value: item.CLASSACD, label: item.CLASSANM });
        }
      });
      return [{ value: "all", label: "==대분류==" }, ...Array.from(uniqueMap.values())];
    }

    if (fieldId === "CLASSBCD") {
      if (!dependentValue || dependentValue === "all") {
        return [{ value: "all", label: "==중분류==" }];
      }
      classData
        .filter((item) => item.CLASSACD === dependentValue)
        .forEach((item) => {
          if (item.CLASSBCD && item.CLASSBNM && !uniqueMap.has(item.CLASSBCD)) {
            uniqueMap.set(item.CLASSBCD, { value: item.CLASSBCD, label: item.CLASSBNM });
          }
        });
      return [{ value: "all", label: "==중분류==" }, ...Array.from(uniqueMap.values())];
    }

    if (fieldId === "CLASSCCD") {
      if (!dependentValue || dependentValue === "all") {
        return [{ value: "all", label: "==소분류==" }];
      }
      classData
        .filter((item) => item.CLASSBCD === dependentValue)
        .forEach((item) => {
          if (item.CLASSCCD && item.CLASSCNM && !uniqueMap.has(item.CLASSCCD)) {
            uniqueMap.set(item.CLASSCCD, { value: item.CLASSCCD, label: item.CLASSCNM });
          }
        });
      return [{ value: "all", label: "==소분류==" }, ...Array.from(uniqueMap.values())];
    }

    return [];
  };

  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return (h === 24 ? 24 : h) * 60 + m;
  };

  const isInvalidTimeRange = (start, end) => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    const lunchStart = timeToMinutes(classData[0]?.BSTARTDT || '12:00');
    const lunchEnd = timeToMinutes(classData[0]?.BENDDT || '13:00');
    return startMin < lunchEnd && endMin > lunchStart;
  };

  const checkTimeOverlap = (newStart, newEnd) => {
    // 부모 컴포넌트에서 registeredList를 props로 받지 않으므로, API 호출로 중복 확인 필요 시 수정
    // 현재는 단순히 true/false 반환 (필요 시 부모로부터 registeredList props 추가)
    return false;
  };

  const handleSubmit = async () => {

    try {
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
        msgPopup(`${classData[0]?.BSTARTDT || '12:00'} ~ ${classData[0]?.BENDDT || '13:00'} 입력 불가 시간입니다.`);
        return;
      }

      if (checkTimeOverlap(formData.STARTTIME, formData.ENDTIME)) {
        msgPopup('오류!\n이미 입력한 업무시간입니다.!!');
        return;
      }

      const params = {
        pGUBUN: initialItem ? "U" : "I",
        pDATE1: formData.WORKDATE,
        pDATE2: formData.WORKDATE,
        pORGIN_STARTTM: formData.STARTTIME,
        pSTARTTM: formData.STARTTIME,
        pENDTM: formData.ENDTIME,
        pCLASSCD: formData.CLASSCCD,
        pWORKCD: formData.WORKTYPE,
        pWORKCNT: formData.isDuplicate ? "0" : formData.QUANTITY,
        pSECTIONCD: initialClassGubun,
        pEMPNO: user?.empNo || ''
      };

      const response = await fetchData('standard/empJob/common/reg/save', params);
      if (!response.success) {
        msgPopup(response.message || '등록 중 오류가 발생했습니다.');
        return;
      } else {
        if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
          let errMsg = response.errMsg;
          if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          msgPopup(errMsg);
          return;
        }
      }

      onSubmit();
      msgPopup('등록 완료');
    } catch (err) {
      console.error('등록 실패:', err);
      errorMsgPopup(err.response?.data?.message || '등록 중 오류가 발생했습니다.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "CLASSACD") {
        newData.CLASSBCD = "all";
        newData.CLASSCCD = "all";
        setClass2Options(getFieldOptions("CLASSBCD", value, classData));
        setClass3Options(getFieldOptions("CLASSCCD", "all", classData));
      }

      if (name === "CLASSBCD") {
        newData.CLASSCCD = "all";
        setClass3Options(getFieldOptions("CLASSCCD", value, classData));
      }

      if (name === "isDuplicate" && checked) {
        newData.QUANTITY = "0";
      }

      if (name === "STARTTIME") {
        const startMin = timeToMinutes(value);
        const nextTime = startMin + 30;
        const hours = Math.floor(nextTime / 60);
        const minutes = nextTime % 60;
        const newEndTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const validEndTime = formEndTimeOptions.find((time) => timeToMinutes(time) >= timeToMinutes(newEndTime)) || formEndTimeOptions[0] || prev.ENDTIME;
        newData.ENDTIME = validEndTime;
      }

      return newData;
    });
  };

  const handleReturnPage = () => {
    onHide();
  };

  return (
    <div className="container-fluid p-0">
      <header className="header">
        <h1 className="h5 mb-0">표준활동 등록</h1>
      </header>
      <div className={`pageMain ${styles.pageMain}`}>
        <div className={styles.formInputGroup}>
          <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={handleReturnPage}>
            {initialItem ? '돌아가기' : '닫기'}
          </button>
        </div>
        <div className={styles.formDivBox}>
          <div className="d-flex flex-column gap-2">
            <div className={styles.formInputGroup}>
              <label>분야:</label>
              <span className={styles.formText}>
                {initialClassGubun === "LINE" ? "선로" : initialClassGubun === "DESIGN" ? "설계" : "BIZ"}
              </span>
            </div>
            <div className={styles.formInputGroup}>
              <label>대분류:</label>
              <select name="CLASSACD" value={formData.CLASSACD} onChange={handleChange} className={styles.listSelect}>
                {class1Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label>중분류:</label>
              <select name="CLASSBCD" value={formData.CLASSBCD} onChange={handleChange} className={styles.listSelect}>
                {class2Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label>소분류:</label>
              <select name="CLASSCCD" value={formData.CLASSCCD} onChange={handleChange} className={styles.listSelect}>
                {class3Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label>
                업무 부가 설명: <br/>
                <span className={styles.formText}>
                  {formData.CLASSCCD !== "all" ? classData.find((item) => item.CLASSCCD === formData.CLASSCCD)?.DETAIL || "" : ""}
                </span>
              </label>
            </div>
            <div className={styles.formInputGroup}>
              <label>건(구간/본/개소):</label>
              <input
                type="number"
                name="QUANTITY"
                value={formData.QUANTITY}
                onChange={handleChange}
                placeholder="건수 입력"
                min="0"
                className={styles.quantityInput}
              />
              <label>
                중복건: <input type="checkbox" name="isDuplicate" checked={formData.isDuplicate} onChange={handleChange} />
              </label>
            </div>
            <div className={styles.formInputGroup}>
              <label>근무형태:</label>
              <select name="WORKTYPE" value={formData.WORKTYPE} onChange={handleChange} className={styles.listSelect}>
                <option value="">선택</option>
                {workTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label>
                작업일시(주간: <input type="checkbox" name="isWeekly" checked={formData.isWeekly} onChange={handleChange} />)
              </label>
            </div>
            <div className={styles.formInputGroup}>
              <input type="date" name="WORKDATE" value={formData.WORKDATE} onChange={handleChange} className={styles.formDate} />
              <select name="STARTTIME" value={formData.STARTTIME} onChange={handleChange} className={styles.formTime}>
                {formTimeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              ~
              <select name="ENDTIME" value={formData.ENDTIME} onChange={handleChange} className={styles.formTime}>
                {formEndTimeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <h3 />
          </div>
          <div className={styles.formInputGroup}>
            <button className={`btn ${styles.btnCheck} ${styles.btn}`} onClick={handleSubmit}>
              {initialItem ? "수정" : "등록"}
            </button>
          </div>
        </div>
        <div className={styles.formInputGroup}>
          <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={handleReturnPage}>
            {initialItem ? '돌아가기' : '닫기'}
          </button>
        </div>
        <h3/>
      </div>
    </div>
  );
};

export default MobileStandardCommonLogReg;