export const IS_ONLINE_EDITION =
  import.meta.env.MODE === 'online' || import.meta.env.VITE_EDITION === 'online';

export const EDITION_LABEL = IS_ONLINE_EDITION ? 'Online edition' : 'Offline edition';
