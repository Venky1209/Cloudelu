import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();
const storageKey = "secretsObject";

// Function to save credentials
resolver.define('saveAwsCredentials', async (req) => {
  const { projectId, provider, targetName, accessKey, secretKey, roleArn } = req.payload;

  let secretsObject;
  try {
    const storedSecrets = await storage.getSecret(storageKey);
    secretsObject = storedSecrets ? JSON.parse(storedSecrets) : {};  // Ensure it's an object
  } catch (error) {
    console.error('Error parsing stored secrets:', error);
    secretsObject = {}; // Reset if parsing fails
  }

  if(secretsObject[targetName]){
    return { success: false, message: `Target ${targetName} already exists.` };
  }

  secretsObject[targetName] = {
    accessKey,
    secretKey,
    roleArn,
    provider,
    targetName,
    projectId
  };

  try {
    await storage.setSecret(storageKey, JSON.stringify(secretsObject));
    console.log(`Credentials stored successfully under target: ${targetName}`);
    return { success: true, message: 'Credentials stored securely.' };
  } catch (error) {
    console.error('Error storing credentials:', error);
    return { success: false, message: 'Failed to store credentials.', error: error.message };
  }
});

// Function to retrieve all AWS credentials
resolver.define('getAwsCredentials', async () => {
  let secretsObject = await storage.getSecret(storageKey);
  return secretsObject ? JSON.parse(secretsObject) : {}; // Return empty object if nothing stored
});



// Function to edit specific fields of existing credentials
resolver.define('editAwsCredentials', async (req) => {
  console.log('Received payload:', req.payload);
  const { targetName, updatedFields } = req.payload;

  console.log(`Editing credentials for: ${targetName}, updatedFields:`, updatedFields);

  try {
    let secretsObject = await storage.getSecret(storageKey);
    secretsObject = secretsObject ? JSON.parse(secretsObject) : {};

    console.log('Retrieved secretsObject:', secretsObject);

    if (!secretsObject[targetName]) {
      console.log(`Target ${targetName} not found.`);
      return { success: false, message: `Target ${targetName} not found.` };
    }

    secretsObject[targetName] = {
      ...secretsObject[targetName],
      ...updatedFields,
    };

    console.log('Updated secretsObject:', secretsObject);

    await storage.setSecret(storageKey, JSON.stringify(secretsObject));
    console.log(`Updated credentials for: ${targetName}`);
    return { success: true, message: `Updated credentials for ${targetName}.` };
  } catch (error) {
    console.error('Error updating credentials:', error);
    console.error('Full error object:', error);
    return { success: false, message: 'Failed to update credentials.', error: error.message };
  }
});

// Function to delete credentials
resolver.define('deleteAwsCredentials', async (req) => {
  const { targetName } = req.payload;

  try {
    let storedSecrets = await storage.getSecret(storageKey);
    let secretsObject = storedSecrets ? JSON.parse(storedSecrets) : {};

    if (!secretsObject[targetName]) {
      return { success: false, message: `Target ${targetName} not found.` };
    }

    // Delete the target
    delete secretsObject[targetName]; 

    if (Object.keys(secretsObject).length === 0) {
      // If no targets left, remove storage key entirely
      await storage.deleteSecret(storageKey);
      console.log(`Deleted last target: ${targetName}, storage cleared.`);
    } else {
      // If other targets still exist, update storage
      await storage.setSecret(storageKey, JSON.stringify(secretsObject));
      console.log(`Deleted target: ${targetName}`);
    }

    return { success: true, message: `Deleted credentials for ${targetName}.` };
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return { success: false, message: 'Failed to delete credentials.', error: error.message };
  }
});



export const handler = resolver.getDefinitions();
