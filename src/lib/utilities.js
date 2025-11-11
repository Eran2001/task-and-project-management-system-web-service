const getAuthToken = () => {
  if (import.meta.env.VITE_CLEVERI_EMP_ENVIRONMENT == "development") {
  }
  return localStorage.getItem("session.token");
};

const setAuthToken = (authToken) => {
  localStorage.setItem("session.token", authToken);
};

const getSubscription = () => {
  let subscription = localStorage.getItem("session.subscription");
  if (subscription != null) {
    return JSON.parse(subscription);
  }
  return null;
};

const setSubscription = (subscription) => {
  localStorage.setItem("session.subscription", JSON.stringify(subscription));
};

const getUserData = () => {
  let userData = localStorage.getItem("session.user");
  if (userData != null) {
    return JSON.parse(userData);
  }
  return null;
};

const setUserData = (userData) => {
  localStorage.setItem("session.user", JSON.stringify(userData));
};

const token = {
  getAuthToken,
  setAuthToken,

  getSubscription,
  setSubscription,

  getUserData,
  setUserData,
};

export default token;
