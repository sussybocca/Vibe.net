import { useState } from "react";

export default function RegisterForm({ onRegister }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !username) {
      setMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/.netlify/functions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep(2);
        setMessage("✅ Verification email sent! Check your inbox.");
      } else {
        setMessage(`❌ ${data.error || "Something went wrong."}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error sending request.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code) {
      setMessage("Please enter the verification code.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/.netlify/functions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.toUpperCase() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage("✅ Registration complete!");
        onRegister(data.user);
      } else {
        setMessage(`❌ ${data.error || "Verification failed."}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error sending request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-form">
      {step === 1 && (
        <div>
          <h2>Register</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <button onClick={handleRegister} disabled={loading}>
            {loading ? "Sending..." : "Send Verification Email"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Enter Verification Code</h2>
          <input
            type="text"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />
          <button onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying..." : "Verify & Complete Registration"}
          </button>
          <button
            onClick={() => {
              setStep(1);
              setMessage("");
              setCode("");
            }}
            disabled={loading}
            style={{ marginLeft: "10px" }}
          >
            Back
          </button>
        </div>
      )}

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
