import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useStore from "../../store/store";
import styles from "../../components/table/TableSearch.module.css";
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import ImageViewPopup from "../../components/popup/ImageViewPopup";
import TextViewPopup from "../../components/popup/TextViewPopup";
import DatePickerCommon from "../../components/common/DatePickerCommon";
import fileUtils from "../../utils/fileUtils";
import {
  STATUS_LABEL,
  STATUS_OPTIONS,
  IMPROVETYPE_OPTIONS,
  WORKFIELD_OPTIONS,
  clampPercent,
  getToday,
  normalizeDetailData,
  COMMON_LABEL,
} from "./projectManage.constants";

const themeStyle = {
  borderColor: "var(--bs-border-color, #dee2e6)",
  subtleBorderColor: "var(--bs-border-color-translucent, rgba(0,0,0,.175))",
  bodyColor: "var(--bs-body-color, #212529)",
  secondaryColor: "var(--bs-secondary-color, #6c757d)",
  bodyBg: "var(--bs-body-bg, #fff)",
  secondaryBg: "var(--bs-secondary-bg, #f8f9fa)",
  tertiaryBg: "var(--bs-tertiary-bg, #fafafa)",
  primaryColor: "var(--bs-primary, #0d6efd)",
};

const DEFAULT_SELECT_OPTION = [{ value: "", label: "선택하세요" }];
const COMMON_CLASS_OPTIONS = [
  { value: "", label: "선택하세요" },
  { value: "COMMON", label: "공통" },
];

const getFieldOptions = (fieldName, parentCode = "", source = []) => {
  if (!Array.isArray(source) || source.length === 0) {
    return DEFAULT_SELECT_OPTION;
  }

  let mapped = [];

  if (fieldName === "CLASSACD") {
    mapped = source
      .map((item) => ({
        value: item.CLASSACD || item.classACd || "",
        label: item.CLASSANM || item.classANm || item.CLASSACD || "",
      }))
      .filter((item) => item.value);
  } else if (fieldName === "CLASSBCD") {
    mapped = source
      .filter((item) => {
        if (!parentCode) return true;
        return (item.CLASSACD || item.classACd || "") === parentCode;
      })
      .map((item) => ({
        value: item.CLASSBCD || item.classBCd || "",
        label: item.CLASSBNM || item.classBNm || item.CLASSBCD || "",
      }))
      .filter((item) => item.value);
  }

  const unique = mapped.filter((item, index, arr) => arr.findIndex((v) => v.value === item.value) === index);

  return [...DEFAULT_SELECT_OPTION, ...unique];
};

const normalizeString = (value) => String(value || "").trim();

const resolveOption = (options = [], rawValue = "", rawLabel = "") => {
  const valueText = normalizeString(rawValue);
  const labelText = normalizeString(rawLabel);

  if (!Array.isArray(options) || options.length === 0) {
    return { value: valueText, label: labelText };
  }

  const byValue = options.find((option) => normalizeString(option.value) === valueText);
  if (byValue) return byValue;

  const byLabelFromValue = options.find((option) => normalizeString(option.label) === valueText);
  if (byLabelFromValue) return byLabelFromValue;

  const byLabel = options.find((option) => normalizeString(option.label) === labelText);
  if (byLabel) return byLabel;

  const byValueFromLabel = options.find((option) => normalizeString(option.value) === labelText);
  if (byValueFromLabel) return byValueFromLabel;

  return { value: "", label: "" };
};

const resolveWorkFieldValue = (rawValue = "", rawLabel = "") => {
  const resolved = resolveOption(
    WORKFIELD_OPTIONS.filter((o) => o.value),
    rawValue,
    rawLabel,
  );
  return resolved.value || "";
};

const resolveWorkFieldLabel = (rawValue = "", rawLabel = "") => {
  const resolved = resolveOption(
    WORKFIELD_OPTIONS.filter((o) => o.value),
    rawValue,
    rawLabel,
  );
  return resolved.label || rawLabel || rawValue || "";
};

const SectionTitle = ({ children, right }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
      paddingBottom: 10,
      borderBottom: `1px solid ${themeStyle.borderColor}`,
    }}
  >
    <div
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: themeStyle.bodyColor,
      }}
    >
      {children}
    </div>
    {right ? <div>{right}</div> : null}
  </div>
);

const MetaRow = ({ left, right }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
      fontSize: 14,
      color: themeStyle.secondaryColor,
      flexWrap: "wrap",
    }}
  >
    <div>{left}</div>
    <div>{right}</div>
  </div>
);

const LabelValue = ({ label, children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "140px 1fr",
      gap: 10,
      alignItems: "start",
      marginBottom: 12,
    }}
  >
    <div
      style={{
        fontWeight: 600,
        paddingTop: 8,
        color: themeStyle.bodyColor,
        lineHeight: 1.4,
      }}
    >
      {label}
    </div>
    <div>{children}</div>
  </div>
);

const ReadonlyBox = ({ value }) => (
  <div
    className="form-control"
    style={{
      minHeight: 38,
      backgroundColor: themeStyle.secondaryBg,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    }}
  >
    {value || "-"}
  </div>
);

const cardStyle = {
  border: `1px solid ${themeStyle.borderColor}`,
  borderRadius: 16,
  padding: 20,
  background: themeStyle.bodyBg,
  minWidth: 0,
  color: themeStyle.bodyColor,
  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
};

const fileItemStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  border: `1px solid ${themeStyle.subtleBorderColor}`,
  borderRadius: 12,
  background: themeStyle.tertiaryBg,
};

const fileButtonBaseStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  color: "inherit",
};

const fileLinkButtonStyle = {
  ...fileButtonBaseStyle,
  color: themeStyle.primaryColor,
};

const normalizeDateValue = (input) => {
  if (!input) return "";

  if (typeof input === "string") return input;

  if (typeof input === "object") {
    if (typeof input.target?.value === "string") return input.target.value;
    if (typeof input.value === "string") return input.value;
    if (typeof input.date === "string") return input.date;
    if (typeof input.start === "string") return input.start;
    if (typeof input.end === "string") return input.end;
  }

  return "";
};

const CommonDateInput = ({ value, onChange, type = "day", placeholder = "날짜 선택", disabled = false }) => {
  const [innerValue, setInnerValue] = useState(value || "");

  useEffect(() => {
    setInnerValue(value || "");
  }, [value]);

  const handleChange = (next) => {
    const nextValue = normalizeDateValue(next);
    setInnerValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div style={{ width: "100%" }}>
      <DatePickerCommon
        key={`${type}-${innerValue || "empty"}`}
        type={type}
        value={innerValue || ""}
        defaultValue={innerValue || ""}
        onChange={handleChange}
        placeholder={placeholder}
        enabled={!disabled}
        width="100%"
      />
    </div>
  );
};

