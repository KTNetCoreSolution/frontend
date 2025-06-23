import React from "react";
import styles from "./TableSearch.module.css";

const TableTitle = ({ rowCount }) => {
  return (
    <div className={styles.tableTitleRow}>
      <div className={styles.tableTitle}>
        <span className={styles.resultText}>결과 (</span>
        <span className={styles.rowCountText}>{rowCount} Rows</span>
        <span className={styles.resultText}>)</span>
      </div>
    </div>
  );
};

export default TableTitle;