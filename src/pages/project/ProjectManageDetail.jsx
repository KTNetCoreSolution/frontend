import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useStore from "../../store/store";
import styles from "../../components/table/TableSearch.module.css";
import { fetchData } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
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

const LabelValue = ({ label, children, full = false }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: full ? "160px 1fr" : "140px 1fr",
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
        />
      );

    case "select":
      return (
        <select className="form-select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
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
      return <CommonDateInput type={field.type} value={value || ""} onChange={onChange} placeholder={field.placeholder} />;

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

  const [files, setFiles] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

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
      return;
    }

    loadDetail(projectId);
    loadFiles(projectId);
  }, [projectId, isAuthed]);

  const handleEditStart = () => {
    if (!detail) return;

    setEditData({
      ...detail,
      reviewProjectNm: detail.reviewProjectNm || detail.projectNm || "",
      reviewImproveType: detail.reviewImproveType || detail.improveType || "",
      reviewWorkField: detail.reviewWorkField || detail.workField || "",
      reviewClassANm: detail.reviewClassANm || detail.classANm || "",
      reviewClassBNm: detail.reviewClassBNm || detail.classBNm || "",
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
      errorMsgPopup("대분류 코드가 없습니다.");
      return false;
    }
    if (!String(editData.reviewClassBNm || "").trim()) {
      errorMsgPopup("중분류 코드가 없습니다.");
      return false;
    }
    if (!String(editData.reviewSystemNm || "").trim()) {
      errorMsgPopup("시스템명을 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewIssueCn || "").trim()) {
      errorMsgPopup("문제점/이슈사항을 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewReqCn || "").trim()) {
      errorMsgPopup("개선방향을 입력해주세요.");
      return false;
    }
    if (!String(editData.reviewer || "").trim()) {
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

  const handleSave = async () => {
    if (!editData) return;
    if (!validateReview()) return;

    try {
      const payload = {
        gubun: "U",
        projectId: editData.id || "",
        improvementType: detail?.improveType || "",
        projectNm: detail?.projectNm || "",
        ownerDept: detail?.ownerDept || "",
        owner: detail?.owner || "",
        systemNm: detail?.systemNm || "",
        workField: detail?.workField || "",
        classACd: detail?.classACd || "",
        classBCd: detail?.classBCd || "",
        requestDate: detail?.requestDate || detail?.regDt || getToday(),
        requestDept: editData.requestDept || "",
        issueCn: detail?.issueCn || "",
        reqCn: detail?.reqCn || "",
        meetingDt: editData.meetingDt || "",
        startDt: editData.startDt || "",
        endDt: editData.endDt || "",
        status: editData.status || "RECEIVED",
        progress: clampPercent(editData.progress),
        useYn: "Y",
        reviewer: editData.reviewer || "",
        rvwProjectNm: editData.reviewProjectNm || "",
        rvwImproveType: editData.reviewImproveType || "",
        rvwWorkField: editData.reviewWorkField || "",
        rvwClassAcd: editData.reviewClassANm || detail?.classACd || "",
        rvwClassBcd: editData.reviewClassBNm || detail?.classBCd || "",
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
      await loadDetail(editData.id);
      await loadFiles(editData.id);
    } catch (e) {
      console.error(e);
      errorMsgPopup("저장 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      const result = await fetchData("project/save", {
        gubun: "D",
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

  const getFileIcon = (file) => {
    return <i className={`bi ${fileUtils.getFileIcon(file)} me-2`} />;
  };

  const right = isEdit ? editData : detail;

  const reviewView = useMemo(() => {
    if (isEdit) return editData;

    return {
      ...detail,
      reviewProjectNm: detail?.reviewProjectNm || detail?.projectNm || "",
      reviewImproveType: detail?.reviewImproveType || detail?.improveType || "",
      reviewWorkField: detail?.reviewWorkField || detail?.workField || "",
      reviewClassANm: detail?.reviewClassANm || detail?.classANm || "",
      reviewClassBNm: detail?.reviewClassBNm || detail?.classBNm || "",
      reviewSystemNm: detail?.reviewSystemNm || detail?.systemNm || "",
      reviewIssueCn: detail?.reviewIssueCn || detail?.issueCn || "",
      reviewReqCn: detail?.reviewReqCn || detail?.reqCn || "",
      requestDept: detail?.requestDept || "",
      reviewer: detail?.reviewer || "",
      reviewDate: detail?.reviewDate || getToday(),
      status: detail?.status || "RECEIVED",
      progress: detail?.progress ?? 0,
      meetingDt: detail?.meetingDt || "",
      startDt: detail?.startDt || "",
      endDt: detail?.endDt || "",
    };
  }, [detail, editData, isEdit]);

  const reviewFields = [
    {
      key: "reviewProjectNm",
      label: "요청제목",
      type: "text",
      maxLength: 200,
      readonly: (data) => data.reviewProjectNm,
    },
    {
      key: "reviewImproveType",
      label: "개선유형",
      type: "select",
      options: IMPROVETYPE_OPTIONS.filter((o) => o.value),
      readonly: (data) => COMMON_LABEL(data.reviewImproveType),
    },
    {
      key: "reviewWorkField",
      label: "업무분야",
      type: "select",
      options: WORKFIELD_OPTIONS.filter((o) => o.value),
      readonly: (data) => COMMON_LABEL(data.reviewWorkField),
    },
    {
      key: "reviewClassANm",
      label: "대분류",
      type: "text",
      maxLength: 100,
      readonly: (data) => COMMON_LABEL(data.reviewClassANm),
    },
    {
      key: "reviewClassBNm",
      label: "중분류",
      type: "text",
      maxLength: 100,
      readonly: (data) => COMMON_LABEL(data.reviewClassBNm),
    },
    {
      key: "reviewSystemNm",
      label: "시스템명",
      type: "text",
      maxLength: 100,
      readonly: (data) => data.reviewSystemNm,
    },
    {
      key: "reviewIssueCn",
      label: "문제점/이슈사항",
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
      label: "시작일",
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
          <span>시스템 개선 요청 상세</span>

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
                <SectionTitle>요청 내역</SectionTitle>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: themeStyle.bodyColor,
                    wordBreak: "break-word",
                  }}
                >
                  {detail.projectNm || "-"}
                </div>

                <MetaRow
                  left={`등록자 ${detail.ownerDept ? `${detail.ownerDept}(${detail.owner || "-"})` : detail.owner || "-"}`}
                  right={`등록일 ${detail.requestDate || detail.regDt || "-"}`}
                />

                <LabelValue label="개선유형">
                  <ReadonlyBox value={COMMON_LABEL(detail.improveType)} />
                </LabelValue>

                <LabelValue label="업무분야">
                  <ReadonlyBox value={COMMON_LABEL(detail.workField)} />
                </LabelValue>

                <LabelValue label="대분류">
                  <ReadonlyBox value={COMMON_LABEL(detail.classANm)} />
                </LabelValue>

                <LabelValue label="중분류">
                  <ReadonlyBox value={COMMON_LABEL(detail.classBNm)} />
                </LabelValue>

                <LabelValue label="시스템명">
                  <ReadonlyBox value={detail.systemNm} />
                </LabelValue>

                <LabelValue label="문제점/이슈사항" full>
                  <ReadonlyBox value={detail.issueCn} />
                </LabelValue>

                <LabelValue label="개선방향" full>
                  <ReadonlyBox value={detail.reqCn} />
                </LabelValue>
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
                          <button className="btn btn-outline-secondary btn-sm" onClick={handleEditStart} disabled={!detail}>
                            {detail?.reviewProjectNm ? "검토 수정" : "검토 작성"}
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={handleDelete} disabled={!detail}>
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

                <MetaRow left={`검토자 ${reviewView.reviewer || "-"}`} right={`검토일 ${reviewView.reviewDate || "-"}`} />

                {reviewFields.map((field) => (
                  <LabelValue key={field.key} label={field.label} full={field.full}>
                    {isEdit ? (
                      <EditField field={field} value={reviewView?.[field.key]} onChange={(value) => handleFieldChange(field.key, value)} />
                    ) : (
                      <ReadonlyBox value={field.readonly ? field.readonly(reviewView) : reviewView?.[field.key]} />
                    )}
                  </LabelValue>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: 20 }}>
              <SectionTitle
                right={
                  <button className="btn btn-sm btn-primary" onClick={handleDownloadAll} disabled={fileLoading || files.length === 0}>
                    전체 다운로드
                  </button>
                }
              >
                첨부파일
              </SectionTitle>

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
