import React, { useState, useEffect, useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import styles from "./StandardBizEmpJobRegPopup.module.css";
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

const StandardBizEmpJobRegPopup = ({ show, onHide, data, filters, bizWorkTypes }) => {
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    CLASSACD: "all",
    CLASSBCD: "all",
    CLASSCCD: "all",
    WORKDATE: today,
    CUSTOMER: "",
    DISPATCH: "",
    WORKERS: "",
    WORKTIME: "",
    LINES: 1,
  });
  const [processTimes, setProcessTimes] = useState({});
  const [registeredList, setRegisteredList] = useState([]);
  const [class2Options, setClass2Options] = useState([]);
  const [class3Options, setClass3Options] = useState([]);
  const [dispatchOptions, setDispatchOptions] = useState([]);
  const [workersOptions, setWorkersOptions] = useState([]);
  const [workTimeOptions, setWorkTimeOptions] = useState([]);
  const [classPopupState, setClassPopupState] = useState({ show: false, editingIndex: -1 });
  const [originalValues, setOriginalValues] = useState({});
  const [classGubun, setClassGubun] = useState(filters.classGubun || 'BIZ');

  // CLOSEDT 값 추출
  const closedt = data[0]?.CLOSEDT || '10';

  // API 호출로 드롭리스트 옵션 가져오기
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

  // 선택된 소분류에 해당하는 BIZMCODE 찾기
  const selectedBizMCode = useMemo(() => {
    if (formData.CLASSCCD === "all") return null;
    const selectedItem = data.find((item) => item.CLASSCCD === formData.CLASSCCD);
    return selectedItem?.BIZMCODE || null;
  }, [formData.CLASSCCD, data]);

  // BIZMCODE에 해당하는 bizWorkTypes 필터링 및 정렬
  const filteredBizWorkTypes = useMemo(() => {
    if (!selectedBizMCode) return [];
    return bizWorkTypes
      .filter((item) => item.BIZMCODE === selectedBizMCode)
      .sort((a, b) => a.ODR - b.ODR);
  }, [selectedBizMCode, bizWorkTypes]);

  // 필터링된 항목으로 flatProcessItems 설정
  const flatProcessItems = filteredBizWorkTypes;

  // BIZMCODE로 그룹화하고 ODR로 정렬
  const groupedProcessItems = useMemo(() => {
    const grouped = flatProcessItems.reduce((acc, item) => {
      if (!acc[item.BIZMCODE]) acc[item.BIZMCODE] = [];
      acc[item.BIZMCODE].push(item);
      return acc;
    }, {});
    return Object.values(grouped).map(group => group.sort((a, b) => a.ODR - b.ODR));
  }, [flatProcessItems]);

  // 각 그룹을 9개씩 청크로 나눔
  const chunkedGroups = useMemo(() => {
    return groupedProcessItems.map(group =>
      Array.from({ length: Math.ceil(group.length / 9) }, (_, i) => group.slice(i * 9, (i + 1) * 9))
    );
  }, [groupedProcessItems]);

  // processTimes 초기화
  useEffect(() => {
    const initialTimes = {};
    flatProcessItems.forEach((item) => {
      initialTimes[item.WORKCD] = 0;
    });
    setProcessTimes(initialTimes);
  }, [flatProcessItems]);

  // 등록 리스트 총 처리시간 계산
  const totalRegisteredTime = useMemo(() => {
    return registeredList.reduce((sum, item) => sum + (parseInt(item.PROCESSTIME) || 0), 0);
  }, [registeredList]);

  // 프로세스 총 처리시간 계산
  const totalProcessTime = useMemo(() => {
    const processTimeSum = Object.values(processTimes).reduce((sum, time) => sum + (parseInt(time) || 0), 0);
    return totalRegisteredTime + processTimeSum;
  }, [processTimes, totalRegisteredTime]);

  // 분을 시간:분 형식으로 변환
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // useMemo로 옵션 최적화
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
    setFormData((prev) => {
      let newData = { ...prev, [name]: value };
      if (name === "CLASSACD") {
        newData.CLASSBCD = "all";
        newData.CLASSCCD = "all";
      } else if (name === "CLASSBCD") {
        newData.CLASSCCD = "all";
      }
      return newData;
    });
  };

  const handleProcessChange = (workcd, value) => {
    setProcessTimes((prev) => ({ ...prev, [workcd]: parseInt(value) || 0 }));
  };

  const handleRowChange = (index, field, value) => {
    setOriginalValues((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: registeredList[index][field],
      },
    }));
    setRegisteredList((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === "PROCESSTIME" ? parseInt(value) || 0 : value } : item
      )
    );
  };

  const handleUpdate = (index) => {
    const totalTime = registeredList.reduce((sum, item) => sum + (parseInt(item.PROCESSTIME) || 0), 0);

    if (totalTime > 1440) {
      msgPopup("하루 24시간 초과하면 안됩니다.");
      setRegisteredList((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                CUSTOMER: originalValues[index]?.CUSTOMER || item.CUSTOMER,
                PROCESSTIME: originalValues[index]?.PROCESSTIME || item.PROCESSTIME,
              }
            : item
        )
      );
      return;
    }

    msgPopup("수정완료");
    setOriginalValues((prev) => {
      const newValues = { ...prev };
      delete newValues[index];
      return newValues;
    });
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

    const processTimeSum = Object.values(processTimes).reduce((sum, time) => sum + (parseInt(time) || 0), 0);
    if (totalRegisteredTime + processTimeSum > 1440) {
      msgPopup("하루 24시간 초과하면 안됩니다.");
      return;
    }

    const selectedMajor = data.find((item) => item.CLASSACD === formData.CLASSACD);
    const selectedMiddle = data.find((item) => item.CLASSBCD === formData.CLASSBCD);
    const selectedMinor = data.find((item) => item.CLASSCCD === formData.CLASSCCD);

    const newItems = [];
    flatProcessItems.forEach((item) => {
      const time = processTimes[item.WORKCD];
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
          PROCESS: item.WORKCD,
          PROCESSNM: item.WORKNM,
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
    setOriginalValues((prev) => {
      const newValues = { ...prev };
      delete newValues[index];
      return newValues;
    });
  };

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

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>Biz 개별 업무 등록</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.noteSection}>
          <span>* 익월 {closedt}일 지나면 전월자료 수정 불가 합니다.</span>
          <button className={`btn text-bg-success`} onClick={handleRegister}>
            등록
          </button>
        </div>
        <table className={styles.formTable}>
          <tbody>
            <tr>
              <td className={styles.td1}>
                대분류:
                <button onClick={() => setClassPopupState({ show: true, editingIndex: -1 })} className={`btn text-bg-secondary`}>
                  선택
                </button>
              </td>
              <td className={styles.td2}>
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
              <td className={styles.td3}>중분류:</td>
              <td className={styles.td4}>
                <select name="CLASSBCD" value={formData.CLASSBCD} onChange={handleChange} className={styles.select}>
                  <option value="all">==중분류==</option>
                  {class2Options.slice(1).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className={styles.td5}>소분류:</td>
              <td className={styles.td6} colSpan="5">
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
                  {dispatchOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className={styles.td5}>작업인원:</td>
              <td className={styles.td6}>
                <select name="WORKERS" value={formData.WORKERS} onChange={handleChange} className={styles.select}>
                  <option value="">== 선택 ==</option>
                  {workersOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className={styles.td7}>근무시간:</td>
              <td className={styles.td8}>
                <select name="WORKTIME" value={formData.WORKTIME} onChange={handleChange} className={styles.select}>
                  <option value="">== 선택 ==</option>
                  {workTimeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className={styles.td9}>회선수:</td>
              <td>
                <input type="number" name="LINES" value={formData.LINES} onChange={handleChange} min="1" className={styles.input} />
              </td>
            </tr>
            <tr>
              <td colSpan="10">
                <h5>
                  프로세스 <span style={{ color: "red" }}>[총 처리시간: {totalProcessTime}(분), {formatTime(totalProcessTime)}(시간)]</span>
                </h5>
                <div className={styles.processTableContainer}>
                  <table className={styles.processTable}>
                    <tbody>
                      {chunkedGroups.map((groupChunks, groupIndex) =>
                        groupChunks.map((chunk, chunkIndex) => (
                          <React.Fragment key={`${groupIndex}-${chunkIndex}`}>
                            <tr>
                              <td className={styles.processTable}>항목</td>
                              {chunk.map((item) => (
                                <td key={item.WORKCD} className={styles.processTable}>{item.WORKNM}</td>
                              ))}
                              {chunk.length < 9 &&
                                Array(9 - chunk.length)
                                  .fill()
                                  .map((_, j) => <td key={`empty-${groupIndex}-${chunkIndex}-${j}`} className={styles.processTable}></td>)}
                            </tr>
                            <tr>
                              <td className={styles.processTable}>처리시간(분)</td>
                              {chunk.map((item) => (
                                <td key={item.WORKCD} className={styles.processTable}>
                                  <input
                                    type="number"
                                    min="0"
                                    value={processTimes[item.WORKCD] || 0}
                                    onChange={(e) => handleProcessChange(item.WORKCD, e.target.value)}
                                    className={styles.rowInput}
                                    name={`txt${item.WORKCD}`}
                                    id={`txt${item.WORKCD}`}
                                  />
                                </td>
                              ))}
                              {chunk.length < 9 &&
                                Array(9 - chunk.length)
                                  .fill()
                                  .map((_, j) => <td key={`empty-input-${groupIndex}-${chunkIndex}-${j}`} className={styles.processTable}></td>)}
                            </tr>
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan="10">
                <h5>
                  등록 리스트 <span style={{ color: "red" }}>[총 처리시간: {totalRegisteredTime}(분), {formatTime(totalRegisteredTime)}(시간)]</span>
                </h5>
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
                          <td className={styles.thCustomer}>
                            <input
                              type="text"
                              value={item.CUSTOMER}
                              onChange={(e) => handleRowChange(index, "CUSTOMER", e.target.value)}
                              className={styles.input}
                            />
                          </td>
                          <td className={styles.thDispatch}>{item.DISPATCH}</td>
                          <td className={styles.thWorkers}>{item.WORKERS}</td>
                          <td className={styles.thWorkTime}>{item.WORKTIME}</td>
                          <td className={styles.thLines}>{item.LINES}</td>
                          <td className={styles.thProcess}>{item.PROCESSNM}</td>
                          <td className={styles.thProcessTime}>
                            <input
                              type="number"
                              min="0"
                              value={item.PROCESSTIME}
                              onChange={(e) => handleRowChange(index, "PROCESSTIME", e.target.value)}
                              className={styles.rowInput}
                            />
                          </td>
                          <td className={styles.thAction}>
                            <button onClick={() => handleUpdate(index)} className={`btn text-bg-primary`}>
                              수정
                            </button>
                            <button onClick={() => handleDelete(index)} className={`btn text-bg-danger`}>
                              삭제
                            </button>
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