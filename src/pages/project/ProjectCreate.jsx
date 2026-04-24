import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import useStore from "../../store/store";
import MainSearch from "../../components/main/MainSearch";
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import styles from "../main/popup/BoardPopup.module.css";
import fileUtils from "../../utils/fileUtils";
import { IMPROVETYPE_OPTIONS, WORKFIELD_OPTIONS, SYSTEM_OPTIONS } from "./projectManage.constants";

const COMMON_CLASS_OPTION = { value: "COMMON", label: "공통" };
const COMMON_CLASS_OPTIONS = [{ value: "", label: "선택하세요" }, COMMON_CLASS_OPTION];

const clampPercent = (n) => {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
};

const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const areArraysEqual = (arr1, arr2) => {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;

  return arr1.every((item, index) => item.value === arr2[index]?.value && item.label === arr2[index]?.label);
};

const getFieldOptions = (fieldId, dependentValue = "", classData = []) => {
  if (!Array.isArray(classData)) return [];

  const uniqueMap = new Map();

  if (fieldId === "CLASSACD") {
    classData.forEach((item) => {
      const classACd = item.CLASSACD ?? item.classACd;
      const classANm = item.CLASSANM ?? item.classANm;

      if (classACd && classANm && !uniqueMap.has(classACd)) {
        uniqueMap.set(classACd, { value: classACd, label: classANm });
      }
    });

    return [{ value: "", label: "선택하세요" }, ...Array.from(uniqueMap.values())];
  }

  if (fieldId === "CLASSBCD") {
    if (!dependentValue) {
      return [{ value: "", label: "선택하세요" }];
    }

    classData
      .filter((item) => (item.CLASSACD ?? item.classACd) === dependentValue)
      .forEach((item) => {
        const classBCd = item.CLASSBCD ?? item.classBCd;
        const classBNm = item.CLASSBNM ?? item.classBNm;

        if (classBCd && classBNm && !uniqueMap.has(classBCd)) {
          uniqueMap.set(classBCd, { value: classBCd, label: classBNm });
        }
      });

    return [{ value: "", label: "선택하세요" }, ...Array.from(uniqueMap.values())];
  }

  return [];
};

const createBaseSearchConfig = () => ({
  areas: [
    {
      type: "search",
      fields: [
        {
          id: "improvementType",
          type: "select",
          row: 1,
          label: "개선유형",
          labelVisible: true,
          options: IMPROVETYPE_OPTIONS,
          width: "167px",
          enabled: true,
          eventType: "selectChange",
        },
        {
          id: "workField",
          type: "select",
          row: 2,
          label: "업무분야",
          labelVisible: true,
          options: WORKFIELD_OPTIONS,
          width: "167px",
          enabled: true,
          eventType: "selectChange",
        },
        {
          id: "classA",
          type: "select",
          row: 2,
          label: "대분류",
          labelVisible: true,
          options: [{ value: "", label: "선택하세요" }],
          width: "167px",
          enabled: true,
          eventType: "selectChange",
        },
        {
          id: "classB",
          type: "select",
          row: 2,
          label: "중분류",
          labelVisible: true,
          options: [{ value: "", label: "선택하세요" }],
          width: "167px",
          enabled: true,
          eventType: "selectChange",
        },
        {
          id: "system",
          type: "select",
          row: 1,
          label: "시스템",
          labelVisible: true,
          options: SYSTEM_OPTIONS,
          width: "167px",
          enabled: true,
        },
        {
          id: "title",
          type: "text",
          row: 3,
          label: "요청제목",
          labelVisible: true,
          placeholder: "예) 차량 이전 신청 프로세스 개선",
          maxLength: 200,
          width: "620px",
          enabled: true,
        },
        {
          id: "issue",
          type: "textarea",
          row: 4,
          label: "문제사항",
          labelVisible: true,
          placeholder: "현재 문제점 또는 이슈사항을 입력하세요",
          maxLength: 2000,
          width: "620px",
          enabled: true,
        },
        {
          id: "requestDetail",
          type: "textarea",
          row: 5,
          label: "개선요청",
          labelVisible: true,
          placeholder: "개선이 필요한 내용을 구체적으로 입력하세요",
          maxLength: 2000,
          width: "620px",
          enabled: true,
        },
      ],
    },
  ],
});

const getDefaultFilters = (defaultWriterDept = "", defaultWriter = "") => ({
  improvementType: "",
  workField: "",
  classA: "",
  classB: "",
  system: "",
  requestDept: "",
  title: "",
  issue: "",
  requestDetail: "",
  writerDept: defaultWriterDept,
  writer: defaultWriter,
  requestDate: todayStr(),
  status: "RECEIVED",
  percent: 0,
  useYn: "Y",
  meetingDate: "",
  startDate: "",
  endDate: "",
});

