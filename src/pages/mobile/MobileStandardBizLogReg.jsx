import React, { useState, useEffect, useMemo } from "react";
import useStore from "../../store/store";
import { fetchData } from "../../utils/dataUtils";
import { msgPopup } from "../../utils/msgPopup.js";
import { errorMsgPopup } from "../../utils/errorMsgPopup.js";
import common from "../../utils/common";
import styles from "./MobileStandardBizLogReg.module.css"; // 기존 CSS 재사용 (필요 시 별도 CSS 생성)

const MobileStandardBizLogReg = ({ workDate, classGubun, classData, bizWorkTypes, onHide, onSubmit }) => {
  const { user } = useStore();
  const today = common.getTodayDate();
  const initialWorkDate = workDate || today;
  const initialClassGubun = classGubun || "BIZ";

  const [formData, setFormData] = useState({
    CLASSACD: "all",
    CLASSBCD: "all",
    CLASSCCD: "all",
    CUSTOMER: "",
    DISPATCH: "",
    WORKERS: "",
    WORKTIME: "",
    LINES: 1,
    PROCESS: "",
    PROCESSTIME: 0,
    WORKDATE: initialWorkDate,
  });
  const [class1Options, setClass1Options] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);
  const [dispatchOptions, setDispatchOptions] = useState([]);
  const [workersOptions, setWorkersOptions] = useState([]);
  const [workTimeOptions, setWorkTimeOptions] = useState([]);

  // 옵션 로딩 (StandardBizEmpJobRegPopup 참조)
  useEffect(() => {
    const fetchDropdownOptions = async (pGUBUN, setOptions) => {
      try {
        const params = {
          pGUBUN,
          pDEBUG: 'F',
        };
        const response = await fetchData('standard/ddlList', params);
        if (!response.success) {
          msgPopup(response.message || `${pGUBUN} 옵션을 가져오는 중 오류가 발생했습니다.`);
          return;
        }
        const fetchedOptions = Array.isArray(response.data) ? response.data : [];
        setOptions(fetchedOptions.map((item) => ({ value: item.DDLCD, label: item.DDLNM })));
      } catch (err) {
        console.error(`${pGUBUN} 옵션 로드 실패:`, err);
        msgPopup(err.response?.data?.message || `${pGUBUN} 옵션을 가져오는 중 오류가 발생했습니다.`);
      }
    };

    fetchDropdownOptions('DISPATCH', setDispatchOptions);
    fetchDropdownOptions('WORKERS', setWorkersOptions);
    fetchDropdownOptions('WORKTIME', setWorkTimeOptions);
  }, []);

  // classData로부터 옵션 초기화 (기존과 동일)
  useEffect(() => {
    setClass1Options(getFieldOptions("CLASSACD", "", classData));
    setClass2Options(getFieldOptions("CLASSBCD", formData.CLASSACD, classData));
    setClass3Options(getFieldOptions("CLASSCCD", formData.CLASSBCD, classData));
  }, [classData, formData.CLASSACD, formData.CLASSBCD]);

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

  // 프로세스 옵션 (bizWorkTypes 필터링, StandardBizEmpJobRegPopup 참조)
  const filteredBizWorkTypes = useMemo(() => {
    if (formData.CLASSCCD === "all") return [];
    const selectedItem = classData.find((item) => item.CLASSCCD === formData.CLASSCCD);
    const bizMCode = selectedItem?.BIZMCODE || null;
    return bizWorkTypes
      .filter((item) => item.BIZMCODE === bizMCode)
      .sort((a, b) => a.ODR - b.ODR);
  }, [formData.CLASSCCD, bizWorkTypes, classData]);

  const handleSubmit = async () => {
    // 유효성 검사 (StandardBizEmpJobRegPopup 참조)
    if (formData.CLASSCCD === 'all' || !formData.WORKTIME || !formData.LINES) {
      msgPopup('소분류, 근무시간, 회선수를 확인해주세요.');
      return;
    }

    try {
      const params = {
        pGUBUN: "I", // 삽입
        pDATE1: formData.WORKDATE,
        pDATE2: formData.WORKDATE,
        pCLASSCD: formData.CLASSCCD,
        pBIZTXT: formData.CUSTOMER,
        pBIZRUN: formData.DISPATCH,
        pBIZMAN: formData.WORKERS,
        pWORKCD: formData.WORKTIME,
        pWORKCNT: formData.LINES,
        pBIZWORKGB: formData.PROCESS,
        pWORKM: formData.PROCESSTIME,
        pSECTIONCD: initialClassGubun,
        pEMPNO: user?.empNo || ''
      };

      const response = await fetchData('standard/empJob/biz/reg/save', params);
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
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
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
      return newData;
    });
  };

  const handleReturnPage = () => {
    onHide();
  };

  return (
    <div className="container-fluid p-0">
      <header className="header">
        <h1 className="h5 mb-0">BIZ 활동 등록</h1>
      </header>
      <div className={`pageMain ${styles.pageMain}`}>
        <div className={styles.formInputGroup}>
          <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={handleReturnPage}>
            닫기
          </button>
        </div>
        <div className={styles.formDivBox}>
          <div className="d-flex flex-column gap-2">
            <div className={styles.formInputGroup}>
              <label>분야:</label>
              <span className={styles.formText}>BIZ</span>
              <label>작업일:</label>
              <input type="date" name="WORKDATE" value={formData.WORKDATE} onChange={handleChange} className={styles.formDate} />
            </div>
            <div className={styles.formInputGroup}>
              <label>회선번호+고객명:</label>
              <br/>
              <input
                type="text"
                name="CUSTOMER"
                value={formData.CUSTOMER}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>출동여부:</label>
              <select name="DISPATCH" value={formData.DISPATCH} onChange={handleChange} className={styles.listSelect}>
                <option value="">선택</option>
                {dispatchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>작업인원:</label>
              <select name="WORKERS" value={formData.WORKERS} onChange={handleChange} className={styles.listSelect}>
                <option value="">선택</option>
                {workersOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>근무시간:</label>
              <select name="WORKTIME" value={formData.WORKTIME} onChange={handleChange} className={styles.listSelect}>
                <option value="">선택</option>
                {workTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>회선수:</label>
              <input
                type="number"
                name="LINES"
                value={formData.LINES}
                onChange={handleChange}
                min="1"
                className={styles.formInput}
              />
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>대분류:</label>
              <select name="CLASSACD" value={formData.CLASSACD} onChange={handleChange} className={styles.listSelect}>
                {class1Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>중분류:</label>
              <select name="CLASSBCD" value={formData.CLASSBCD} onChange={handleChange} className={styles.listSelect}>
                {class2Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>소분류:</label>
              <select name="CLASSCCD" value={formData.CLASSCCD} onChange={handleChange} className={styles.listSelect}>
                {class3Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>프로세스:</label>
              <select name="PROCESS" value={formData.PROCESS} onChange={handleChange} className={styles.listSelect}>
                <option value="">선택</option>
                {filteredBizWorkTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formInputGroup}>
              <label className={styles.formLabel}>처리시간(분):</label>
              <input
                type="number"
                name="PROCESSTIME"
                value={formData.PROCESSTIME}
                onChange={handleChange}
                min="0"
                className={styles.quantityInput}
              />
            </div>
          </div>
          <div className={styles.formInputGroup}>
            <button className={`btn ${styles.btnCheck} ${styles.btn}`} onClick={handleSubmit}>
              등록
            </button>
          </div>
        </div>
        <div className={styles.formInputGroup}>
          <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={handleReturnPage}>
            닫기
          </button>
        </div>
        <h3/>
      </div>
    </div>
  );
};

export default MobileStandardBizLogReg;