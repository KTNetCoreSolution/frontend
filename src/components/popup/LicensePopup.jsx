import React, { useState, useEffect } from "react";
import CommonPopup from "./CommonPopup";
import styles from "./LicensePopup.module.css";
import { fetchJsonData } from "../../utils/dataUtils";
import license from '../../data/license.json';

const LicensePopup = ({ show, onHide }) => {
  const [licenseData, setLicenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLicenseData = async () => {
      try {
        // Fetch client-side license data
        const clientResult = await fetchJsonData(license);
        const clientDataArray = Array.isArray(clientResult) ? clientResult : [clientResult];

        setLicenseData(clientDataArray);
      } catch (err) {
        setLicenseData([]);
        setError("데이터 로드 실패: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (show) {
      loadLicenseData();
    }
  }, [show]);

  return (
    <CommonPopup
      show={show}
      onHide={onHide}
      title="License Information"
      buttons={[
        {
          label: "Close",
          className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`,
          action: onHide,
        },
      ]}
    >
      <div className={styles.licenseContent}>
        {loading && <p>Loading...</p>}
        {error && <p className="text-danger">{error}</p>}
        {!loading && !error && (
          <>
            <h5>Software License Information</h5>
            <p>This application uses the following open-source libraries:</p>
            <ul>
              {licenseData.map((item, index) => (
                <li key={index}>
                  {item.name} - {item.license}
                  <br />
                  Copyright (c) {item.copyright}
                  <br />
                  <a
                    href={item.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.name} Repository
                  </a>
                </li>
              ))}
            </ul>
            <p>
              This application adheres to all provided open-source license terms.
              For detailed license information, please refer to the respective
              documentation of each library.
            </p>
          </>
        )}
      </div>
    </CommonPopup>
  );
};

export default LicensePopup;