import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import './styles.css'; // Importing CSS

const App = () => {
  const [credentials, setCredentials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [activeCredentialId, setActiveCredentialId] = useState(null);
  const [formData, setFormData] = useState({
    provider: '',
    targetName: '',
    accessKey: '',
    secretKey: '',
    roleArn: ''
  });
  const [errors, setErrors] = useState({});

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
        await invoke('saveAwsCredentials', formData);
      }
      fetchAwsCredentials();
      closeModal();
    } catch (error) {
      console.error('Error saving credential:', error);
    }
  };

  const deleteCredential = async (targetName) => {
    if (window.confirm(`Are you sure you want to delete "${targetName}"?`)) {
      try {
        await invoke('deleteAwsCredentials', { targetName });
        fetchAwsCredentials();
        closeModal();
        setActiveCredentialId(null);
      } catch (error) {
        console.error('Error deleting credential:', error);
      }
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
    setActiveCredentialId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCredential(null);
  };

  const clearForm = () => {
    setFormData({ provider: '', targetName: isEditMode ? selectedCredential.targetName : '', accessKey: '', secretKey: '', roleArn: '' });
    setErrors({});
  };

  const toggleCredentialActions = (index) => setActiveCredentialId(activeCredentialId === index ? null : index);

  return (
    <div className="container">
        <div className='targets'>
        <h2>Targets</h2>
        <button onClick={openAddModal} className="btn-add">Add Target</button>
        </div>

      {credentials.length > 0 ? (
        <div className="credentials-grid">
          {credentials.map((cred, index) => (
            <div key={index} className={`credential-box ${activeCredentialId === index ? 'active' : ''}`} onClick={() => openEditModal(cred)}>
              <h3>{cred.targetName}</h3>
              {/* <div className="provider">{cred.provider}</div> */}
              {/* <div className="credential-actions">
                <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(cred); }}>Edit</button>
                <button className="btn-delete" onClick={(e) => { e.stopPropagation(); deleteCredential(cred.targetName); }}>Delete</button>
              </div> */}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-credentials"><p>No targets available. Click 'Add Target' to create one.</p></div>
      )}

      {/* <button onClick={fetchAwsCredentials} className="btn-refresh">Refresh Credentials</button> */}

      {isModalOpen && (

        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>{isEditMode ? 'Edit AWS Account' : 'Add AWS Account'}</h3></div>
            <form onSubmit={handleSubmit}>
              {['targetName', 'provider', 'accessKey', 'secretKey'].map((field) => (
                <div key={field} className="form-group">
                  <label>{field === 'targetName' ? 'Target Name' : field.replace(/([A-Z])/g, ' $1')}<span className="required">*</span></label>
                  <input
                    type="text"
                    name={field}
                    value={formData[field]}
                    onChange={handleChange}
                    disabled={isEditMode && field === 'targetName'}
                    className={`form-control ${errors[field] ? 'error' : ''}`}
                  />
                  {errors[field] && <div className="error-message">{`${field.replace(/([A-Z])/g, ' $1')} is required`}</div>}
                </div>
              ))}
              <div className="form-group">
                <label>Role ARN</label>
                <input type="text" name="roleArn" value={formData.roleArn} onChange={handleChange} className="form-control" />
              </div>
              <div className="form-actions">
                <div>
                {isEditMode && (
                  <button type="button" onClick={() => deleteCredential(selectedCredential.targetName)} className="btn-delete">Delete</button>
                )}
                </div>
                <div>             
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" onClick={clearForm} className="btn-clear">Clear</button>
                
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button></div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
