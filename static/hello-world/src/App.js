import React, { useState, useEffect } from "react";
import { invoke, view } from "@forge/bridge";
import "./styles.css"; // Importing CSS
import Filter from "./Filter";

const App = () => {
  const [projectId, setProjectId] = useState("");
  const [credentials, setCredentials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [alreadyExist, setAlreadyExist] = useState("");
  const [formData, setFormData] = useState({
    cururl: "",
    targetName: "",
    accessKey: "",
    secretKey: "",
    region: "",
    output: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    view.getContext().then((context) => {
      const id = context.extension.project.id;
      setProjectId(id);
      fetchAwsCredentials(id);
    });
  }, []);

  const fieldLabels = {
    targetName: "Account Name",
    accessKey: "Access Key",
    secretKey: "Secret Key",
    cururl: "CUR S3 bucket URI",
    region: "Region",
    output: "Output S3 bucket URI",
  };

  const [delConfirmation, setDelConfirmation] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const fetchAwsCredentials = async (id) => {
    if (!id) return;
    try {
      const result = await invoke("getAwsCredentials", { projectId: id });
      console.log("result", result);
      setCredentials(Object.values(result || {}));
    } catch (error) {
      console.error("Error fetching credentials:", error);
      setCredentials([]); // Optional: Clear credentials on failure
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const validateForm = () => {
    const newErrors = {};
    [
      "targetName",
      "accessKey",
      "secretKey",
      "cururl",
      "region",
      "output",
    ].forEach((field) => {
      if (!formData[field]) newErrors[field] = true;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      if (isEditMode && selectedCredential) {
        await invoke("editAwsCredentials", {
          projectId,
          targetName: selectedCredential.targetName,
          updatedFields: formData,
        });
      } else {
        console.log(formData);
        const response = await invoke("saveAwsCredentials", {
          projectId,
          ...formData,
        });
        if (!response.success) {
          setAlreadyExist(response.message);
          return;
        }
      }

      fetchAwsCredentials(projectId);
      closeModal();
    } catch (error) {
      console.error("Error saving credential:", error);
    }
  };

  const handleDelete = async () => {
    if (deleteInput === selectedCredential?.targetName) {
      await invoke("deleteAwsCredentials", {
        projectId,
        targetName: selectedCredential.targetName,
      });
      fetchAwsCredentials(projectId);

      setDelConfirmation(false);
      setDeleteInput("");
      closeModal();
    } else {
      setDeleteError("Target name does not match.");
    }
  };

  const openAddModal = () => {
    setFormData({
      targetName: "",
      accessKey: "",
      secretKey: "",
      cururl: "",
      region: "",
      output: "",
    });
    setErrors({});
    setIsEditMode(false);
    setIsModalOpen(true);
    setAlreadyExist("");
  };

  const openEditModal = (cred) => {
    setFormData({ ...cred });
    setSelectedCredential(cred);
    setErrors({});
    setIsEditMode(true);
    setIsModalOpen(true);
    setDelConfirmation(false);
    setDeleteInput("");
    setDeleteError("");
    setAlreadyExist("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCredential(null);
  };

  return (
    <div className="container">
      <div className={isModalOpen ? "blur" : ""}></div>
      <div className="targets">
        <h2>Accounts</h2>
        <button onClick={openAddModal} className="btn-add">
          Add
        </button>
      </div>

      {credentials.length > 0 ? (
        <div className="credentials-grid">
          {credentials.map((cred, index) => (
            <div
              key={index}
              className="credential-box"
              onClick={() => openEditModal(cred)}
            >
              <h3>{cred.targetName}</h3>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-credentials">
          <p>No targets available. Click 'Add Target' to create one.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? "Edit" : "Add"} Account</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-element">
                {[
                  "targetName",
                  "region",
                  "accessKey",
                  "secretKey",
                  "cururl",
                  "output",
                ].map((field) => (
                  <div key={field} className="form-group">
                    <label>
                      {fieldLabels[field]}{" "}
                      {[
                        "targetName",
                        "accessKey",
                        "secretKey",
                        "cururl",
                        "region",
                        "output",
                      ].includes(field) && <span className="required">*</span>}
                    </label>
                    <input
                      type="text"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      disabled={
                        (isEditMode && field) === "targetName" ||
                        delConfirmation
                      }
                      className={`form-control ${errors[field] ? "error" : ""}`}
                    />
                    {errors[field] && (
                      <div className="error-message">{`${field.replace(
                        /([A-Z])/g,
                        " $1"
                      )} is required`}</div>
                    )}
                    {field === "targetName" && alreadyExist && (
                      <div className="error-message already-exist">
                        {alreadyExist}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="example-url">
                (e.g.,
                https://mycurreportd0130.s3.us-east-1.amazonaws.com/d0130/cur/data/BILLING_PERIOD%3D2025-01/cur-00001.csv.gz)
              </div>

              <div className="form-actions">
                {isEditMode && (
                  <div className="delete-section">
                    {!delConfirmation ? (
                      <button
                        type="button"
                        onClick={() => setDelConfirmation(true)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    ) : (
                      <div className="delete-confirmation">
                        <label>Enter the target name to confirm delete:</label>
                        <input
                          type="text"
                          value={deleteInput}
                          onChange={(e) => {
                            setDeleteInput(e.target.value);
                            setDeleteError("");
                          }}
                          className="form-control"
                        />
                        {deleteError && (
                          <div className="error-message">{deleteError}</div>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="btn-confirm-delete"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDelConfirmation(false)}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!delConfirmation && (
                  <div
                    style={{
                      display: "flex",
                      gap: "5px",
                      flexDirection: "row",
                    }}
                  >
                    <button type="submit" className="btn-primary">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      <Filter accounts={credentials || []} />
    </div>
  );
};

export default App;
