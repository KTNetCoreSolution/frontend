import React, { useState, useEffect } from "react";
import CommonPopup from "./CommonPopup";
import styles from "./LicensePopup.module.css";
import { fetchJsonData, fetchDataGet } from "../../utils/dataUtils";
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

        // Fetch server-side license data
        const serverResponse = await fetchDataGet("public/licenses/info");
        if (!serverResponse.success && serverResponse.errMsg) {
          console.error(serverResponse.errMsg);
          throw new Error(serverResponse.errMsg || "Server license data fetch failed");
        }
        const serverDataArray = Array.isArray(serverResponse.data) ? serverResponse.data : [];

        // Normalize and combine data
        const normalizedClientData = clientDataArray.map(item => ({
          name: item.name,
          license: item.license,
          copyright: item.copyright,
          repository: item.repository
        }));

        const normalizedServerData = serverDataArray.map(item => ({
          name: item.library,
          license: item.license,
          copyright: item.copyright,
          repository: item.url
        }));

        // Combine and sort by name
        const combinedData = [...normalizedClientData, ...normalizedServerData].sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setLicenseData(combinedData);
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