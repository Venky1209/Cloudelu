import React, { useState } from "react";

const Filter = ({ accounts }) => {
  const [selectedAccount, setSelectedAccount] = useState(null); // Holds the selected account

  const handleSelectChange = (e) => {
    const selectedName = e.target.value;
    const account = accounts.find((acc) => acc.targetName === selectedName);
    setSelectedAccount(account); // Set selected account's data
  };

  return (
    <div>
      {/* Dropdown to list all target names */}
      {accounts.length > 0 ? (
        <>
          <label>Select an Account: </label>
          <select onChange={handleSelectChange} defaultValue="">
            <option value="" disabled>Select an account</option>
            {accounts.map((acc, index) => (
              <option key={index} value={acc.targetName}>
                {acc.targetName}
              </option>
            ))}
          </select>

          {/* Render selected account details */}
          {selectedAccount && (
            <div className="account-details" style={{ marginTop: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>
              <h3>Account Details</h3>
              <p><strong>Target Name:</strong> {selectedAccount.targetName}</p>
              <p><strong>Region:</strong> {selectedAccount.region}</p>
              <p><strong>Access Key:</strong> {selectedAccount.accessKey}</p>
              <p><strong>Secret Key:</strong> {selectedAccount.secretKey}</p>
              <p><strong>CUR URL:</strong> {selectedAccount.cururl}</p>
              <p><strong>Output S3 URI:</strong> {selectedAccount.output}</p>
            </div>
          )}
        </>
      ) : (
        <p>No accounts available.</p>
      )}
    </div>
  );
};

export default Filter;
