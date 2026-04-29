import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useStore from "../../store/store";
import MainSearch from "../../components/main/MainSearch";
import TableSearch from "../../components/table/TableSearch";
import styles from "../../components/table/TableSearch.module.css";
import { createTable } from "../../utils/tableConfig";
import { initialFilters } from "../../utils/tableEvent";
import { handleDownloadExcel } from "../../utils/tableExcel";
import { fetchData } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import ProjectCreate from "./ProjectCreate";
import { STATUS_LABEL, STATUS_OPTIONS, IMPROVETYPE_OPTIONS, SYSTEM_OPTIONS } from "./projectManage.constants";

const ProjectManageList = () => {
  const { user } = useStore();
  const [, setSearchParams] = useSearchParams();
  const isAuthed = !!user;

  const [showCreate, setShowCreate] = useState(false);

  const searchConfig = useMemo(
    () => ({
      areas: [
        {
          type: "search",
          fields: [
            {
              id: "projectNm",
              type: "text",
              row: 1,
              label: "요청제목",
              labelVisible: true,
              placeholder: "요청제목 검색",
              maxLength: 200,
              width: "220px",
              enabled: true,
            },
            {
              id: "OWNER",
              type: "text",
              row: 1,
              label: "등록자",
              labelVisible: true,
              placeholder: "등록자 검색",
              maxLength: 150,
              width: "150px",
              enabled: true,
            },
            {
              id: "improveType",
              type: "select",
              row: 1,
              label: "개선유형",
              labelVisible: true,
              options: [{ value: "", label: "전체" }, ...IMPROVETYPE_OPTIONS.filter((v) => v.value)],
              width: "150px",
              enabled: true,
            },
            // {
            //   id: "workField",
            //   type: "select",
            //   row: 1,
            //   label: "업무분야",
            //   labelVisible: true,
            //   options: [{ value: "", label: "전체" }, ...WORKFIELD_OPTIONS.filter((v) => v.value)],
            //   width: "150px",
            //   enabled: true,
            // },
            {
              id: "status",
              type: "select",
              row: 1,
              label: "진행상태",
              labelVisible: true,
              options: [{ value: "", label: "전체" }, ...STATUS_OPTIONS.filter((v) => v.value)],
              width: "150px",
              enabled: true,
            },
            {
              id: "systemNm",
              type: "select",
              row: 1,
              label: "시스템",
              labelVisible: true,
              options: [{ value: "", label: "전체" }, ...SYSTEM_OPTIONS.filter((v) => v.value)],
              width: "180px",
              enabled: true,
            },
          ],
        },
        {
          type: "buttons",
          fields: [
            { id: "searchBtn", type: "button", row: 1, label: "검색", eventType: "search", width: "80px", enabled: true },
            { id: "resetBtn", type: "button", row: 1, label: "초기화", eventType: "reset", width: "80px", enabled: true },
            { id: "createBtn", type: "button", row: 1, label: "개선요청 신규등록", eventType: "create", width: "100px", enabled: true },
          ],
        },
      ],
    }),
    [],
  );

  const [filters, setFilters] = useState(() => initialFilters(searchConfig.areas.find((a) => a.type === "search").fields));

  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const latestFiltersRef = useRef(filters);

  const [tableStatus, setTableStatus] = useState("initializing");
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [data, setData] = useState([]);

  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  const columns = useMemo(
    () => [
      {
        title: "대분류",
        field: "CLASSANM",
        width: 120,
        headerHozAlign: "center",
        hozAlign: "center",
        formatter: (cell) => {
          const row = cell.getRow().getData();
          return cell.getValue() || (row.CLASSACD === "COMMON" ? "공통" : "");
        },
      },
      {
        title: "중분류",
        field: "CLASSBNM",
        width: 120,
        headerHozAlign: "center",
        hozAlign: "center",
        formatter: (cell) => {
          const row = cell.getRow().getData();
          return cell.getValue() || (row.CLASSBCD === "COMMON" ? "공통" : "");
        },
      },
      { title: "시스템명", field: "SYSTEMNM", width: 120, headerHozAlign: "center", hozAlign: "center" },
      { title: "요청제목", field: "PROJECTNM", width: 280, headerHozAlign: "center" },
      {
        title: "상태",
        field: "STATUS",
        width: 80,
        headerHozAlign: "center",
        hozAlign: "center",
        formatter: (cell) => STATUS_LABEL[cell.getValue()] ?? cell.getValue(),
      },
      { title: "검토유형", field: "REVIEWTYPE", width: 80, headerHozAlign: "center", hozAlign: "center" },
      { title: "개선분류", field: "IMPROVEMETHOD", width: 100, headerHozAlign: "center", hozAlign: "center" },
      { title: "요청일", field: "REQUESTDATE", width: 100, headerHozAlign: "center", hozAlign: "center" },
      { title: "최초 검토일", field: "MEETINGDT", width: 100, headerHozAlign: "center", hozAlign: "center" },
      { title: "최종 검토일", field: "REVIEWDATE", width: 100, headerHozAlign: "center", hozAlign: "center" },
      { title: "시작(예정)일", field: "STARTDT", width: 100, headerHozAlign: "center", hozAlign: "center" },
      { title: "완료(예정)일", field: "ENDDT", width: 100, headerHozAlign: "center", hozAlign: "center" },
      { title: "문제사항", field: "ISSUECN", width: 320, headerHozAlign: "center" },
      { title: "개선요청", field: "REQCN", width: 320, headerHozAlign: "center" },
      { title: "개선유형", field: "IMPROVETYPE", width: 80, headerHozAlign: "center", hozAlign: "center" },
      { title: "업무분야", field: "WORKFIELD", width: 80, headerHozAlign: "center", hozAlign: "center" },
      { title: "등록자소속", field: "OWNERDEPT", width: 100, headerHozAlign: "center", hozAlign: "center" },
      { title: "등록자", field: "OWNER", width: 80, headerHozAlign: "center", hozAlign: "center" },
      {
        title: "No.",
        field: "PROJECTID",
        width: 100,
        headerHozAlign: "center",
        hozAlign: "center",
        sorter: (a, b) => {
          const parseProjectId = (value) => {
            const [prefix = "0", suffix = "0"] = String(value ?? "").split("-");
            return [Number(prefix), Number(suffix)];
          };

          const [aPrefix, aSuffix] = parseProjectId(a);
          const [bPrefix, bSuffix] = parseProjectId(b);

          if (aPrefix !== bPrefix) return aPrefix - bPrefix;
          return aSuffix - bSuffix;
        },
      },
      { title: "검토자", field: "REVIEWER", width: 80, headerHozAlign: "center", hozAlign: "center" },
      { title: "검토제목", field: "REVIEWPROJECTNM", width: 280, headerHozAlign: "center" },
      // { title: "검토 개선유형", field: "REVIEWIMPROVETYPE", width: 100, headerHozAlign: "center", hozAlign: "center" },
      // { title: "검토 업무분야", field: "REVIEWWORKFIELD", width: 100, headerHozAlign: "center", hozAlign: "center" },
      // {
      //   title: "검토 대분류",
      //   field: "REVIEWCLASSACD",
      //   width: 120,
      //   headerHozAlign: "center",
      //   hozAlign: "center",
      // },
      // {
      //   title: "검토 중분류",
      //   field: "REVIEWCLASSBCD",
      //   width: 120,
      //   headerHozAlign: "center",
      //   hozAlign: "center",
      // },
      // { title: "검토 시스템명", field: "REVIEWSYSTEMNM", width: 120, headerHozAlign: "center", hozAlign: "center" },
      { title: "검토 문제사항", field: "REVIEWISSUECN", width: 320, headerHozAlign: "center" },
      { title: "개선방향", field: "REVIEWREQCN", width: 320, headerHozAlign: "center" },
      { title: "검토부서", field: "REQUESTDEPT", width: 100, headerHozAlign: "center", hozAlign: "center" },
    ],
    [],
  );

  const loadList = async () => {
    if (!isAuthed) return;

    setLoading(true);
    try {
      const f = latestFiltersRef.current;

      const result = await fetchData("project/list", {
        gubun: "LIST",
        projectId: "",
        debug: "F",
        projectNm: f.projectNm || "",
        owner: f.OWNER || "",
        improveType: f.improveType || "",
        workField: f.workField || "",
        status: f.status || "",
        requestDept: f.requestDept || "",
        systemNm: f.systemNm || "",
      });

      const errCd = result?.data?.errCd ?? result?.errCd;
      const errMsg = result?.data?.errMsg ?? result?.errMsg;

      if (errCd && errCd !== "00") {
        errorMsgPopup(errMsg || "시스템 개선 요청 목록 조회 실패");
        setData([]);
        setRowCount(0);
        return;
      }

      const list = Array.isArray(result?.data) ? result.data : [];
      setData(list);
    } catch (e) {
      console.error(e);
      errorMsgPopup("시스템 개선 요청 목록을 불러오는 중 오류가 발생했습니다.");
      setData([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (!tableRef.current) return;

      try {
        tableInstance.current = createTable(tableRef.current, columns, [], {
          headerHozAlign: "center",
          layout: "fitColumns",
          initialSort: [{ column: "PROJECTID", dir: "desc" }],
        });

        setTableStatus("ready");

        tableInstance.current.on("rowClick", (e, row) => {
          const rowData = row.getData();
          const id = rowData?.PROJECTID;
          if (!id) return;
          setSearchParams({ projectId: String(id) });
        });
      } catch (err) {
        console.error("테이블 초기화 실패:", err);
        setTableStatus("error");
      }
    };

    init();

    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus("initializing");
      }
    };
  }, [columns, setSearchParams]);

  useEffect(() => {
    const table = tableInstance.current;
    if (!table || tableStatus !== "ready") return;

    table.setData(data);
    const cnt = table.getDataCount ? table.getDataCount() : (data?.length ?? 0);
    setRowCount(cnt);
  }, [data, tableStatus]);

  useEffect(() => {
    if (!isAuthed) return;
    loadList();
  }, [isAuthed]);

  const handleDynamicEvent = (eventType) => {
    if (eventType === "search") {
      loadList();
    } else if (eventType === "reset") {
      setFilters(initialFilters(searchConfig.areas.find((a) => a.type === "search").fields));
      setData([]);
      setRowCount(0);
      setSearchParams({});
    } else if (eventType === "create") {
      setShowCreate(true);
    }
  };

  return (
    <div className={styles.container}>
      <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />

      <TableSearch
        filterFields={[]}
        filters={{}}
        setFilters={() => {}}
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "시스템개선요청목록.xlsx")}
        rowCount={rowCount}
        onEvent={handleDynamicEvent}
      />

      <div className={styles.tableWrapper}>
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div
          ref={tableRef}
          className={styles.tableSection}
          style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }}
        />
      </div>

      {showCreate && (
        <ProjectCreate
          show={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadList();
          }}
        />
      )}
    </div>
  );
};

export default ProjectManageList;
