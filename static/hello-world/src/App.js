import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@forge/bridge';
import './styles.css'; // Importing CSS

const App = () => {
  const [credentials, setCredentials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [alreadyExist, setAlreadyExist] = useState('');
  const [formData, setFormData] = useState({
    provider: '',
    targetName: '',
    accessKey: '',
    secretKey: '',
    roleArn: ''
  });
  const [errors, setErrors] = useState({});
  
  const [delConfirmation, setDelConfirmation] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const fetchAwsCredentials = async () => {
    try {
      const result = await invoke('getAwsCredentials');
      setCredentials(result && typeof result === 'object' && Object.keys(result).length > 0 ? Object.values(result) : []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      setCredentials([]);
    }
  };

  useEffect(() => {
    fetchAwsCredentials();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const validateForm = () => {
    const newErrors = {};
    ['targetName', 'provider', 'accessKey', 'secretKey'].forEach((field) => {
      if (!formData[field]) newErrors[field] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      if (isEditMode) {
        await invoke('editAwsCredentials', { targetName: selectedCredential.targetName, updatedFields: formData });
      } else {
        const response = await invoke('saveAwsCredentials', formData);
        if (!response.success) {
          setAlreadyExist(response.message);
          return;
        }
      }
      fetchAwsCredentials();
      closeModal();
    } catch (error) {
      console.error('Error saving credential:', error);
    }
  };

  const handleDelete = async () => {
    if (deleteInput === selectedCredential?.targetName) {
      await invoke('deleteAwsCredentials', { targetName: selectedCredential.targetName });
      fetchAwsCredentials();
      setDelConfirmation(false);
      setDeleteInput('');
      closeModal();
    } else {
      setDeleteError('Target name does not match.');
    }
  };

  const openAddModal = () => {
    setFormData({ provider: '', targetName: '', accessKey: '', secretKey: '', roleArn: '' });
    setErrors({});
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (cred) => {
    setFormData(cred);
    setSelectedCredential(cred);
    setErrors({});
    setIsEditMode(true);
    setIsModalOpen(true);
    setDelConfirmation(false);
    setDeleteInput('');
    setDeleteError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCredential(null);
  };

  return (
    <div className="container">
      <div className={isModalOpen ? 'blur' : ''}></div>
      <div className='targets'>
        <h2>Targets</h2>
        <button onClick={openAddModal} className="btn-add">Add Target</button>
      </div>

      {credentials.length > 0 ? (
        <div className="credentials-grid">
          {credentials.map((cred, index) => (
            <div key={index} className="credential-box" onClick={() => openEditModal(cred)}>
              <h3>{cred.targetName}</h3>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-credentials"><p>No targets available. Click 'Add Target' to create one.</p></div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>{isEditMode ? 'Edit' : 'Add'} Target</h3></div>
            <form onSubmit={handleSubmit}>
              {['targetName', 'provider', 'accessKey', 'secretKey'].map((field) => (
                <div key={field} className="form-group">
                  <label>
                    {field === 'targetName' ? 'Target Name' : field.replace(/([A-Z])/g, ' $1')}
                    <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name={field}
                    value={formData[field]}
                    onChange={handleChange}
                    disabled={((isEditMode && field) === 'targetName' ) || (delConfirmation)}
          
                    className={`form-control ${errors[field] ? 'error' : ''}`}
                  />
                  {errors[field] && <div className="error-message">{`${field.replace(/([A-Z])/g, ' $1')} is required`}</div>}
                  {field === 'targetName' && alreadyExist && <div className="error-message already-exist">{alreadyExist}</div>}
                </div>
              ))}

              <div className="form-group">
                <label>Role ARN</label>
                <input type="text" disabled={delConfirmation} name="roleArn" value={formData.roleArn} onChange={handleChange} className="form-control" />
              </div>

              <div className="form-actions">
              {isEditMode && (
                <div className="delete-section">
                  {!delConfirmation ? (
                    <button type="button" onClick={() => setDelConfirmation(true)} className="btn-delete">Delete</button>
                  ) : (
                    <div className="delete-confirmation">
                      <label>Enter the target name to confirm delete:</label>
                      <input 
                        type="text" 
                        value={deleteInput} 
                        onChange={(e) => {
                          setDeleteInput(e.target.value);
                          setDeleteError('');
                        }} 
                        className="form-control"
                      />
                      {deleteError && <div className="error-message">{deleteError}</div>}
                      <div>
                        <button type="button" onClick={handleDelete} className="btn-confirm-delete">Confirm</button>
                        <button type="button" onClick={() => setDelConfirmation(false)} className="btn-secondary">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!delConfirmation && (
                <div style={{ display: "flex", gap: "5px", flexDirection: "row" }}>
                  <button type="submit" className="btn-primary">Save</button>
                  <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                </div>
              )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
