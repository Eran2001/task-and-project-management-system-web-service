import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGoogleLogin } from "@react-oauth/google";
import { PublicClientApplication } from "@azure/msal-browser";
import Notification from "@/components/ui/Notification";
import {
  addEmail,
  updateEmail,
  getEmails,
  setProvider,
  setShowDetails,
} from "@/store/email/emailSlice";

const GROUP_OPTIONS = [
  { label: "PAYMENT", value: "Payment" },
  { label: "DISPUTED", value: "Disputed" },
  { label: "RECEIVABLE", value: "Receivable" },
];

const getGroupKey = (assignGroup) => {
  const label =
    typeof assignGroup === "string"
      ? GROUP_OPTIONS.find((o) => o.value === assignGroup)?.label ?? assignGroup
      : assignGroup?.label;
  return String(label || "").trim().toLowerCase();
};

export default function useOAuthProviders({
  variant,
  resourceId,
  existingName,
  existingGroup,
  getValues,
  setError,
  clearErrors,
  onSetNameError,
}) {
  const dispatch = useDispatch();
  const { uiState, emailConfig } = useSelector((state) => state.emails);

  const provider = uiState.provider;
  const direction = emailConfig.direction;

  const [connectedAccounts, setConnectedAccounts] = useState({
    gmail: null,
    office365: null,
    other: null,
  });

  const [oauthTokens, setOauthTokens] = useState({
    gmail: null,
    office365: null,
  });

  const [msalInitialized, setMsalInitialized] = useState(false);
  const msalInstanceRef = useRef(null);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        const redirectUri = `${window.location.origin}/`;
        const msalConfig = {
          auth: {
            clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
            authority: "https://login.microsoftonline.com/common",
            redirectUri: redirectUri,
          },
          cache: {
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: false,
          },
        };

        const instance = new PublicClientApplication(msalConfig);
        await instance.initialize();
        msalInstanceRef.current = instance;
        setMsalInitialized(true);
      } catch (error) {
      }
    };
    initializeMsal();
  }, []);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    access_type: "offline",
    prompt: "consent",
    scope:
      "https://mail.google.com https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile email profile openid",

    onSuccess: async (codeResponse) => {
      try {
        if (!codeResponse || !codeResponse.code) return;

        const authCode = codeResponse.code;
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: authCode,
            client_id: import.meta.env.VITE_CLIENT_ID,
            client_secret: import.meta.env.VITE_SECREAT_ID,
            redirect_uri: window.location.origin,
            grant_type: "authorization_code",
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) return;

        const { access_token, refresh_token } = tokenData;
        const userInfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );
        const userInfo = await userInfoRes.json();

        setConnectedAccounts((prev) => ({
          ...prev,
          gmail: {
            name: userInfo.name,
            email: userInfo.email,
          },
        }));

        setOauthTokens((prev) => ({
          ...prev,
          gmail: {
            authCode,
            access_token,
            refresh_token,
            userEmail: userInfo.email,
          },
        }));

        dispatch(setShowDetails(true));
        dispatch(setProvider("gmail"));

      } catch (err) {
        Notification.error("Gmail could not be connected.");
      }
    },

    onError: (error) => {
      if (
        error?.error === "popup_closed_by_user" ||
        error?.error === "access_denied" ||
        error?.message?.toLowerCase().includes("popup") ||
        error?.message?.toLowerCase().includes("closed") ||
        error?.message?.toLowerCase().includes("cancel")
      ) {
        Notification.error("Gmail could not be connected.");
      }
    },
  });

  const handleMicrosoftLogin = async () => {
    if (!msalInitialized || !msalInstanceRef.current) return;

    try {
      const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
      const redirectUri = `${window.location.origin}/microsoft-oauth-callback.html`;
      const scopes = ["openid", "email", "profile", "offline_access", "User.Read", "Mail.Read", "Mail.Send"];

      const pkce = await generatePkcePair();
      const authUrl =
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        new URLSearchParams({
          client_id: clientId,
          response_type: "code",
          redirect_uri: redirectUri,
          response_mode: "query",
          scope: scopes.join(" "),
          prompt: "select_account",
          state: "microsoft_oauth_login",
          code_challenge: pkce.challenge,
          code_challenge_method: "S256",
        });

      const authCode = await new Promise((resolve, reject) => {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          authUrl,
          "Microsoft Login",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          reject(new Error("Popup blocked"));
          return;
        }
        const messageHandler = (event) => {
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data && event.data.type === "microsoft_oauth_code") {
            window.removeEventListener("message", messageHandler);
            clearInterval(checkClosed);

            if (popup && !popup.closed) {
              popup.close();
            }

            if (event.data.code) {

              resolve(event.data.code);
            } else if (event.data.error) {

              const errorMsg = event.data.errorDescription || event.data.error;
              reject(new Error(errorMsg));
            }
          }
        };


        window.addEventListener("message", messageHandler);


        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener("message", messageHandler);
            reject(new Error("User cancelled"));
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          if (!popup.closed) {
            popup.close();
          }
          reject(new Error("Timeout"));
        }, 120000);
      });

      // Exchange code for tokens to get user info (with PKCE verifier)
      const tokenResponse = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            scope: scopes.join(" "),
            code: authCode,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            code_verifier: pkce.verifier,
          }),
        }
      );

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        if (tokenData.error) {
          throw new Error(`${tokenData.error}: ${tokenData.error_description || ''}`);
        }
        throw new Error("Failed to get access token");
      }

      const { access_token, refresh_token } = tokenData;

      const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const userInfo = await userInfoRes.json();

      setConnectedAccounts((prev) => ({
        ...prev,
        office365: {
          name: userInfo.displayName,
          email: userInfo.mail || userInfo.userPrincipalName,
        },
      }));

      setOauthTokens((prev) => ({
        ...prev,
        office365: {
          authCode: authCode,
          codeVerifier: pkce.verifier,
          access_token: access_token,
          refresh_token: refresh_token,
          userEmail: userInfo.mail || userInfo.userPrincipalName,
        },
      }));

      dispatch(setProvider("office365"));
      dispatch(setShowDetails(true));

      Notification.success("Microsoft 365 connected successfully.");
    } catch (error) {
      if (
        error?.message?.includes("User cancelled") ||
        error?.message?.includes("Popup blocked") ||
        error?.message?.includes("Timeout") ||
        error?.message?.toLowerCase().includes("closed")
      ) {
        Notification.error("Microsoft 365 could not be connected.");
      } else {
        Notification.error(`Microsoft 365 connection failed: ${error?.message || "Unknown error"}`);
      }
    }
  };


  // const handleMicrosoftLogin = async () => {
  //   if (!msalInitialized || !msalInstanceRef.current) {
  //     return;
  //   }
  //   try {
  //     const loginResponse = await msalInstanceRef.current.loginPopup({
  //       scopes: ["User.Read", "Mail.Read", "Mail.Send", "offline_access"],
  //       prompt: "consent",
  //       responseMode: "fragment",
  //     responseType: "code",
  //     });

  //     const account = loginResponse.account;
  //     const accessTokenResponse =
  //       await msalInstanceRef.current.acquireTokenSilent({
  //         scopes: ["User.Read", "Mail.Read", "Mail.Send", "offline_access"],
  //         account,
  //       });

  //     const accessToken = accessTokenResponse.accessToken;
  //     const idToken = accessTokenResponse.idToken || "";

  //     const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
  //       headers: { Authorization: `Bearer ${accessToken}` },
  //     });
  //     const userInfo = await userInfoRes.json();

  //     setConnectedAccounts((prev) => ({
  //       ...prev,
  //       office365: {
  //         name: userInfo.displayName,
  //         email: userInfo.mail || userInfo.userPrincipalName,
  //       },
  //     }));

  //     setOauthTokens((prev) => ({
  //       ...prev,
  //       office365: {
  //         accessToken,
  //         idToken,
  //         userEmail: userInfo.mail || userInfo.userPrincipalName,
  //       },
  //     }));

  //     dispatch(setProvider("office365"));
  //     dispatch(setShowDetails(true));

  //     Notification.success("Microsoft 365 connected successfully.");
  //   } catch (error) {
  //     if (
  //       error?.errorCode === "user_cancelled" ||
  //       error?.errorMessage?.includes("User cancelled") ||
  //       error?.message?.includes("User cancelled") ||
  //       error?.message?.toLowerCase().includes("popup") ||
  //       error?.message?.toLowerCase().includes("closed")
  //     ) {
  //       Notification.error("Microsoft 365 could not be connected.");
  //     }
  //   }
  // };

  const handleSaveOAuth = async () => {
    const currentProvider = provider;
    const tokens = oauthTokens[currentProvider];

    if (!tokens) {
      return;
    }

    const formValues = getValues ? getValues() : {};
    const emailName =
      formValues.name || formValues.emailName || existingName || "";
    const assignGroup =
      formValues.groupValue || formValues.assignGroup || existingGroup || "";
    const group = assignGroup ? getGroupKey(assignGroup) : "";

    if (!emailName || !emailName.trim()) {
      if (onSetNameError) {
        onSetNameError("Name is required");
      }
      if (setError) {
        setError("name", { type: "manual", message: "Name is required" });
      }
      return;
    }
    if (clearErrors) {
      clearErrors("name");
    }

    if (!group || !group.trim()) {
      return;
    }
    try {
      let emailPayload;

      if (currentProvider === "gmail") {
        emailPayload = {
          name: emailName,
          group: group,
          from_address: tokens.userEmail,
          smtp_provider: "gmail",
          mode: "ROOT_SMTP",
          smtp_direction: direction,
          smtp_authorization_code: JSON.stringify({
            redirect_uri: window.location.origin,
            authorization_code: tokens.authCode,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            client_id: import.meta.env.VITE_CLIENT_ID,
          }),
        };
      } else if (currentProvider === "office365") {
        emailPayload = {
          name: emailName,
          group: group,
          from_address: tokens.userEmail,
          smtp_provider: "office365",
          mode: "ROOT_SMTP",
          smtp_direction: direction,
          smtp_authorization_code: JSON.stringify({
            redirect_uri: `${window.location.origin}/microsoft-oauth-callback.html`,
            authorization_code: tokens.authCode,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            // code_verifier: tokens.codeVerifier,
            client_id: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
          }),
        };
      }

      let resultAction;
      if (variant === "edit" && resourceId) {
        resultAction = await dispatch(
          updateEmail({ id: resourceId, emailData: emailPayload })
        );
      } else {
        resultAction = await dispatch(addEmail(emailPayload));
      }

      if (
        (variant === "edit" ? updateEmail : addEmail).fulfilled.match(
          resultAction
        )
      ) {
        Notification.success(
          `Email ${variant === "edit" ? "updated" : "created"} successfully`
        );
        dispatch(getEmails({ page: 1 }));
      } else {
        const errorMsg =
          resultAction.payload?.data?.error ||
          resultAction.payload?.message ||
          resultAction.payload ||
          `Failed to ${variant === "edit" ? "update" : "connect"} ${currentProvider === "gmail" ? "Gmail" : "Microsoft 365"
          }`;
        Notification.error(errorMsg);
      }
    } catch (error) {
      const errorMsg =
        error?.response?.data?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save";
      Notification.error(errorMsg);
    }
  };

  return {
    connectedAccounts,
    setConnectedAccounts,
    oauthTokens,
    setOauthTokens,
    googleLogin,
    handleMicrosoftLogin,
    handleSaveOAuth,
  };
}

async function getMicrosoftAuthCodeManually() {
  const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
  const redirectUri = window.location.origin;

  const pkce = await generatePkcePair();

  const authUrl =
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "fragment",
      scope: "openid email profile offline_access Mail.Read Mail.Send User.Read",
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
      prompt: "consent",
    });

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = authUrl;
    document.body.appendChild(iframe);

    const listener = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.includes("code=")) {
        const params = new URLSearchParams(e.data.split("#")[1]);
        const code = params.get("code");
        window.removeEventListener("message", listener);
        document.body.removeChild(iframe);
        resolve(code);
      }
    };

    window.addEventListener("message", listener);

    setTimeout(() => {
      window.removeEventListener("message", listener);
      document.body.removeChild(iframe);
      reject("Timed out getting auth code");
    }, 10000);
  });
}

async function generatePkcePair() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const challengeBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = btoa(String.fromCharCode.apply(null, new Uint8Array(challengeBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return { verifier, challenge };
}
