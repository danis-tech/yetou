"use client";
import { useState, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastError, setToastError] = useState(false);

  const showToast = useCallback((msg: string, isError?: boolean) => {
    setToast(msg);
    setToastError(!!isError);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  }, []);

  return { toast, toastVisible, toastError, showToast };
}
