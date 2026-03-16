import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authAPI } from "../../services/api";

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ALREADY_VERIFIED: "already_verified",
  EXPIRED: "expired",
  INVALID: "invalid",
  ERROR: "error",
};

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(STATUS.LOADING);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus(STATUS.INVALID);
      setMessage(
        "No verification token found. Please use the link from your email.",
      );
      return;
    }

    authAPI
      .verifyEmail(token)
      .then(() => {
        setStatus(STATUS.SUCCESS);
      })
      .catch((err) => {
        const msg = err.response?.data?.error?.message || "";
        const code = err.response?.data?.error?.code || "";

        if (
          code === "EMAIL_ALREADY_VERIFIED" ||
          msg.toLowerCase().includes("already verified")
        ) {
          setStatus(STATUS.ALREADY_VERIFIED);
        } else if (
          code === "TOKEN_EXPIRED" ||
          msg.toLowerCase().includes("expired")
        ) {
          setStatus(STATUS.EXPIRED);
          setMessage(
            msg ||
              "This verification link has expired. Please request a new one.",
          );
        } else if (
          code === "INVALID_TOKEN" ||
          msg.toLowerCase().includes("invalid")
        ) {
          setStatus(STATUS.INVALID);
          setMessage(msg || "This verification link is invalid.");
        } else {
          setStatus(STATUS.ERROR);
          setMessage(
            msg || "Something went wrong. Please try again or contact support.",
          );
        }
      });
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Loading */}
      {status === STATUS.LOADING && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center">
            <svg
              className="w-10 h-10 animate-spin text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Verifying your email…
          </h1>
          <p className="text-sm text-neutral-600">Please wait a moment.</p>
        </div>
      )}

      {/* Success */}
      {status === STATUS.SUCCESS && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Email verified!
          </h1>
          <p className="text-sm text-neutral-600">
            Your email address has been confirmed. You can now sign in to your
            AfraPay account.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 rounded-lg transition-all duration-200 min-h-[48px]"
          >
            Sign in now
          </Link>
        </div>
      )}

      {/* Already verified */}
      {status === STATUS.ALREADY_VERIFIED && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Already verified
          </h1>
          <p className="text-sm text-neutral-600">
            Your email address is already verified. Go ahead and sign in.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 rounded-lg transition-all duration-200 min-h-[48px]"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* Expired */}
      {status === STATUS.EXPIRED && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Link expired</h1>
          <p className="text-sm text-neutral-600">{message}</p>
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 rounded-lg transition-all duration-200 min-h-[48px]"
          >
            Go to sign in to resend
          </Link>
        </div>
      )}

      {/* Invalid / Error */}
      {(status === STATUS.INVALID || status === STATUS.ERROR) && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Verification failed
          </h1>
          <p className="text-sm text-neutral-600">{message}</p>
          <div className="flex flex-col gap-3">
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 rounded-lg transition-all duration-200 min-h-[48px]"
            >
              Go to sign in
            </Link>
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-primary-700 bg-white border border-primary-200 hover:bg-primary-50 rounded-lg transition-all duration-200 min-h-[48px]"
            >
              Create a new account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyEmail;
