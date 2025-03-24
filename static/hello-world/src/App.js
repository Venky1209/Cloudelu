import React, { useState, useEffect } from "react";
import { invoke, view } from "@forge/bridge";
import "./styles.css";
import Filter from "./Filter";
import AWS from "aws-sdk";

const App = () => {
  const [projectId, setProjectId] = useState("");
  const [credentials, setCredentials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [alreadyExist, setAlreadyExist] = useState("");
  const [fetchDataS3, setFetchDataS3] = useState(null);
  const [invalidCredentials, setInvalidCredentials] = useState("");
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
      setCredentials([]);
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

  const fetchDataFromS3 = async (
    accessKeyId,
    secretAccessKey,
    region,
    tableName,
    outputLocation,
    inputLocation,
    mode
  ) => {
    try {
      AWS.config.update({
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        region: region,
      });

      const athena = new AWS.Athena();
      const databaseName = "cur_billing_data";

      const executeAthenaQuery = async (query) => {
        try {
          console.log("Executing query:", query);
          const startResponse = await athena
            .startQueryExecution({
              QueryString: query,
              ResultConfiguration: { OutputLocation: outputLocation },
            })
            .promise();

          console.log("Query execution started:", startResponse);
          return startResponse;
        } catch (error) {
          console.error("Athena query failed:", error);
          if (setFetchDataS3) {
            setFetchDataS3("Error : Failed to execute Athena query");
          }
          return null;
        }
      };

      const getQueryResults = async (queryExecutionId) => {
        try {
          if (!queryExecutionId) {
            console.error("Query execution ID is null or undefined");
            return null;
          }

          // Wait for query to complete
          let queryStatus = "RUNNING";
          while (queryStatus === "RUNNING" || queryStatus === "QUEUED") {
            const statusResponse = await athena
              .getQueryExecution({
                QueryExecutionId: queryExecutionId,
              })
              .promise();

            queryStatus = statusResponse.QueryExecution.Status.State;
            console.log(`Query status: ${queryStatus}`);

            if (queryStatus === "FAILED" || queryStatus === "CANCELLED") {
              const errorReason =
                statusResponse.QueryExecution.Status.StateChangeReason;
              console.error("Query failed with reason:", errorReason);
              if (setFetchDataS3) {
                setFetchDataS3("Query Execution Failed");
              }
              return null; // Return null instead of False
            }

            if (queryStatus === "RUNNING" || queryStatus === "QUEUED") {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          // Query completed successfully, get the results
          const resultsResponse = await athena
            .getQueryResults({
              QueryExecutionId: queryExecutionId,
            })
            .promise();

          console.log("Raw query results:", resultsResponse);

          // Process the results into a more usable format
          const headers = resultsResponse.ResultSet.Rows[0].Data.map(
            (header) => header.VarCharValue
          );

          const rows = resultsResponse.ResultSet.Rows.slice(1).map((row) => {
            const rowData = {};
            row.Data.forEach((data, index) => {
              rowData[headers[index]] = data.VarCharValue;
            });
            return rowData;
          });

          console.log("Processed row data:", rows);

          // Check if any data was returned
          if ((!rows || rows.length === 0) && mode === "addmode") {
            console.error("No data returned from query");
            const tableDropQuery = `DROP TABLE IF EXISTS ${databaseName}.${tableName}`;
            const tableDropResponse = await executeAthenaQuery(tableDropQuery);
            if (!tableDropResponse) {
              console.error("Failed to Drop table");
              return false;
            }
            console.log("Table Dropped");
            return null;
          }

          return rows;
        } catch (error) {
          console.error("Error getting query results:", error);
          return null;
        }
      };

      const setupAthenaTable = async () => {
        try {
          console.log("Setting up Athena table...");
          console.log(
            "WARNING: Checking IAM permissions - user needs s3:GetObject, s3:ListBucket permissions on the S3 bucket"
          );

          // Step 1: Check if the database exists
          const dbCheckResponse = await executeAthenaQuery(
            `SHOW DATABASES LIKE '${databaseName}';`
          );
          if (!dbCheckResponse) {
            console.error("Failed to check if database exists");
            return false;
          }
          console.log("Database exists");

          // Step 2: Create Database if it does not exist
          const dbCreateResponse = await executeAthenaQuery(
            `CREATE DATABASE IF NOT EXISTS ${databaseName};`
          );
          if (!dbCreateResponse) {
            console.error("Failed to create database");
            return false;
          }
          console.log("Database created");

          if (mode === "editmode") {
            const tableDropQuery = `DROP TABLE IF EXISTS ${databaseName}.${tableName}`;
            const tableDropResponse = await executeAthenaQuery(tableDropQuery);
            if (!tableDropResponse) {
              console.error("Failed to Drop table");
              return false;
            }
            console.log("Table Dropped");
          }

          const createTableQuery = `CREATE EXTERNAL TABLE ${databaseName}.${tableName}(
          bill_bill_type string, 
          bill_billing_entity string, 
          bill_billing_period_end_date timestamp, 
          bill_billing_period_start_date timestamp, 
          bill_invoice_id string, 
          bill_invoicing_entity string, 
          bill_payer_account_id string, 
          bill_payer_account_name string, 
          cost_category map<string,string>, 
          discount map<string,string>, 
          discount_bundled_discount double, 
          discount_total_discount double, 
          identity_line_item_id string, 
          identity_time_interval string, 
          line_item_availability_zone string, 
          line_item_blended_cost double, 
          line_item_blended_rate string, 
          line_item_currency_code string, 
          line_item_legal_entity string, 
          line_item_line_item_description string, 
          line_item_line_item_type string, 
          line_item_net_unblended_cost double, 
          line_item_net_unblended_rate string, 
          line_item_normalization_factor double, 
          line_item_normalized_usage_amount double, 
          line_item_operation string, 
          line_item_product_code string, 
          line_item_resource_id string, 
          line_item_tax_type string, 
          line_item_unblended_cost double, 
          line_item_unblended_rate string, 
          line_item_usage_account_id string, 
          line_item_usage_account_name string, 
          line_item_usage_amount double, 
          line_item_usage_end_date timestamp, 
          line_item_usage_start_date timestamp, 
          line_item_usage_type string, 
          pricing_currency string, 
          pricing_lease_contract_length string, 
          pricing_offering_class string, 
          pricing_public_on_demand_cost double, 
          pricing_public_on_demand_rate string, 
          pricing_purchase_option string, 
          pricing_rate_code string, 
          pricing_rate_id string, 
          pricing_term string, 
          pricing_unit string, 
          product map<string,string>, 
          product_comment string, 
          product_fee_code string, 
          product_fee_description string, 
          product_from_location string, 
          product_from_location_type string, 
          product_from_region_code string, 
          product_instance_family string, 
          product_instance_type string, 
          product_instancesku string, 
          product_location string, 
          product_location_type string, 
          product_operation string, 
          product_pricing_unit string, 
          product_product_family string, 
          product_region_code string, 
          product_servicecode string, 
          product_sku string, 
          product_to_location string, 
          product_to_location_type string, 
          product_to_region_code string, 
          product_usagetype string, 
          reservation_amortized_upfront_cost_for_usage double, 
          reservation_amortized_upfront_fee_for_billing_period double, 
          reservation_availability_zone string, 
          reservation_effective_cost double, 
          reservation_end_time string, 
          reservation_modification_status string, 
          reservation_net_amortized_upfront_cost_for_usage double, 
          reservation_net_amortized_upfront_fee_for_billing_period double, 
          reservation_net_effective_cost double, 
          reservation_net_recurring_fee_for_usage double, 
          reservation_net_unused_amortized_upfront_fee_for_billing_period double, 
          reservation_net_unused_recurring_fee double, 
          reservation_net_upfront_value double, 
          reservation_normalized_units_per_reservation string, 
          reservation_number_of_reservations string, 
          reservation_recurring_fee_for_usage double, 
          reservation_reservation_a_r_n string, 
          reservation_start_time string, 
          reservation_subscription_id string, 
          reservation_total_reserved_normalized_units string, 
          reservation_total_reserved_units string, 
          reservation_units_per_reservation string, 
          reservation_unused_amortized_upfront_fee_for_billing_period double, 
          reservation_unused_normalized_unit_quantity double, 
          reservation_unused_quantity double, 
          reservation_unused_recurring_fee double, 
          reservation_upfront_value double, 
          resource_tags map<string,string>, 
          savings_plan_amortized_upfront_commitment_for_billing_period double, 
          savings_plan_end_time string, 
          savings_plan_instance_type_family string, 
          savings_plan_net_amortized_upfront_commitment_for_billing_period double, 
          savings_plan_net_recurring_commitment_for_billing_period double, 
          savings_plan_net_savings_plan_effective_cost double, 
          savings_plan_offering_type string, 
          savings_plan_payment_option string, 
          savings_plan_purchase_term string, 
          savings_plan_recurring_commitment_for_billing_period double, 
          savings_plan_region string, 
          savings_plan_savings_plan_a_r_n string, 
          savings_plan_savings_plan_effective_cost double, 
          savings_plan_savings_plan_rate double, 
          savings_plan_start_time string, 
          savings_plan_total_commitment_to_date double, 
          savings_plan_used_commitment double)
        ROW FORMAT SERDE 
          'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe' 
        STORED AS INPUTFORMAT 
          'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' 
        OUTPUTFORMAT 
          'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        LOCATION
          '${inputLocation}'
        TBLPROPERTIES (
          'transient_lastDdlTime'='1742468082')`;

          const tableCreateResponse = await executeAthenaQuery(
            createTableQuery
          );
          if (!tableCreateResponse) {
            console.error("Failed to create table");
            return false;
          }
          console.log("Table created");

          // Step 4: Load new partitions
          const partitionResponse = await executeAthenaQuery(
            `MSCK REPAIR TABLE ${databaseName}.${tableName};`
          );
          if (!partitionResponse) {
            console.error("Failed to load partitions");
            return false;
          }
          console.log("Partitions loaded");

          // Step 5: Query some data from the table to verify
          const fetchDataQuery = `SELECT COUNT(*) FROM ${databaseName}.${tableName} LIMIT 3;`;

          const fetchDataExecution = await executeAthenaQuery(fetchDataQuery);
          if (!fetchDataExecution) {
            console.error("Failed to execute data fetch query");
            return false;
          }
          console.log(
            "Data fetch initiated, execution ID:",
            fetchDataExecution.QueryExecutionId
          );

          const results = await getQueryResults(
            fetchDataExecution.QueryExecutionId
          );
          if (!results) {
            console.log(results);
            console.error("Failed to get query results or no data returned");
            return false;
          }
          console.log("Fetched data from Athena:", results);

          return true;
        } catch (error) {
          console.error("Error in Athena operations:", error);
          return false;
        }
      };

      // Execute the setup and return the result
      const result = await setupAthenaTable();
      return result;
    } catch (error) {
      console.error("Exception in fetchDataFromS3:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    console.log(formData);
    const accessKeyId = formData.accessKey;
    const secretAccessKey = formData.secretKey;
    const region = formData.region;
    const tableName = formData.targetName;
    const outputLocation = formData.output;
    const inputLocation = formData.cururl;
    try {
      if (isEditMode && selectedCredential) {
        const fetchResult = await fetchDataFromS3(
          accessKeyId,
          secretAccessKey,
          region,
          tableName,
          outputLocation,
          inputLocation,
          "editmode"
        );
        if (fetchResult) {
          await invoke("editAwsCredentials", {
            projectId,
            targetName: selectedCredential.targetName,
            updatedFields: formData,
          });
        } else {
          setInvalidCredentials("Invalid Credentials");
          const fetchResult = await fetchDataFromS3(
            selectedCredentialaccessKeyId,
            selectedCredential.secretAccessKey,
            selectedCredential.region,
            selectedCredential.tableName,
            selectedCredential.outputLocation,
            selectedCredential.inputLocation,
            "editmode"
          );
          //error happens no check is done fix in future
          return;
        }
      } else {
        const fetchResult = await fetchDataFromS3(
          accessKeyId,
          secretAccessKey,
          region,
          tableName,
          outputLocation,
          inputLocation,
          "addmode"
        );
        console.log(fetchResult);

        if (fetchResult) {
          const response = await invoke("saveAwsCredentials", {
            projectId,
            ...formData,
          });
          if (!response.success) {
            setAlreadyExist(response.message);
            return;
          }
        } else {
          setInvalidCredentials("Invalid Credentials");
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
    setInvalidCredentials("");
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
              <h3>{isEditMode ? "Edit" : "Add"}Account</h3>
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
                (e.g., CUR S3 URI - s3://bucket/account_id/report_name /data/)
                (e.g., OUTPUT S3 URI - s3://athena-results-bucket /)
              </div>
              <span>
                <p className="InvalidCredentials">{invalidCredentials}</p>
              </span>
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
