"use client";

import { createClient } from "../lib/supabase/client";
import { useState } from "react";
import { GoogleLoginButton as GoogleButton } from "react-social-login-buttons";

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error("Google login failed:", error.message);
      setLoading(false);
    }
  };
  return (
    <GoogleButton
      onClick={handleGoogleLogin}
      disabled={loading}
      text={loading ? "Redirecting..." : "Continue with Google"}
      style={{
        width: "100%",
        height: "56px",
        margin: "5px 0px 0px 2px",
        padding: "0 20px",

        borderRadius: "9999px",

        border: "2px solid #ff5262",

        background: "#ffffff",
        color: "#30283b",

        fontSize: "16px",
        fontWeight: 500,
        fontFamily: "inherit",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",

        boxShadow: "none",

        cursor: loading ? "not-allowed" : "pointer",
      }}
    />
  );
}