const EditField = ({ field, value, onChange }) => {
  switch (field.type) {
    case "text":
      return (
        <input
          className="form-control"
          value={value || ""}
          maxLength={field.maxLength || 255}
          placeholder={field.placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.disabled}
        />
      );

    case "textarea":
      return (
        <textarea
          className="form-control"
          rows={field.rows || 4}
          value={value || ""}
          placeholder={field.placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.disabled}
        />
      );

    case "select":
      return (
        <select className="form-select" value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={field.disabled}>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "day":
    case "startday":
    case "endday":
      return (
        <CommonDateInput
          type={field.type}
          value={value || ""}
          onChange={onChange}
          placeholder={field.placeholder}
          disabled={field.disabled}
        />
      );

    default:
      return <ReadonlyBox value={value} />;
  }
};

const ProjectManageDetail = ({ projectId }) => {
  const { user } = useStore();
  const [, setSearchParams] = useSearchParams();
  const isAuthed = !!user;

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const [isEdit, setIsEdit] = useState(false);
  const [editData, setEditData] = useState(null);

  const [isRequestEdit, setIsRequestEdit] = useState(false);
  const [requestEditData, setRequestEditData] = useState(null);

  const [requestClassData, setRequestClassData] = useState([]);
  const [requestClassAOptions, setRequestClassAOptions] = useState(DEFAULT_SELECT_OPTION);
  const [requestClassBOptions, setRequestClassBOptions] = useState(DEFAULT_SELECT_OPTION);

  const [files, setFiles] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [uploadFileInputs, setUploadFileInputs] = useState([{ id: Date.now() }]);
  const [uploadFiles, setUploadFiles] = useState([null]);
  const [uploading, setUploading] = useState(false);

  const resetUploadFiles = () => {
    setUploadFileInputs([{ id: Date.now() }]);
    setUploadFiles([null]);
  };

  useEffect(() => {
    fileUtils.setAccept("*");
    return () => {
      fileUtils.getAccept();
    };
  }, []);

  const closeImagePopup = () => {
    setSelectedImage(null);
    setZoomLevel(1);
  };

  const closeTextPopup = () => {
    setSelectedText(null);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.1));
  };

  const loadDetail = async (id) => {
    if (!isAuthed || !id) return;

    setDetailLoading(true);
    try {
      const result = await fetchData("project/detail", {
        gubun: "DETAIL",
        projectId: id,
        debug: "F",
        projectNm: "",
        owner: "",
        improveType: "",
        workField: "",
        status: "",
        requestDept: "",
        systemNm: "",
      });

      const errCd = result?.data?.errCd ?? result?.errCd;
      const errMsg = result?.data?.errMsg ?? result?.errMsg;

      if (errCd && errCd !== "00") {
        errorMsgPopup(errMsg || "상세 조회 실패");
        setDetail(null);
        return;
      }

      setDetail(normalizeDetailData(result?.data));
    } catch (e) {
      console.error(e);
      errorMsgPopup("시스템 개선 요청 상세를 불러오는 중 오류가 발생했습니다.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadFiles = async (id) => {
    if (!isAuthed || !id) return;

    setFileLoading(true);
    try {
      const result = await fetchData("project/filelist", {
        gubun: "LIST",
        projectId: id,
        fileId: "",
        debug: "F",
      });

      const rawFiles = Array.isArray(result?.data) ? result.data : [];
      const mappedFiles = rawFiles.map((file) => ({
        fileId: file.FILEID || file.fileId || "",
        projectId: file.PROJECTID || file.projectId || id,
        fileName: file.FILENM || file.fileName || "",
        fileSize: file.FILESIZE || file.fileSize || 0,
      }));

      setFiles(mappedFiles);
    } catch (e) {
      console.error(e);
      errorMsgPopup("첨부파일 목록을 불러오는 중 오류가 발생했습니다.");
      setFiles([]);
    } finally {
      setFileLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setDetail(null);
      setFiles([]);
      setIsEdit(false);
      setEditData(null);
      setIsRequestEdit(false);
      setRequestEditData(null);
      setRequestClassData([]);
      setRequestClassAOptions(DEFAULT_SELECT_OPTION);
      setRequestClassBOptions(DEFAULT_SELECT_OPTION);
      resetUploadFiles();
      return;
    }

    loadDetail(projectId);
    loadFiles(projectId);
    resetUploadFiles();
  }, [projectId, isAuthed]);

  useEffect(() => {
    const fetchRequestClassData = async () => {
      const workField = requestEditData?.workField;

      if (!isRequestEdit) return;

      if (!workField) {
        setRequestClassData([]);
        setRequestClassAOptions(DEFAULT_SELECT_OPTION);
        setRequestClassBOptions(DEFAULT_SELECT_OPTION);
        return;
      }

      if (workField === "COMMON") {
        setRequestClassData([]);
        setRequestClassAOptions(COMMON_CLASS_OPTIONS);
        setRequestClassBOptions(COMMON_CLASS_OPTIONS);

        setRequestEditData((prev) => {
          if (!prev) return prev;

          const resolvedA = resolveOption(COMMON_CLASS_OPTIONS, prev.classACd, prev.classANm);
          const resolvedB = resolveOption(COMMON_CLASS_OPTIONS, prev.classBCd, prev.classBNm);

          return {
            ...prev,
            classACd: resolvedA.value || "COMMON",
            classBCd: resolvedB.value || "COMMON",
            classANm: resolvedA.label || "공통",
            classBNm: resolvedB.label || "공통",
          };
        });

        return;
      }

      try {
        const response = await fetchData("standard/classinfoList", {
          pGUBUN: workField,
          pDEBUG: "F",
        });

        if (!response.success) {
          errorMsgPopup(response.message || "분류 목록을 가져오는 중 오류가 발생했습니다.");
          return;
        }

        const fetchedClassData = Array.isArray(response.data) ? response.data : [];
        setRequestClassData(fetchedClassData);

        const classAOptions = getFieldOptions("CLASSACD", "", fetchedClassData);
        setRequestClassAOptions(classAOptions);

        setRequestEditData((prev) => {
          if (!prev) return prev;

          const resolvedA = resolveOption(classAOptions, prev.classACd, prev.classANm);
          const classBOptions = getFieldOptions("CLASSBCD", resolvedA.value || "", fetchedClassData);
          setRequestClassBOptions(classBOptions);

          const resolvedB = resolveOption(classBOptions, prev.classBCd, prev.classBNm);

          return {
            ...prev,
            classACd: resolvedA.value || "",
            classANm: resolvedA.label || "",
            classBCd: resolvedB.value || "",
            classBNm: resolvedB.label || "",
          };
        });
      } catch (err) {
        console.error("요청 내역 분류 목록 로드 실패:", err);
        errorMsgPopup(err?.response?.data?.message || "분류 목록을 가져오는 중 오류가 발생했습니다.");
      }
    };

    fetchRequestClassData();
  }, [isRequestEdit, requestEditData?.workField]);

  useEffect(() => {
    if (!isRequestEdit) return;

    const workField = requestEditData?.workField;
    const classACd = requestEditData?.classACd;

    if (!workField) {
      setRequestClassBOptions(DEFAULT_SELECT_OPTION);
      return;
    }

    if (workField === "COMMON") {
      setRequestClassBOptions(COMMON_CLASS_OPTIONS);
      return;
    }

    setRequestClassBOptions(getFieldOptions("CLASSBCD", classACd || "", requestClassData));
  }, [isRequestEdit, requestEditData?.workField, requestEditData?.classACd, requestClassData]);

  const handleEditStart = () => {
    if (!detail) return;

    const initialReviewWorkField = resolveWorkFieldValue(
      detail.reviewWorkFieldCode || detail.rvwWorkFieldCode || detail.reviewWorkField || detail.workFieldCode || detail.workField || "",
      detail.reviewWorkFieldNm || detail.rvwWorkFieldNm || detail.workFieldNm || detail.workField || "",
    );

    const initialReviewClassANm =
      detail.reviewClassANm ||
      detail.rvwClassANm ||
      detail.classANm ||
      detail.reviewClassACd ||
      detail.rvwClassAcd ||
      detail.classACd ||
      "";

    const initialReviewClassBNm =
      detail.reviewClassBNm ||
      detail.rvwClassBNm ||
      detail.classBNm ||
      detail.reviewClassBCd ||
      detail.rvwClassBcd ||
      detail.classBCd ||
      "";

    setEditData({
      ...detail,
      reviewerEmpNo: detail.reviewerEmpNo || detail.reviewer || "",
      reviewProjectNm: detail.reviewProjectNm || detail.projectNm || "",
      reviewImproveType: detail.reviewImproveType || detail.improveType || "",
      reviewWorkField: initialReviewWorkField,
      reviewClassANm: initialReviewClassANm,
      reviewClassBNm: initialReviewClassBNm,
      reviewSystemNm: detail.reviewSystemNm || detail.systemNm || "",
      reviewIssueCn: detail.reviewIssueCn || detail.issueCn || "",
      reviewReqCn: detail.reviewReqCn || detail.reqCn || "",
      reviewer: detail.reviewer || user?.empNo || user?.empno || user?.userId || user?.id || user?.name || "",
      reviewDate: detail.reviewDate || getToday(),
      status: detail.status || "RECEIVED",
      progress: clampPercent(detail.progress ?? 0),
      meetingDt: detail.meetingDt || "",
      startDt: detail.startDt || "",
      endDt: detail.endDt || "",
      requestDept: detail.requestDept || "",
    });
    setIsEdit(true);
  };

  const handleEditCancel = () => {
    setIsEdit(false);
    setEditData(null);
  };

  const handleRequestEditStart = () => {
    if (!detail) return;

    const initialWorkField = resolveWorkFieldValue(
      detail.workFieldCode || detail.workField || "",
      detail.workFieldNm || detail.workField || "",
    );

    setRequestEditData({
      ...detail,
      ownerEmpNo: detail.ownerEmpNo || detail.owner || "",
      projectNm: detail.projectNm || "",
      improveType: detail.improveType || "",
      workField: initialWorkField,
      classACd: detail.classACd || detail.classANm || "",
      classANm: detail.classANm || "",
      classBCd: detail.classBCd || detail.classBNm || "",
      classBNm: detail.classBNm || "",
      systemNm: detail.systemNm || "",
      issueCn: detail.issueCn || "",
      reqCn: detail.reqCn || "",
    });
    resetUploadFiles();
    setIsRequestEdit(true);
  };

  const handleRequestEditCancel = () => {
    setIsRequestEdit(false);
    setRequestEditData(null);
    setRequestClassData([]);
    setRequestClassAOptions(DEFAULT_SELECT_OPTION);
    setRequestClassBOptions(DEFAULT_SELECT_OPTION);
    resetUploadFiles();
  };

  const validateReview = () => {
    if (!editData) return false;

    if (!String(editData.reviewProjectNm || "").trim()) {
      errorMsgPopup("요청제목을 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewImproveType || "").trim()) {
      errorMsgPopup("개선유형을 선택해주세요.");
      return false;
    }
    if (!String(editData.reviewWorkField || "").trim()) {
      errorMsgPopup("업무분야를 선택해주세요.");
      return false;
    }
    if (!String(editData.reviewClassANm || "").trim()) {
      errorMsgPopup("대분류를 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewClassBNm || "").trim()) {
      errorMsgPopup("중분류를 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewSystemNm || "").trim()) {
      errorMsgPopup("시스템명을 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewIssueCn || "").trim()) {
      errorMsgPopup("문제사항을 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewReqCn || "").trim()) {
      errorMsgPopup("개선방향을 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewerEmpNo || editData.reviewer || "").trim()) {
      errorMsgPopup("검토자 정보가 없습니다.");
      return false;
    }

    if (editData.meetingDt && editData.startDt && editData.meetingDt > editData.startDt) {
      errorMsgPopup("협의일이 시작일보다 늦을 수 없습니다.");
      return false;
    }
    if (editData.startDt && editData.endDt && editData.startDt > editData.endDt) {
      errorMsgPopup("시작일이 완료(예정)일보다 늦을 수 없습니다.");
      return false;
    }

    return true;
  };

  const validateRequest = () => {
    if (!requestEditData) return false;

    if (!String(requestEditData.projectNm || "").trim()) {
      errorMsgPopup("요청제목을 입력해주세요.");
      return false;
    }
    if (!String(requestEditData.improveType || "").trim()) {
      errorMsgPopup("개선유형을 선택해주세요.");
      return false;
    }
    if (!String(requestEditData.workField || "").trim()) {
      errorMsgPopup("업무분야를 선택해주세요.");
      return false;
    }
    if (!String(requestEditData.classACd || "").trim()) {
      errorMsgPopup("대분류를 선택해주세요.");
      return false;
    }
    if (!String(requestEditData.classBCd || "").trim()) {
      errorMsgPopup("중분류를 선택해주세요.");
      return false;
    }
    if (!String(requestEditData.systemNm || "").trim()) {
      errorMsgPopup("시스템명을 입력해주세요.");
      return false;
    }
    if (!String(requestEditData.issueCn || "").trim()) {
      errorMsgPopup("문제사항을 입력해주세요.");
      return false;
    }
    if (!String(requestEditData.reqCn || "").trim()) {
      errorMsgPopup("개선요청을 입력해주세요.");
      return false;
    }
    if (!String(requestEditData.ownerEmpNo || requestEditData.owner || "").trim()) {
      errorMsgPopup("작성자 정보가 없습니다.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!editData) return;
    if (!validateReview()) return;

    try {
      const payload = {
        gubun: "U",
        projectId: editData.id || editData.projectId || "",
        improvementType: "",
        projectNm: "",
        ownerDept: "",
        owner: "",
        systemNm: "",
        workField: "",
        classACd: "",
        classBCd: "",
        requestDate: "",
        requestDept: editData.requestDept || "",
        issueCn: "",
        reqCn: "",
        meetingDt: editData.meetingDt || "",
        startDt: editData.startDt || "",
        endDt: editData.endDt || "",
        status: editData.status || "RECEIVED",
        progress: clampPercent(editData.progress),
        useYn: "Y",
        reviewer: user?.empNo || user?.empno || user?.userId || user?.id || user?.name || "",
        rvwProjectNm: editData.reviewProjectNm || "",
        rvwImproveType: editData.reviewImproveType || "",
        rvwWorkField: editData.reviewWorkField || "",
        rvwClassAcd: editData.reviewClassANm || "",
        rvwClassBcd: editData.reviewClassBNm || "",
        rvwSystemNm: editData.reviewSystemNm || "",
        rvwIssueCn: editData.reviewIssueCn || "",
        rvwReqCn: editData.reviewReqCn || "",
      };

      const result = await fetchData("project/save", payload);

      const errCd = result?.data?.errCd ?? result?.errCd;
      const errMsg = result?.data?.errMsg ?? result?.errMsg;

      if (errCd !== "00") {
        errorMsgPopup(errMsg || "저장 실패");
        return;
      }

      setIsEdit(false);
      setEditData(null);
      await loadDetail(editData.id || editData.projectId);
      await loadFiles(editData.id || editData.projectId);
    } catch (e) {
      console.error(e);
      errorMsgPopup("저장 중 오류가 발생했습니다.");
    }
  };

  const uploadRequestFiles = async (targetProjectId) => {
    const validFiles = uploadFiles.filter((file) => file != null);

    if (!targetProjectId || validFiles.length === 0) return;

    const formData = new FormData();
    formData.append("gubun", "I");
    formData.append("fileId", "");
    formData.append("projectId", String(targetProjectId));

    validFiles.forEach((file) => {
      formData.append("files", file);
    });

    const uploadResponse = await fetchFileUpload("project/filesave", formData);

    const uploadErrCd = uploadResponse?.data?.errCd ?? uploadResponse?.errCd;
    const uploadErrMsg = uploadResponse?.data?.errMsg ?? uploadResponse?.errMsg;

    if (uploadErrCd !== "00") {
      throw new Error(uploadErrMsg || "파일 업로드 실패");
    }
  };

  const handleRequestSave = async () => {
    if (!requestEditData) return;
    if (!validateRequest()) return;

    setUploading(true);

    try {
      const targetProjectId = requestEditData.id || requestEditData.projectId || projectId || "";

      const payload = {
        gubun: "U",
        projectId: targetProjectId,
        improvementType: requestEditData.improveType || "",
        projectNm: requestEditData.projectNm || "",
        ownerDept: detail?.ownerDept || "",
        owner: requestEditData.ownerEmpNo || detail?.ownerEmpNo || detail?.owner || "",
        systemNm: requestEditData.systemNm || "",
        workField: requestEditData.workField || "",
        classACd: requestEditData.classACd || "",
        classBCd: requestEditData.classBCd || "",
        requestDate: detail?.requestDate || detail?.regDt || getToday(),
        requestDept: detail?.requestDept || "",
        issueCn: requestEditData.issueCn || "",
        reqCn: requestEditData.reqCn || "",
        meetingDt: detail?.meetingDt || "",
        startDt: detail?.startDt || "",
        endDt: detail?.endDt || "",
        status: detail?.status || "",
        progress: clampPercent(detail?.progress ?? 0),
        useYn: "Y",
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

      const result = await fetchData("project/save", payload);

      const errCd = result?.data?.errCd ?? result?.errCd;
      const errMsg = result?.data?.errMsg ?? result?.errMsg;

      if (errCd !== "00") {
        errorMsgPopup(errMsg || "요청 내역 저장 실패");
        return;
      }

      await uploadRequestFiles(targetProjectId);

      setIsRequestEdit(false);
      setRequestEditData(null);
      setRequestClassData([]);
      setRequestClassAOptions(DEFAULT_SELECT_OPTION);
      setRequestClassBOptions(DEFAULT_SELECT_OPTION);
      resetUploadFiles();

      await loadDetail(targetProjectId);
      await loadFiles(targetProjectId);

      msgPopup("요청 내역과 첨부파일이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      errorMsgPopup(e.message || "요청 내역 저장 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      const result = await fetchData("project/save", {
        gubun: "D",
        saveType: "REQUEST",
        projectId,
        improvementType: "",
        projectNm: "",
        ownerDept: "",
        owner: "",
        systemNm: "",
        workField: "",
        classACd: "",
        classBCd: "",
        requestDate: "",
        requestDept: "",
        issueCn: "",
        reqCn: "",
        meetingDt: "",
        startDt: "",
        endDt: "",
        status: "",
        progress: 0,
        useYn: "Y",
        reviewer: "",
        rvwProjectNm: "",
        rvwImproveType: "",
        rvwWorkField: "",
        rvwClassAcd: "",
        rvwClassBcd: "",
        rvwSystemNm: "",
        rvwIssueCn: "",
        rvwReqCn: "",
      });

      const errCd = result?.data?.errCd ?? result?.errCd;
      const errMsg = result?.data?.errMsg ?? result?.errMsg;

      if (errCd !== "00") {
        errorMsgPopup(errMsg || "삭제 실패");
        return;
      }

      setSearchParams({});
      setDetail(null);
      setFiles([]);
      setIsEdit(false);
      setEditData(null);
      setIsRequestEdit(false);
      setRequestEditData(null);
      setRequestClassData([]);
      setRequestClassAOptions(DEFAULT_SELECT_OPTION);
      setRequestClassBOptions(DEFAULT_SELECT_OPTION);
      resetUploadFiles();
    } catch (e) {
      console.error(e);
      errorMsgPopup("삭제 중 오류가 발생했습니다.");
    }
  };

  const fetchFileDetail = async (file) => {
    const result = await fetchData("project/filelist", {
      gubun: "DETAIL",
      projectId: projectId || file.projectId || "",
      fileId: file.fileId,
      debug: "F",
    });

    const errCd = result?.data?.errCd ?? result?.errCd;
    const errMsg = result?.data?.errMsg ?? result?.errMsg;

    if (errCd && errCd !== "00") {
      throw new Error(errMsg || "파일 조회 실패");
    }

    const fileRow = Array.isArray(result?.data) ? result.data[0] : result?.data;

    if (!fileRow) {
      throw new Error("파일 데이터가 없습니다.");
    }

    return fileRow;
  };

  const handleFileClick = async (file) => {
    try {
      const fileDetail = await fetchFileDetail(file);
      const fileName = fileDetail.FILENM || file.fileName || "";
      const fileData = fileDetail.FILEDATA;
      const extension = fileUtils.getFileExtension(fileName)?.toLowerCase();
      const mimeType = fileUtils.mimeTypes[extension] || "application/octet-stream";

      if (!fileData) {
        errorMsgPopup("파일 데이터가 없습니다.");
        return;
      }

      if (fileUtils.isImageFile(file)) {
        const dataUrl = `data:${mimeType};base64,${fileData}`;
        setSelectedImage({ src: dataUrl, fileName });
      } else if (fileUtils.isTextFile(file)) {
        const textContent = fileUtils.decodeBase64ToText(fileData);
        setSelectedText({ content: textContent, fileName });
      } else {
        const link = document.createElement("a");
        link.href = `data:${mimeType};base64,${fileData}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error(e);
      errorMsgPopup(e.message || "파일을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const handleDownload = async (file) => {
    try {
      const fileDetail = await fetchFileDetail(file);
      const fileName = fileDetail.FILENM || file.fileName || "";
      const fileData = fileDetail.FILEDATA;
      const extension = fileUtils.getFileExtension(fileName)?.toLowerCase();
      const mimeType = fileUtils.mimeTypes[extension] || "application/octet-stream";

      if (!fileData) {
        errorMsgPopup("다운로드할 파일 데이터가 없습니다.");
        return;
      }

      const link = document.createElement("a");
      link.href = `data:${mimeType};base64,${fileData}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      errorMsgPopup("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleDownloadAll = async () => {
    if (files.length === 0) {
      errorMsgPopup("다운로드할 파일이 없습니다.");
      return;
    }

    for (const file of files) {
      await handleDownload(file);
    }
  };

  const handleAddUploadFileInput = () => {
    const validFilesCount = uploadFiles.filter((file) => file != null).length;

    if (validFilesCount + uploadFileInputs.length < fileUtils.getMaxFiles()) {
      setUploadFileInputs((prev) => [...prev, { id: Date.now() }]);
      setUploadFiles((prev) => [...prev, null]);
    }
  };

  const handleRemoveUploadFileInput = (id) => {
    const index = uploadFileInputs.findIndex((input) => input.id === id);
    if (index === -1) return;

    if (uploadFileInputs.length > 1) {
      setUploadFileInputs((prev) => prev.filter((input) => input.id !== id));
      setUploadFiles((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    resetUploadFiles();
  };

  const handleUploadFileChange = (id, e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > fileUtils.getMaxFileSize()) {
      errorMsgPopup(`파일 크기는 ${fileUtils.formatFileSize(fileUtils.getMaxFileSize())}를 초과할 수 없습니다.`);
      return;
    }

    if (!fileUtils.isValidFile(selectedFile)) {
      errorMsgPopup("문서 파일(pdf, doc, docx, xls, xlsx, ppt, pptx)만 업로드 가능합니다.");
      return;
    }

    const index = uploadFileInputs.findIndex((input) => input.id === id);
    if (index === -1) return;

    setUploadFiles((prev) => {
      const next = [...prev];
      next[index] = selectedFile;
      return next;
    });
  };

  const getFileIcon = (file) => {
    return <i className={`bi ${fileUtils.getFileIcon(file)} me-2`} />;
  };

  const right = isEdit ? editData : detail;
  const requestView = isRequestEdit ? requestEditData : detail;

  const reviewView = useMemo(() => {
    if (isEdit) return editData;

    return {
      ...detail,
      reviewProjectNm: detail?.reviewProjectNm || detail?.projectNm || "",
      reviewImproveType: detail?.reviewImproveType || detail?.improveType || "",
      reviewWorkField: resolveWorkFieldLabel(
        detail?.reviewWorkFieldCode ||
          detail?.rvwWorkFieldCode ||
          detail?.reviewWorkField ||
          detail?.RVW_WORKFIELDCODE ||
          detail?.RVW_WORKFIELD ||
          detail?.workFieldCode ||
          detail?.workField ||
          "",
        detail?.reviewWorkFieldNm ||
          detail?.rvwWorkFieldNm ||
          detail?.RVW_WORKFIELD ||
          detail?.reviewWorkField ||
          detail?.workFieldNm ||
          detail?.workField ||
          "",
      ),
      reviewClassANm:
        detail?.reviewClassANm ||
        detail?.rvwClassANm ||
        detail?.classANm ||
        detail?.reviewClassACd ||
        detail?.rvwClassAcd ||
        detail?.classACd ||
        "",
      reviewClassBNm:
        detail?.reviewClassBNm ||
        detail?.rvwClassBNm ||
        detail?.classBNm ||
        detail?.reviewClassBCd ||
        detail?.rvwClassBcd ||
        detail?.classBCd ||
        "",
      reviewSystemNm: detail?.reviewSystemNm || detail?.systemNm || "",
      reviewIssueCn: detail?.reviewIssueCn || detail?.issueCn || "",
      reviewReqCn: detail?.reviewReqCn || detail?.reqCn || "",
      requestDept: detail?.requestDept || "",
      reviewerEmpNo: detail?.reviewerEmpNo || detail?.reviewer || "",
      reviewer: detail?.reviewer || "",
      reviewDate: detail?.reviewDate || getToday(),
      status: detail?.status || "RECEIVED",
      progress: detail?.progress ?? 0,
      meetingDt: detail?.meetingDt || "",
      startDt: detail?.startDt || "",
      endDt: detail?.endDt || "",
    };
  }, [detail, editData, isEdit]);

  const requestFields = [
    {
      key: "projectNm",
      label: "요청제목",
      type: "text",
      maxLength: 200,
      readonly: (data) => data.projectNm,
    },
    {
      key: "improveType",
      label: "개선유형",
      type: "select",
      options: IMPROVETYPE_OPTIONS.filter((o) => o.value),
      readonly: (data) => COMMON_LABEL(data.improveType),
    },
    {
      key: "workField",
      label: "업무분야",
      type: "select",
      options: WORKFIELD_OPTIONS.filter((o) => o.value),
      readonly: (data) => COMMON_LABEL(data.workField),
    },
    {
      key: "classACd",
      label: "대분류",
      type: "select",
      options: requestClassAOptions,
      readonly: (data) => data.classANm || COMMON_LABEL(data.classACd),
    },
    {
      key: "classBCd",
      label: "중분류",
      type: "select",
      options: requestClassBOptions,
      readonly: (data) => data.classBNm || COMMON_LABEL(data.classBCd),
    },
    {
      key: "systemNm",
      label: "시스템명",
      type: "text",
      maxLength: 100,
      readonly: (data) => data.systemNm,
    },
    {
      key: "issueCn",
      label: "문제사항",
      type: "textarea",
      rows: 5,
      full: true,
      readonly: (data) => data.issueCn,
    },
    {
      key: "reqCn",
      label: "개선요청",
      type: "textarea",
      rows: 5,
      full: true,
      readonly: (data) => data.reqCn,
    },
  ];

  const reviewFields = [
    {
      key: "reviewProjectNm",
      label: "요청제목",
      type: "text",
      maxLength: 200,
      readonly: (data) => data.reviewProjectNm,
    },
    {
      key: "reviewIssueCn",
      label: "문제사항",
      type: "textarea",
      rows: 5,
      full: true,
      readonly: (data) => data.reviewIssueCn,
    },
    {
      key: "reviewReqCn",
      label: "개선방향",
      type: "textarea",
      rows: 5,
      full: true,
      readonly: (data) => data.reviewReqCn,
    },
    {
      key: "requestDept",
      label: "협의부서",
      type: "text",
      maxLength: 100,
      readonly: (data) => data.requestDept,
    },
    {
      key: "meetingDt",
      label: "협의일",
      type: "day",
      placeholder: "협의일 선택",
      readonly: (data) => data.meetingDt,
    },
    {
      key: "startDt",
      label: "시작(예정)일",
      type: "startday",
      placeholder: "시작일 선택",
      readonly: (data) => data.startDt,
    },
    {
      key: "endDt",
      label: "완료(예정)일",
      type: "endday",
      placeholder: "완료일 선택",
      readonly: (data) => data.endDt,
    },
    {
      key: "status",
      label: "상태",
      type: "select",
      options: STATUS_OPTIONS.filter((o) => o.value),
      readonly: (data) => STATUS_LABEL[data.status] ?? data.status,
    },
  ];

  const handleFieldChange = (key, value) => {
    setEditData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRequestFieldChange = (key, value) => {
    if (key === "workField") {
      setRequestEditData((prev) => ({
        ...prev,
        workField: value,
        classACd: "",
        classBCd: "",
        classANm: "",
        classBNm: "",
      }));

      setRequestClassData([]);
      setRequestClassAOptions(DEFAULT_SELECT_OPTION);
      setRequestClassBOptions(DEFAULT_SELECT_OPTION);
      return;
    }

    if (key === "classACd") {
      const nextClassBOptions = value === "COMMON" ? COMMON_CLASS_OPTIONS : getFieldOptions("CLASSBCD", value, requestClassData);

      setRequestClassBOptions(nextClassBOptions);

      const selectedClassA = requestClassAOptions.find((option) => option.value === value);

      setRequestEditData((prev) => ({
        ...prev,
        classACd: value,
        classANm: selectedClassA?.label || "",
        classBCd: "",
        classBNm: "",
      }));
      return;
    }

    if (key === "classBCd") {
      const selectedClassB = requestClassBOptions.find((option) => option.value === value);

      setRequestEditData((prev) => ({
        ...prev,
        classBCd: value,
        classBNm: selectedClassB?.label || "",
      }));
      return;
    }

    setRequestEditData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className={styles.container}>
      <div className="boardSection">
        <h2
          className="boardTitle"
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>검토 내역은 담당 부서 검토 후 작성됩니다.</span>

          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearchParams({})}>
            목록
          </button>
        </h2>

        {!isAuthed ? (
          <div className="list-group-item nodata">로그인 정보 확인 중...</div>
        ) : detailLoading ? (
          <div className="text-center">상세 로딩 중...</div>
        ) : !detail || !right || !reviewView ? (
          <div className="list-group-item nodata">상세 데이터가 없습니다.</div>
        ) : (
          <div className="list-group contentContainer" style={{ padding: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                alignItems: "start",
              }}
            >
              <div style={cardStyle}>
                <SectionTitle
                  right={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {!isRequestEdit ? (
                        <button className="btn btn-outline-secondary btn-sm" onClick={handleRequestEditStart} disabled={!detail || isEdit}>
                          요청 내역 수정
                        </button>
                      ) : (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={handleRequestEditCancel} disabled={uploading}>
                            취소
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={handleRequestSave} disabled={uploading}>
                            {uploading ? "저장 중..." : "저장"}
                          </button>
                        </>
                      )}
                    </div>
                  }
                >
                  요청 내역
                </SectionTitle>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: themeStyle.bodyColor,
                    wordBreak: "break-word",
                  }}
                >
                  {requestView?.projectNm || "-"}
                </div>

                <MetaRow
                  left={`등록자 ${detail.ownerDept ? `${detail.ownerDept}(${detail.owner || "-"})` : detail.owner || "-"}`}
                  right={`등록일 ${detail.requestDate || detail.regDt || "-"}`}
                />

                {requestFields.map((field) => (
                  <LabelValue key={field.key} label={field.label}>
                    {isRequestEdit && field.type !== "readonly" ? (
                      <EditField
                        field={field}
                        value={requestView?.[field.key]}
                        onChange={(value) => handleRequestFieldChange(field.key, value)}
                      />
                    ) : (
                      <ReadonlyBox value={field.readonly ? field.readonly(requestView) : requestView?.[field.key]} />
                    )}
                  </LabelValue>
                ))}

                <div style={{ marginTop: 28 }}>
                  <SectionTitle
                    right={
                      <button className="btn btn-sm btn-primary" onClick={handleDownloadAll} disabled={fileLoading || files.length === 0}>
                        전체 다운로드
                      </button>
                    }
                  >
                    첨부파일
                  </SectionTitle>
                </div>

                {fileLoading ? (
                  <div className="text-center">파일 목록 로딩 중...</div>
                ) : files.length === 0 ? (
                  <div className="list-group-item nodata">첨부파일이 없습니다.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {files.map((file) => (
                      <div key={file.fileId} style={fileItemStyle}>
                        <button type="button" style={fileLinkButtonStyle} onClick={() => handleFileClick(file)} title={file.fileName}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              minWidth: 0,
                            }}
                          >
                            {getFileIcon(file)}
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {file.fileName || "-"}
                            </span>
                          </div>
                        </button>

                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleDownload(file)}>
                          다운로드
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isRequestEdit && (
                  <div style={{ marginTop: 30 }}>
                    <div style={{ color: themeStyle.secondaryColor, fontSize: 13, marginBottom: 8 }}>
                      ※ 개선이 필요한 화면 및 절차 등의 파일을 첨부해주세요
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      파일 추가
                      <span style={{ color: themeStyle.secondaryColor, fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
                        (최대 {fileUtils.getMaxFiles()}개, {fileUtils.formatFileSize(fileUtils.getMaxFileSize())}까지, 문서 파일만 가능)
                      </span>
                    </div>

                    {uploadFileInputs.map((input, index) => (
                      <div key={input.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input
                          type="file"
                          className="form-control"
                          onChange={(e) => handleUploadFileChange(input.id, e)}
                          accept={fileUtils.getAccept()}
                          disabled={uploading}
                        />

                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => handleRemoveUploadFileInput(input.id)}
                          disabled={uploading}
                        >
                          -
                        </button>

                        {index === uploadFileInputs.length - 1 && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={handleAddUploadFileInput}
                            disabled={uploading || uploadFileInputs.length >= fileUtils.getMaxFiles()}
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}

                    {uploadFiles.some((file) => file != null) && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>선택된 파일</div>
                        <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                          {uploadFiles.map(
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
                )}
              </div>

              <div style={cardStyle}>
                <SectionTitle
                  right={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {!isEdit ? (
                        <>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={handleEditStart}
                            disabled={!detail || isRequestEdit}
                          >
                            {detail?.reviewProjectNm ? "검토 수정" : "검토 작성"}
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={handleDelete} disabled={!detail || isRequestEdit}>
                            삭제
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={handleEditCancel}>
                            취소
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={handleSave}>
                            저장
                          </button>
                        </>
                      )}
                    </div>
                  }
                >
                  검토 내역
                </SectionTitle>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: themeStyle.bodyColor,
                    wordBreak: "break-word",
                  }}
                >
                  {reviewView.reviewProjectNm || detail.projectNm || "-"}
                </div>

                <MetaRow left={`검토자 ${reviewView.reviewer || "-"}`} right={`최종 검토일 ${reviewView.reviewDate || "-"}`} />

                {reviewFields.map((field) => (
                  <LabelValue key={field.key} label={field.label} full={field.full}>
                    {isEdit && field.type !== "readonly" ? (
                      <EditField field={field} value={reviewView?.[field.key]} onChange={(value) => handleFieldChange(field.key, value)} />
                    ) : (
                      <ReadonlyBox value={field.readonly ? field.readonly(reviewView) : reviewView?.[field.key]} />
                    )}
                  </LabelValue>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedImage && (
          <ImageViewPopup
            show={!!selectedImage}
            onClose={closeImagePopup}
            imageSrc={selectedImage.src}
            title={selectedImage.fileName}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
        )}

        {selectedText && (
          <TextViewPopup show={!!selectedText} onClose={closeTextPopup} title={selectedText.fileName} content={selectedText.content} />
        )}
      </div>
    </div>
  );
};

export default ProjectManageDetail;