const ProjectCreate = ({ show, onClose, onCreated }) => {
  const { user } = useStore();
  const isAuthed = !!user;

  const defaultWriter = useMemo(() => {
    return user?.empNo ?? user?.empno ?? user?.userId ?? user?.id ?? user?.name ?? user?.username ?? "";
  }, [user]);

  const defaultWriterDept = useMemo(() => {
    return user?.orgNm ?? user?.carOrgNm ?? user?.carMngOrgNm ?? "";
  }, [user]);

  const [saving, setSaving] = useState(false);
  const [classData, setClassData] = useState([]);
  const [_classAOptions, setClassAOptions] = useState([]);
  const [_classBOptions, setClassBOptions] = useState([]);

  const [fileInputs, setFileInputs] = useState([{ id: Date.now() }]);
  const [files, setFiles] = useState([null]);

  const baseSearchConfig = useMemo(() => createBaseSearchConfig(), []);
  const [searchConfig, setSearchConfig] = useState(baseSearchConfig);
  const [filters, setFilters] = useState(getDefaultFilters(defaultWriterDept, defaultWriter));

  const updatedClassBOptions = useMemo(() => {
    if (filters.workField === "COMMON") {
      return COMMON_CLASS_OPTIONS;
    }
    return getFieldOptions("CLASSBCD", filters.classA, classData);
  }, [filters.workField, filters.classA, classData]);

  useEffect(() => {
    fileUtils.setAccept("*");
    return () => {
      fileUtils.getAccept();
    };
  }, []);

  useEffect(() => {
    if (!show) return;

    setClassData([]);
    setClassAOptions([]);
    setClassBOptions([]);
    setFileInputs([{ id: Date.now() }]);
    setFiles([null]);
    setSearchConfig(baseSearchConfig);
    setFilters(getDefaultFilters(defaultWriterDept, defaultWriter));
  }, [show, defaultWriter, defaultWriterDept, baseSearchConfig]);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!filters.workField) {
        setClassData([]);
        setClassAOptions([{ value: "", label: "선택하세요" }]);
        setClassBOptions([{ value: "", label: "선택하세요" }]);
        return;
      }

      if (filters.workField === "COMMON") {
        setClassData([]);
        setClassAOptions(COMMON_CLASS_OPTIONS);
        setClassBOptions(COMMON_CLASS_OPTIONS);

        setSearchConfig((prev) => {
          const newAreas = prev.areas.map((area) => {
            if (area.type !== "search") return area;

            const newFields = area.fields.map((field) => {
              if (field.id === "classA") return { ...field, options: COMMON_CLASS_OPTIONS };
              if (field.id === "classB") return { ...field, options: COMMON_CLASS_OPTIONS };
              return field;
            });

            return { ...area, fields: newFields };
          });

          return { ...prev, areas: newAreas };
        });

        setFilters((prev) => ({
          ...prev,
          classA: "COMMON",
          classB: "COMMON",
        }));

        return;
      }

      try {
        const params = {
          pGUBUN: filters.workField,
          pDEBUG: "F",
        };

        const response = await fetchData("standard/classinfoList", params);

        if (!response.success) {
          errorMsgPopup(response.message || "분류 목록을 가져오는 중 오류가 발생했습니다.");
          return;
        }

        const fetchedClassData = Array.isArray(response.data) ? response.data : [];
        setClassData(fetchedClassData);

        const initialClassAOptions = getFieldOptions("CLASSACD", "", fetchedClassData);
        const initialClassBOptions = getFieldOptions("CLASSBCD", "", fetchedClassData);

        setClassAOptions(initialClassAOptions);
        setClassBOptions(initialClassBOptions);

        setSearchConfig((prev) => {
          const newAreas = prev.areas.map((area) => {
            if (area.type !== "search") return area;

            const newFields = area.fields.map((field) => {
              if (field.id === "classA") return { ...field, options: initialClassAOptions };
              if (field.id === "classB") return { ...field, options: initialClassBOptions };
              return field;
            });

            return { ...area, fields: newFields };
          });

          return { ...prev, areas: newAreas };
        });

        setFilters((prev) => ({
          ...prev,
          classA: "",
          classB: "",
        }));
      } catch (err) {
        console.error("분류 목록 로드 실패:", err);
        errorMsgPopup(err?.response?.data?.message || "분류 목록을 가져오는 중 오류가 발생했습니다.");
      }
    };

    fetchClassData();
  }, [filters.workField]);

  useEffect(() => {
    setClassBOptions(updatedClassBOptions);

    setSearchConfig((prev) => {
      const prevClassBOptions =
        prev.areas.find((area) => area.type === "search")?.fields.find((field) => field.id === "classB")?.options || [];

      const isClassBOptionsChanged = !areArraysEqual(prevClassBOptions, updatedClassBOptions);

      if (!isClassBOptionsChanged) return prev;

      const newAreas = prev.areas.map((area) => {
        if (area.type !== "search") return area;

        const newFields = area.fields.map((field) => {
          if (field.id === "classB") return { ...field, options: updatedClassBOptions };
          return field;
        });

        return { ...area, fields: newFields };
      });

      return { ...prev, areas: newAreas };
    });
  }, [filters.classA, filters.workField, updatedClassBOptions]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      writerDept: prev.writerDept || defaultWriterDept,
      writer: prev.writer || defaultWriter,
      requestDate: prev.requestDate || todayStr(),
      status: prev.status || "RECEIVED",
      percent: prev.percent === undefined || prev.percent === null || prev.percent === "" ? 0 : clampPercent(prev.percent),
      useYn: prev.useYn || "Y",
    }));
  }, [searchConfig, defaultWriter, defaultWriterDept]);

  const handleDynamicEvent = (eventType, payload) => {
    if (eventType === "selectChange") {
      const { id, value } = payload;

      setFilters((prev) => {
        const next = { ...prev, [id]: value };

        if (id === "workField") {
          if (value === "COMMON") {
            next.classA = "COMMON";
            next.classB = "COMMON";
          } else {
            next.classA = "";
            next.classB = "";
          }
        } else if (id === "classA") {
          next.classB = prev.workField === "COMMON" ? "COMMON" : "";
        }

        return next;
      });
    }
  };

  const handleAddFileInput = () => {
    const validFilesCount = files.filter((file) => file != null).length;

    if (validFilesCount + fileInputs.length < fileUtils.getMaxFiles()) {
      setFileInputs([...fileInputs, { id: Date.now() }]);
      setFiles([...files, null]);
    }
  };

  const handleRemoveFileInput = (id) => {
    const index = fileInputs.findIndex((input) => input.id === id);
    if (index === -1) return;

    if (fileInputs.length > 1) {
      const newFileInputs = fileInputs.filter((input) => input.id !== id);
      const newFiles = files.filter((_, i) => i !== index);
      setFileInputs(newFileInputs);
      setFiles(newFiles);
      return;
    }

    setFileInputs([{ id: Date.now() + 1 }]);
    setFiles([null]);
  };

  const handleFileChange = (id, e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > fileUtils.getMaxFileSize()) {
        errorMsgPopup(`파일 크기는 ${fileUtils.formatFileSize(fileUtils.getMaxFileSize())}를 초과할 수 없습니다.`);
        return;
      }

      if (!fileUtils.isValidFile(selectedFile)) {
        errorMsgPopup("문서 파일(pdf, doc, docx, xls, xlsx, ppt, pptx)만 업로드 가능합니다.");
        return;
      }

      const index = fileInputs.findIndex((input) => input.id === id);
      if (index === -1) return;

      const newFiles = [...files];
      newFiles[index] = selectedFile;
      setFiles(newFiles);
    }
  };

  const validate = () => {
    if (!isAuthed) return false;

    if (!String(filters.improvementType || "").trim()) {
      errorMsgPopup("개선유형을 선택해주세요.");
      return false;
    }
    if (!String(filters.workField || "").trim()) {
      errorMsgPopup("업무분야를 선택해주세요.");
      return false;
    }
    if (!String(filters.classA || "").trim()) {
      errorMsgPopup("대분류를 선택해주세요.");
      return false;
    }
    if (!String(filters.classB || "").trim()) {
      errorMsgPopup("중분류를 선택해주세요.");
      return false;
    }
    if (!String(filters.system || "").trim()) {
      errorMsgPopup("시스템명을 선택해주세요.");
      return false;
    }
    if (!String(filters.title || "").trim()) {
      errorMsgPopup("요청제목을 입력해주세요.");
      return false;
    }
    if (!String(filters.issue || "").trim()) {
      errorMsgPopup("문제점/이슈사항을 입력해주세요.");
      return false;
    }
    if (!String(filters.requestDetail || "").trim()) {
      errorMsgPopup("개선요청사항을 입력해주세요.");
      return false;
    }
    if (!String(filters.writer || "").trim()) {
      errorMsgPopup("작성자 정보가 없습니다.");
      return false;
    }

    return true;
  };

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        gubun: "I",
        projectId: "",
        improvementType: filters.improvementType || "",
        projectNm: filters.title || "",
        ownerDept: filters.writerDept || "",
        owner: filters.writer || "",
        systemNm: filters.system || "",
        workField: filters.workField || "",
        classACd: filters.classA || "",
        classBCd: filters.classB || "",
        requestDate: filters.requestDate || todayStr(),
        requestDept: "",
        issueCn: filters.issue || "",
        reqCn: filters.requestDetail || "",
        meetingDt: filters.meetingDate || "",
        startDt: filters.startDate || "",
        endDt: filters.endDate || "",
        status: filters.status || "RECEIVED",
        progress: clampPercent(filters.percent),
        useYn: filters.useYn || "Y",

        reviewer: "",
        rvwProjectNm: "",
        rvwImproveType: "",
        rvwWorkField: "",
        rvwClassAcd: "",
        rvwClassBcd: "",
        rvwSystemNm: "",
        rvwIssueCn: "",
        rvwReqCn: "",
      };

      const saveResponse = await fetchData("project/save", payload);

      const saveErrCd = saveResponse?.data?.errCd ?? saveResponse?.errCd;
      const saveErrMsg = saveResponse?.data?.errMsg ?? saveResponse?.errMsg;

      if (saveErrCd !== "00") {
        throw new Error(saveErrMsg || "프로젝트 등록 실패");
      }

      const newProjectId =
        saveResponse?.data?.projectId ?? saveResponse?.data?.PROJECTID ?? saveResponse?.projectId ?? saveResponse?.PROJECTID;

      if (!newProjectId) {
        throw new Error("저장된 프로젝트 ID를 확인할 수 없습니다.");
      }

      const validFiles = files.filter((file) => file != null);

      if (validFiles.length > 0) {
        const formData = new FormData();
        formData.append("gubun", "I");
        formData.append("fileId", "");
        formData.append("projectId", String(newProjectId));

        validFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetchFileUpload("project/filesave", formData);

        const uploadErrCd = uploadResponse?.data?.errCd ?? uploadResponse?.errCd;
        const uploadErrMsg = uploadResponse?.data?.errMsg ?? uploadResponse?.errMsg;

        if (uploadErrCd !== "00") {
          throw new Error(uploadErrMsg || "파일 업로드 실패");
        }
      }

      msgPopup("시스템 개선 요청이 성공적으로 등록되었습니다.");
      if (onCreated) onCreated(newProjectId);
      if (onClose) onClose();
    } catch (e) {
      console.error(e);
      errorMsgPopup(e.message || "시스템 개선 요청 등록 중 오류");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>시스템 개선 요청</Modal.Title>
      </Modal.Header>

      <Modal.Body className={styles.modalBody}>
        <form onSubmit={handleCreate}>
          <div className={styles.boardContainer}>
            <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
          </div>

          <div style={{ marginTop: "16px" }}>
            <div className="text-muted"> ※ 개선이 필요한 화면 및 절차 등의 파일을 첨부해주세요 </div>
            <div className="attachLabelWrap">
              <label className="form-label">
                첨부파일{" "}
                <span className="text-muted">
                  (최대 {fileUtils.getMaxFiles()}개, {fileUtils.formatFileSize(fileUtils.getMaxFileSize())}까지, 문서 파일만 가능)
                </span>
              </label>
            </div>

            {fileInputs && fileInputs.length > 0 ? (
              fileInputs.map((input, index) => (
                <div key={input.id} className="d-flex align-items-center mt-2">
                  <input
                    type="file"
                    className={`form-control bg-light-subtle ${styles.formControl} me-2`}
                    onChange={(e) => handleFileChange(input.id, e)}
                    accept={fileUtils.getAccept()}
                    disabled={saving}
                  />
                  <button type="button" className="btn btnOutlinedIcon" onClick={() => handleRemoveFileInput(input.id)} disabled={saving}>
                    -
                  </button>
                  {index === fileInputs.length - 1 && (
                    <button
                      type="button"
                      className="btn btnOutlinedIcon"
                      onClick={handleAddFileInput}
                      disabled={saving || fileInputs.length >= fileUtils.getMaxFiles()}
                    >
                      +
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div></div>
            )}

            {files.some((file) => file != null) && (
              <div className="attachList mt-3">
                <h6>선택된 파일:</h6>
                <ul>
                  {files.map(
                    (file, index) =>
                      file && (
                        <li key={index}>
                          {file.name} ({fileUtils.formatFileSize(file.size)})
                        </li>
                      ),
                  )}
                </ul>
              </div>
            )}
          </div>
          <br></br>
          <Modal.Footer>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !isAuthed}>
              {saving ? "등록 중..." : "등록"}
            </button>
          </Modal.Footer>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default ProjectCreate;
