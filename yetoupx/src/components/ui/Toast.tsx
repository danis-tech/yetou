"use client";

interface ToastProps {
  message: string;
  visible: boolean;
  isError: boolean;
}

export default function Toast({ message, visible, isError }: ToastProps) {
  return (
    <div
      className={`toast ${visible ? "show" : ""}`}
      style={
        isError
          ? { borderColor: "var(--danger)", background: "#F7E7E3" }
          : {}
      }
    >
      <i
        className={isError ? "ti ti-alert-triangle" : "ti ti-circle-check"}
        style={isError ? { color: "var(--danger)" } : {}}
      ></i>
      <span style={isError ? { color: "var(--ink)" } : {}}>{message}</span>
    </div>
  );
}
