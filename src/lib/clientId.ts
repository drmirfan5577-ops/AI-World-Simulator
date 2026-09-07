// Client ID management for anonymous users
const CLIENT_ID_KEY = 'ai_world_client_id';

export function getClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  
  if (!clientId) {
    // Generate a new UUID for this client
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  
  return clientId;
}

export function clearClientId(): void {
  localStorage.removeItem(CLIENT_ID_KEY);
}
