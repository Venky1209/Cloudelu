import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

const storageKey = 'secretsObject'; // Global storage but grouped by project ID inside

// ----------- SAVE AWS CREDENTIALS -----------
resolver.define('saveAwsCredentials', async (req) => {
  const { projectId,targetName, accessKey, secretKey, cururl, region,output } = req.payload;
  console.log(`Received credentials for: ${targetName} in project: ${projectId}`);

  let secretsObject;
  try {
    const storedSecrets = await storage.getSecret(storageKey);
    secretsObject = storedSecrets ? JSON.parse(storedSecrets) : {};
  } catch (error) {
    console.error('Error parsing stored secrets:', error);
    secretsObject = {};
  }

  if (!secretsObject[projectId]) {
    secretsObject[projectId] = {}; // Initialize if not present
  }

  if (secretsObject[projectId][targetName]) {
    return { success: false, message: `Target ${targetName} already exists in this project.` };
  }

  secretsObject[projectId][targetName] = {
    accessKey,
    secretKey,
    cururl,
    output,
    region,
    targetName,
    projectId
  };

  try {
    await storage.setSecret(storageKey, JSON.stringify(secretsObject));
    console.log(`Stored under target: ${targetName} for project: ${projectId}`);
    return { success: true, message: 'Credentials stored securely for this project.' };
  } catch (error) {
    console.error('Error storing credentials:', error);
    return { success: false, message: 'Failed to store credentials.', error: error.message };
  }
});

// ----------- GET AWS CREDENTIALS -----------
resolver.define('getAwsCredentials', async (req) => {
  const { projectId } = req.payload;
  try {
    let secretsObject = await storage.getSecret(storageKey);
    secretsObject = secretsObject ? JSON.parse(secretsObject) : {};
    return secretsObject[projectId] || {}; // Return only for current project
  } catch (error) {
    console.error('Error retrieving credentials:', error);
    return { success: false, message: 'Failed to retrieve credentials.', error: error.message };
  }
});

// ----------- EDIT AWS CREDENTIALS -----------
resolver.define('editAwsCredentials', async (req) => {
  const { projectId, targetName, updatedFields } = req.payload;

  try {
    let secretsObject = await storage.getSecret(storageKey);
    secretsObject = secretsObject ? JSON.parse(secretsObject) : {};

    if (!secretsObject[projectId] || !secretsObject[projectId][targetName]) {
      return { success: false, message: `Target ${targetName} not found in this project.` };
    }

    secretsObject[projectId][targetName] = {
      ...secretsObject[projectId][targetName],
      ...updatedFields
    };

    await storage.setSecret(storageKey, JSON.stringify(secretsObject));
    console.log(`Updated target: ${targetName} in project: ${projectId}`);
    return { success: true, message: `Updated credentials for ${targetName}.` };
  } catch (error) {
    console.error('Error updating credentials:', error);
    return { success: false, message: 'Failed to update credentials.', error: error.message };
  }
});

// ----------- DELETE AWS CREDENTIALS -----------
resolver.define('deleteAwsCredentials', async (req) => {
  const { projectId, targetName } = req.payload;

  try {
    let secretsObject = await storage.getSecret(storageKey);
    secretsObject = secretsObject ? JSON.parse(secretsObject) : {};

    if (!secretsObject[projectId] || !secretsObject[projectId][targetName]) {
      return { success: false, message: `Target ${targetName} not found in this project.` };
    }

    delete secretsObject[projectId][targetName];

    if (Object.keys(secretsObject[projectId]).length === 0) {
      delete secretsObject[projectId]; // Clean up empty project entry
    }

    await storage.setSecret(storageKey, JSON.stringify(secretsObject));
    console.log(`Deleted target: ${targetName} in project: ${projectId}`);
    return { success: true, message: `Deleted credentials for ${targetName}.` };
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return { success: false, message: 'Failed to delete credentials.', error: error.message };
  }
});

export const handler = resolver.getDefinitions();
