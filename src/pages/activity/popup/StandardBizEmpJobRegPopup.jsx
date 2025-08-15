// StandardBizEmpJobRegPopup.jsx (updated file)
import React, { useState, useEffect, useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import styles from "./StandardBizEmpJobRegPopup.module.css"; // Use new CSS file
import StandardClassSelectPopup from "./StandardClassSelectPopup";
import { fetchData } from "../../../utils/dataUtils";
import { msgPopup } from "../../../utils/msgPopup";

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

const processGroups = [
  "오더확인",
  "영업협의",
  "TM(고객)",
  "TM(접수자)",
  "고객컨설팅",
  "현장실사",
  "다이얼플랜작성",
  "광케이블확인",
  "회선시험진단",
  "동심선확인",
  "단말신청(IP폰포함)",
  "단말인수(IP폰포함)",
  "단말셋팅(IP폰포함)",
  "KT 시설점검",
  "고객 NW확인",
  "구내장비지원(허브 등)",
  "구내광 점퍼링",
  "구내배선",
  "단말개통",
  "바코드 등 DB현행화",
  "최종 품질확인",
  "준공처리",
  "고객 설명",
  "단말철거",
  "랙철거",
  "노후장애 단말교체",
  "NMS연동확인",
  "장애처리 보고서 작성",
  "타부서 수리의뢰",
  "타부서 완료확인",
  "품질측정",
  "ARS음원설정(통화연결음)",
  "녹취NAS설치",
  "Config 백업",
  "불법호 처리",
  "인증서 설치",
  "행사지원(상주)",
  "단말증설 이동지원",
  "내선/외부등록 등 변경 요청",
  "본지사 구성,인터넷 장애 등",
  "Biz트렁킹 조치",
  "SRM요청",
  "차량이동 소요시간",
];

const StandardBizEmpJobRegPopup = ({ show, onHide, data }) => {
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    CLASSACD: "all",
    CLASSBCD: "all",
    CLASSCCD: "all",
    WORKDATE: today,
    CUSTOMER: "", // 회선번호+고객명
    DISPATCH: "", // 출동여부
    WORKERS: "", // 작업인원
    WORKTIME: "", // 근무시간 (근무형태 대체)
    LINES: 1, // 회선수
  });
  const [processTimes, setProcessTimes] = useState({}); // { '오더확인': 0, '영업협의': 0, ... }
  const [registeredList, setRegisteredList] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);
  const [classPopupState, setClassPopupState] = useState({ show: false, editingIndex: -1 });

  // Flatten process items for easier management
  const allProcessItems = useMemo(() => processGroups.flat(), []);

  // Initialize processTimes
  useEffect(() => {
    const initialTimes = {};
    allProcessItems.forEach((item) => {
      initialTimes[item] = 0;
    });
    setProcessTimes(initialTimes);
  }, [allProcessItems]);

  // useMemo for options
  const updatedClass2Options = useMemo(() => getFieldOptions("CLASSBCD", formData.CLASSACD, data), [formData.CLASSACD, data]);
  const updatedClass3Options = useMemo(() => getFieldOptions("CLASSCCD", formData.CLASSBCD, data), [formData.CLASSBCD, data]);

  useEffect(() => {
    setClass2Options(updatedClass2Options);
  }, [updatedClass2Options]);

  useEffect(() => {
    setClass3Options(updatedClass3Options);
  }, [updatedClass3Options]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProcessChange = (item, value) => {
    setProcessTimes((prev) => ({ ...prev, [item]: parseInt(value) || 0 }));
  };

  const handleRegister = () => {
    if (
      formData.CLASSCCD === "all" ||
      formData.DISPATCH === "" ||
      formData.WORKERS === "" ||
      formData.WORKTIME === "" ||
      formData.LINES <= 0
    ) {
      msgPopup("소분류, 출동여부, 작업인원, 근무시간, 회선수를 확인해주세요.");
      return;
    }

    const selectedMajor = data.find((item) => item.CLASSACD === formData.CLASSACD);
    const selectedMiddle = data.find((item) => item.CLASSBCD === formData.CLASSBCD);
    const selectedMinor = data.find((item) => item.CLASSCCD === formData.CLASSCCD);

    const newItems = [];
    allProcessItems.forEach((process) => {
      const time = processTimes[process];
      if (time > 0) {
        newItems.push({
          CLASSACD: formData.CLASSACD,
          CLASSBCD: formData.CLASSBCD,
          CLASSCCD: formData.CLASSCCD,
          CLASSANM: selectedMajor ? selectedMajor.CLASSANM : "",
          CLASSBNM: selectedMiddle ? selectedMiddle.CLASSBNM : "",
          CLASSCNM: selectedMinor ? selectedMinor.CLASSCNM : "",
          WORKDATE: formData.WORKDATE,
          CUSTOMER: formData.CUSTOMER,
          DISPATCH: formData.DISPATCH,
          WORKERS: formData.WORKERS,
          WORKTIME: formData.WORKTIME,
          LINES: formData.LINES,
          PROCESS: process,
          PROCESSTIME: time,
        });
      }
    });

    if (newItems.length === 0) {
      msgPopup("처리시간(분)을 하나 이상 입력해주세요.");
      return;
    }

    setRegisteredList((prev) => [...prev, ...newItems]);
  };

  const handleDelete = (index) => {
    setRegisteredList((prev) => prev.filter((_, i) => i !== index));
  };

  // Add handleUpdate if needed, similar to StandardEmpJobRegPopup

  const handleClassSelect = ({ major, middle, minor }) => {
    const editingIndex = classPopupState.editingIndex;
    if (editingIndex === -1) {
      setClass2Options(getFieldOptions("CLASSBCD", major, data));
      setClass3Options(getFieldOptions("CLASSCCD", middle, data));

      setFormData((prev) => ({
        ...prev,
        CLASSACD: major,
        CLASSBCD: middle,
        CLASSCCD: minor,
      }));
    } else {
      // Update list row if editing
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
                CLASSANM: selectedMajor ? selectedMajor.CLASSANM : "",
                CLASSBNM: selectedMiddle ? selectedMiddle.CLASSBNM : "",
                CLASSCNM: selectedMinor ? selectedMinor.CLASSCNM : "",
              }
            : item
        )
      );
    }
    setClassPopupState({ show: false, editingIndex: -1 });
  };

  // Chunk process items into groups of 9 for display
  const chunkedGroups = processGroups.map((group) =>
    Array.from({ length: Math.ceil(group.length / 9) }, (_, i) => group.slice(i * 9, (i + 1) * 9))
  );

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>Biz 개별 업무 등록</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.noteSection}>
          <span>* 익월 10일 지나면 전월자료 수정 불가 합니다.</span>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleRegister}>
            등록
          </button>
        </div>
        <table className={styles.formTable}>
          <tbody>
            <tr>
              <td>
                대분류:
                <button onClick={() => setClassPopupState({ show: true, editingIndex: -1 })} className={styles.selectBtn}>
                  선택
                </button>
              </td>
              <td>
                <select name="CLASSACD" value={formData.CLASSACD} onChange={handleChange} className={styles.select}>
                  <option value="all">==대분류==</option>
                  {getFieldOptions("CLASSACD", "", data)
                    .slice(1)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </td>
              <td>중분류:</td>
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
              <td>소분류:</td>
              <td colSpan="5">
                <select name="CLASSCCD" value={formData.CLASSCCD} onChange={handleChange} className={styles.select}>
                  <option value="all">==소분류==</option>
                  {class3Options.slice(1).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className={styles.td1}>회선번호+고객명:</td>
              <td className={styles.td2}>
                <input type="text" name="CUSTOMER" value={formData.CUSTOMER} onChange={handleChange} className={styles.input} />
              </td>
              <td className={styles.td3}>출동여부:</td>
              <td className={styles.td4}>
                <select name="DISPATCH" value={formData.DISPATCH} onChange={handleChange} className={styles.select}>
                  <option value="">== 선택 ==</option>
                  <option value="출동-일반">출동-일반</option>
                  <option value="출동-위험작업">출동-위험작업</option>
                  <option value="무출동">무출동</option>
                </select>
              </td>
              <td className={styles.td5}>작업인원:</td>
              <td className={styles.td6}>
                <select name="WORKERS" value={formData.WORKERS} onChange={handleChange} className={styles.select}>
                  <option value="">== 선택 ==</option>
                  <option value="단독">단독</option>
                  <option value="공동-2명">공동-2명</option>
                  <option value="공동-3명">공동-3명</option>
                  <option value="공동-4명">공동-4명</option>
                  <option value="공동-5명">공동-5명</option>
                  <option value="공동-6명">공동-6명</option>
                  <option value="공동-7명">공동-7명</option>
                </select>
              </td>
              <td className={styles.td7}>근무시간:</td>
              <td className={styles.td8}>
                <select name="WORKTIME" value={formData.WORKTIME} onChange={handleChange} className={styles.select}>
                  <option value="">== 선택 ==</option>
                  <option value="평일주간">평일주간</option>
                  <option value="평일야간">평일야간</option>
                  <option value="휴일주간">휴일주간</option>
                  <option value="휴일야간">휴일야간</option>
                </select>
              </td>
              <td className={styles.td9}>회선수:</td>
              <td>
                <input type="number" name="LINES" value={formData.LINES} onChange={handleChange} min="1" className={styles.input} />
              </td>
            </tr>
            <tr>
              <td colSpan="10">
                <h5>프로세스</h5>
                <div className={styles.processTableContainer}>
                  <table className={styles.processTable}>
                    <tbody>
                      {Array.from({ length: Math.ceil(processGroups.length / 9) }, (_, i) => (
                        <React.Fragment key={i}>
                          <tr>
                            <td>항목</td>
                            {processGroups.slice(i * 9, (i + 1) * 9).map((item) => (
                              <td key={item}>{item}</td>
                            ))}
                            {processGroups.slice(i * 9, (i + 1) * 9).length < 9 &&
                              Array(9 - processGroups.slice(i * 9, (i + 1) * 9).length)
                                .fill()
                                .map((_, j) => <td key={`empty-${i}-${j}`}></td>)}
                          </tr>
                          <tr>
                            <td>처리시간(분)</td>
                            {processGroups.slice(i * 9, (i + 1) * 9).map((item) => (
                              <td key={item}>
                                <input
                                  type="number"
                                  min="0"
                                  value={processTimes[item] || 0}
                                  onChange={(e) => handleProcessChange(item, e.target.value)}
                                  className={styles.rowInput}
                                />
                              </td>
                            ))}
                            {processGroups.slice(i * 9, (i + 1) * 9).length < 9 &&
                              Array(9 - processGroups.slice(i * 9, (i + 1) * 9).length)
                                .fill()
                                .map((_, j) => <td key={`empty-input-${i}-${j}`}></td>)}
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan="10">
                  <h5>등록 리스트</h5>
                  <div className={styles.listTableContainer}>
                  <table className={styles.listTable}>
                      <thead>
                      <tr>
                          <th className={styles.thNo}>No</th>
                          <th className={styles.thWorkDate}>업무일</th>
                          <th className={styles.thClassA}>대분류</th>
                          <th className={styles.thClassB}>중분류</th>
                          <th className={styles.thClassC}>소분류</th>
                          <th className={styles.thCustomer}>회선번호<br />+고객명</th>
                          <th className={styles.thDispatch}>출동여부</th>
                          <th className={styles.thWorkers}>작업인원</th>
                          <th className={styles.thWorkTime}>근무시간</th>
                          <th className={styles.thLines}>회선수</th>
                          <th className={styles.thProcess}>프로세스</th>
                          <th className={styles.thProcessTime}>처리시간(분)</th>
                          <th className={styles.thAction}>작업</th>
                          <th>&nbsp;</th>
                      </tr>
                      </thead>
                      <tbody>
                      {registeredList.map((item, index) => (
                          <tr key={index}>
                          <td className={styles.thNo}>{index + 1}</td>
                          <td className={styles.thWorkDate}>{item.WORKDATE}</td>
                          <td className={styles.thClassA}>{item.CLASSANM}</td>
                          <td className={styles.thClassB}>{item.CLASSBNM}</td>
                          <td className={styles.thClassC}>{item.CLASSCNM}</td>
                          <td className={styles.thCustomer}>{item.CUSTOMER}</td>
                          <td className={styles.thDispatch}>{item.DISPATCH}</td>
                          <td className={styles.thWorkers}>{item.WORKERS}</td>
                          <td className={styles.thWorkTime}>{item.WORKTIME}</td>
                          <td className={styles.thLines}>{item.LINES}</td>
                          <td className={styles.thProcess}>{item.PROCESS}</td>
                          <td className={styles.thProcessTime}>{item.PROCESSTIME}</td>
                          <td className={styles.thAction}>
                              <button onClick={() => handleDelete(index)} className={styles.deleteBtn}>삭제</button>
                          </td>
                          </tr>
                      ))}
                      </tbody>
                  </table>
                  </div>
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

export default StandardBizEmpJobRegPopup;
