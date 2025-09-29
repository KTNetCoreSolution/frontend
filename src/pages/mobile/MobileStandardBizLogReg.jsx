import React, { useState, useEffect, useMemo } from "react";
import useStore from "../../store/store";
import { fetchData } from "../../utils/dataUtils";
import { msgPopup } from "../../utils/msgPopup.js";
import { errorMsgPopup } from "../../utils/errorMsgPopup.js";
import common from "../../utils/common";
import styles from "./MobileStandardBizLogReg.module.css";

const MobileStandardBizLogReg = ({ workDate, classGubun, classData, bizWorkTypes, onHide, onSubmit, formData, setFormData }) => {
  const { user } = useStore();
  const today = common.getTodayDate();
  const initialWorkDate = workDate || today;
  const initialClassGubun = classGubun || "BIZ";

  const [class1Options, setClass1Options] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);
  const [dispatchOptions, setDispatchOptions] = useState([]);
  const [workersOptions, setWorkersOptions] = useState([]);
  const [workTimeOptions, setWorkTimeOptions] = useState([]);

  // 옵션 로딩 (standard/ddlList로 DISPATCH, WORKERS, WORKTIME만 호출)
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

  // classData로부터 옵션 초기화
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

  // 프로세스 옵션 (bizWorkTypes 필터링)
  const filteredBizWorkTypes = useMemo(() => {
    if (formData.CLASSCCD === "all" || !formData.CLASSCCD) {
      return [];
    }
    const selectedItem = classData.find((item) => item.CLASSCCD === formData.CLASSCCD);
    const bizMCode = selectedItem?.BIZMCODE || null;
    if (!bizMCode) {
      return [];
    }

    const filtered = bizWorkTypes
      .filter((item) => item.BIZMCODE === bizMCode)
      .map((item, index) => {
        if (!item.value || !item.label) {
          console.warn('Invalid WORKCD or WORKNM in bizWorkTypes:', item);
          return null;
        }
        return {
          value: item.value,
          label: item.label,
          BIZMCODE: item.BIZMCODE,
          ODR: item.ODR || 0,
          index // 고유 키를 위해 인덱스 추가
        };
      })
      .filter((item) => item !== null) // 유효하지 않은 항목 제거
      .sort((a, b) => a.ODR - b.ODR);

    return filtered;
  }, [formData.CLASSCCD, bizWorkTypes, classData]);

  // filteredBizWorkTypes를 10개씩 chunk로 나누기
  const processChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < filteredBizWorkTypes.length; i += 10) {
      chunks.push(filteredBizWorkTypes.slice(i, i + 10));
    }

    return chunks;
  }, [filteredBizWorkTypes]);

  // 구분 옵션 생성: "1~10", "11~20" 등
  const sectionOptions = useMemo(() => {
    const options = processChunks.map((chunk, index) => {
      const start = index * 10 + 1;
      const end = start + chunk.length - 1;
      return { value: `${index}`, label: `${start}~${end}` };
    });

    return options;
  }, [processChunks]);

  // 선택된 구분에 따른 프로세스 옵션
  const filteredProcesses = useMemo(() => {
    if (!formData.PROCESSSECTION) {
      return [];
    }
    const selectedIndex = parseInt(formData.PROCESSSECTION);
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= processChunks.length) {
      return [];
    }
    const processes = processChunks[selectedIndex] || [];
    return processes;
  }, [formData.PROCESSSECTION, processChunks]);

  const handleSubmit = async () => {
    // 회선번호+고객명 검증 (최대 200자)
    const customerValidation = common.validateVarcharLength(formData.CUSTOMER, 200, "회선번호+고객명");
    if (!customerValidation.valid) {
      errorMsgPopup(customerValidation.error);
      return;
    }

    // 회선수 검증 (최대 10자)
    const linesValidation = common.validateVarcharLength(String(formData.LINES), 10, "회선수");
    if (!linesValidation.valid) {
      errorMsgPopup(linesValidation.error);
      return;
    }

    // 프로세스 처리시간 검증 (최대 8자)
    const processTimeValidation = common.validateVarcharLength(String(formData.PROCESSTIME), 8, "처리시간(분)");
    if (!processTimeValidation.valid) {
      errorMsgPopup(processTimeValidation.error);
      return;
    }

    // 필수 입력값 검증
    if (
      formData.CLASSCCD === "all" ||
      formData.DISPATCH === "" ||
      formData.WORKERS === "" ||
      formData.WORKTIME === "" ||
      formData.PROCESS === "" ||
      formData.LINES <= 0
    ) {
      msgPopup("소분류, 출동여부, 작업인원, 근무시간, 회선수, 프로세스를 확인해주세요.");
      return;
    }

    try {
      const params = {
        pGUBUN: 'I',
        pDATE1: formData.WORKDATE,
        pDATE2: formData.WORKDATE,
        pCLASSCD: formData.CLASSCCD,
        pBIZTXT: formData.CUSTOMER,
        pBIZRUN: formData.DISPATCH,
        pBIZMAN: formData.WORKERS,
        pWORKCD: formData.WORKTIME,
        pWORKCNT: formData.LINES,
        pWORKGBCD: formData.PROCESS,
        pWORKGBTM: formData.PROCESSTIME,
        pSECTIONCD: initialClassGubun,
        pORIGINBIZINPUTKEY: '',
        pEMPNO: user?.empNo || '',
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
      const newData = { ...prev, [name]: name === "PROCESSTIME" ? (value === '' ? 0 : parseInt(value) || 0) : value };
      if (name === "CLASSACD") {
        newData.CLASSBCD = "all";
        newData.CLASSCCD = "all";
        newData.PROCESSSECTION = "";
        newData.PROCESS = "";
        //setClass2Options(getFieldOptions("CLASSBCD", value, classData));
        //setClass3Options(getFieldOptions("CLASSCCD", "all", classData));
      }
      if (name === "CLASSBCD") {
        newData.CLASSCCD = "all";
        newData.PROCESSSECTION = "";
        newData.PROCESS = "";
        //setClass3Options(getFieldOptions("CLASSCCD", value, classData));
      }
      if (name === "CLASSCCD") {
        newData.PROCESSSECTION = "";
        newData.PROCESS = "";
      }
      if (name === "PROCESSSECTION") {
        newData.PROCESS = "";
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
         <button className="btn text-white" onClick={handleReturnPage}>
          <i className="bi bi-x"></i>
        </button>
      </header>
      <div className="pageMain">
        {/* <div className={styles.formInputGroup}>
          <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{ width: '80px' }} onClick={handleReturnPage}>
            닫기
          </button>
        </div> */}
        <div className="formDivBox">
          <ul className="formDataWrap">
            <li>
              <span className="formLabel" style={{width: '120px'}}>분야</span>
              <div className="formData">BIZ</div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>작업일</span>
              <div className="formData">
                <input type="date" name="WORKDATE" value={formData.WORKDATE} onChange={handleChange} className={styles.formDate} />
              </div>
            </li>            
            <li>
              <span className="formLabel" style={{width: '120px'}}>회선번호+고객명</span>
              <div className="formData">
                <input
                  type="text"
                  name="CUSTOMER"
                  value={formData.CUSTOMER}
                  onChange={handleChange}
                  className={styles.formInput}
                />
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>출동여부</span>
              <div className="formData">
                <select name="DISPATCH" value={formData.DISPATCH} onChange={handleChange}>
                  <option value="">선택</option>
                  {dispatchOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>작업인원</span>
              <div className="formData">
                <select name="WORKERS" value={formData.WORKERS} onChange={handleChange}>
                  <option value="">선택</option>
                  {workersOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>근무시간</span>
              <div className="formData">
                <select name="WORKTIME" value={formData.WORKTIME} onChange={handleChange}>
                  <option value="">선택</option>
                  {workTimeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>회선수</span>
              <div className="formData">
                <input
                  type="number"
                  name="LINES"
                  value={formData.LINES}
                  onChange={handleChange}
                  min="1"
                  className="text-end"
                  style={{width: '80px'}}
                />
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>대분류</span>
              <div className="formData">
                <select name="CLASSACD" value={formData.CLASSACD} onChange={handleChange}>
                  {class1Options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>중분류</span>
              <div className="formData">
                <select name="CLASSBCD" value={formData.CLASSBCD} onChange={handleChange}>
                  {class2Options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>소분류</span>
              <div className="formData">
                <select name="CLASSCCD" value={formData.CLASSCCD} onChange={handleChange}>
                  {class3Options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>구분</span>
              <div className="formData">
                <select name="PROCESSSECTION" value={formData.PROCESSSECTION} onChange={handleChange}>
                  <option value="">선택</option>
                  {sectionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>프로세스</span>
              <div className="formDataRow">
                <select name="PROCESS" value={formData.PROCESS} onChange={handleChange}>
                  <option value="">선택</option>
                  {filteredProcesses.length > 0 ? (
                    filteredProcesses.map((item, index) => (
                      <option key={`${item.value}-${index}`} value={item.value}>
                        {item.label}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      프로세스 데이터 없음
                    </option>
                  )}
                </select>
              </div>

            </li>
            <li>
              <span className="formLabel" style={{width: '120px'}}>처리시간(분)</span>
              <div className="formData">
                <input
                  type="number"
                  name="PROCESSTIME"
                  value={formData.PROCESSTIME}
                  onChange={handleChange}
                  min="0"
                  className="text-end"
                  style={{width: '80px'}}
                />
              </div>
            </li>
          </ul>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit}>
          등록
        </button>
        {/* <div className={styles.formInputGroup}>
          <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{ width: '80px' }} onClick={handleReturnPage}>
            닫기
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default MobileStandardBizLogReg;