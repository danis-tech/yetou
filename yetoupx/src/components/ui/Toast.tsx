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
          ? { borderColor: "#C8371A", background: "#1a0e0b" }
          : {}
      }
    >
      <i
        className={isError ? "ti ti-alert-triangle" : "ti ti-circle-check"}
        style={isError ? { color: "#C8371A" } : {}}
      ></i>
      <span style={isError ? { color: "#ff6b6b" } : {}}>{message}</span>
    </div>
  );
}
